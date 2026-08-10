import { planRuns, type PlanInput, type RunPlan } from "./planner";
import { serverLabel } from "@/lib/hetzner/catalog";
import { EUR_PLN, STORAGE_EUR_PER_GB, computeFinalPrice } from "./pricing";

export interface FdsMeshDetail {
  ijk: [number, number, number];
  cells: number;
  minCellDim: number | null; // najmniejszy wymiar komórki [m], null gdy brak XB
}

// Pojedyncze urządzenie DEVC — używane do połączenia przebiegu z CSV z setpointem
// (nazwa kolumny w CHID_devc.csv = ID urządzenia).
export interface FdsDevc {
  id: string;
  quantity: string | null;
  setpoint: number | null;
}

export interface FdsParseResult {
  chid: string | null;
  meshCount: number;
  ompThreads: number;
  totalCores: number;
  totalCells: number;
  meshDetails: FdsMeshDetail[];
  tEnd: number | null;
  fuel: string | null;
  obstCount: number;
  ventCount: number;
  devcCount: number;
  devcs: FdsDevc[];
  minCellDim: number | null; // min z wszystkich siatek [m], null gdy brak XB
  /** Suma objętości siatek [m³] — skala modelu, wchodzi do szacowania kroku czasowego. */
  domainVolume: number | null;
  /** Liczba procesów narzucona przez MPI_PROCESS w pliku; null = FDS rozdziela siatki sam. */
  forcedProcs: number | null;
  valid: boolean;
  /** Kod błędu parsowania — tekst dobiera UI z tłumaczeń (`symulacje.parseErrors.<kod>`),
   *  bo parser działa też po stronie serwera, gdzie nie ma kontekstu języka. */
  error?: string;
}

export interface FdsEstimate {
  vcpuHours: number;
  wallHours: number;
  price: number;
  cloudCostEur: number;
  storageCostEur: number;
  estimatedOutputGb: number;
  serverType: string;
  serverCores: number;
  dtEstimate: number;       // szacowany krok czasowy Δt [s]
  cellDimSource: "file" | "assumed"; // czy minCellDim pochodzi z XB czy założony
  complexity: "mała" | "średnia" | "duża" | "bardzo duża";
}

// ─────────────────────────────────────────────────────────────────────────────

function parseNamelists(content: string): Array<{ name: string; body: string }> {
  const cleaned = content
    .split("\n")
    .map((line) => {
      const idx = line.indexOf("!");
      return idx >= 0 ? line.slice(0, idx) : line;
    })
    .join("\n");

  const results: Array<{ name: string; body: string }> = [];
  const regex = /&([A-Za-z_]+)([\s\S]*?)\//g;
  let match;
  while ((match = regex.exec(cleaned)) !== null) {
    results.push({ name: match[1].toUpperCase(), body: match[2] });
  }
  return results;
}

function getParam(body: string, key: string): string | null {
  const regex = new RegExp(`\\b${key}\\s*=\\s*([^,/\\s]+)`, "i");
  const m = body.match(regex);
  return m ? m[1].trim() : null;
}

function getParamArray(body: string, key: string): number[] | null {
  const regex = new RegExp(`\\b${key}\\s*=\\s*([\\d.,\\s+-]+)`, "i");
  const m = body.match(regex);
  if (!m) return null;
  const nums = m[1]
    .split(",")
    .map((s) => parseFloat(s.trim()))
    .filter((n) => !isNaN(n));
  return nums.length > 0 ? nums : null;
}

// XB może mieć wartości ujemne i notację naukową — dedykowany parser
function getMeshXB(body: string): [number, number, number, number, number, number] | null {
  const m = body.match(/\bXB\s*=\s*([-\d.eE+\s,]+)/i);
  if (!m) return null;
  const nums = m[1].split(",").map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n));
  if (nums.length < 6) return null;
  return [nums[0], nums[1], nums[2], nums[3], nums[4], nums[5]];
}

function getStringParam(body: string, key: string): string | null {
  const regex = new RegExp(`\\b${key}\\s*=\\s*['"]([^'"]+)['"]`, "i");
  const m = body.match(regex);
  return m ? m[1] : null;
}

export function parseFds(content: string): FdsParseResult {
  const result: FdsParseResult = {
    chid: null,
    meshCount: 0,
    ompThreads: 1,
    totalCores: 0,
    totalCells: 0,
    meshDetails: [],
    tEnd: null,
    fuel: null,
    obstCount: 0,
    ventCount: 0,
    devcCount: 0,
    devcs: [],
    minCellDim: null,
    domainVolume: null,
    forcedProcs: null,
    valid: false,
  };

  let namelists: Array<{ name: string; body: string }>;
  try {
    namelists = parseNamelists(content);
  } catch {
    result.error = "unreadable";
    return result;
  }

  if (namelists.length === 0) {
    result.error = "noNamelists";
    return result;
  }

  let hasMesh = false;
  let hasTime = false;

  for (const nl of namelists) {
    switch (nl.name) {
      case "HEAD":
        result.chid = getStringParam(nl.body, "CHID");
        break;
      case "MESH": {
        hasMesh = true;
        result.meshCount++;

        // Sztywne przypisanie siatki do procesu MPI. Gdy występuje, liczba
        // procesów nie jest już naszym wyborem — musi pokryć najwyższy indeks.
        const mp = getParam(nl.body, "MPI_PROCESS");
        if (mp !== null) {
          const idx = parseInt(mp, 10);
          if (!isNaN(idx) && idx >= 0) {
            result.forcedProcs = Math.max(result.forcedProcs ?? 0, idx + 1);
          }
        }

        const ijk = getParamArray(nl.body, "IJK");
        if (ijk && ijk.length >= 3) {
          const cells = ijk[0] * ijk[1] * ijk[2];
          result.totalCells += cells;

          let minDim: number | null = null;
          const xb = getMeshXB(nl.body);
          if (xb) {
            const dx = Math.abs(xb[1] - xb[0]) / ijk[0];
            const dy = Math.abs(xb[3] - xb[2]) / ijk[1];
            const dz = Math.abs(xb[5] - xb[4]) / ijk[2];
            minDim = Math.min(dx, dy, dz);
            if (result.minCellDim === null || minDim < result.minCellDim) {
              result.minCellDim = minDim;
            }
            const vol = Math.abs(xb[1] - xb[0]) * Math.abs(xb[3] - xb[2]) * Math.abs(xb[5] - xb[4]);
            if (vol > 0) result.domainVolume = (result.domainVolume ?? 0) + vol;
          }

          result.meshDetails.push({ ijk: [ijk[0], ijk[1], ijk[2]], cells, minCellDim: minDim });
        }
        break;
      }
      case "TIME": {
        hasTime = true;
        const t = getParam(nl.body, "T_END");
        if (t) result.tEnd = parseFloat(t);
        break;
      }
      case "MISC": {
        const omp = getParam(nl.body, "OMP_NUM_THREADS");
        if (omp) {
          const n = parseInt(omp, 10);
          if (!isNaN(n) && n >= 1) result.ompThreads = n;
        }
        break;
      }
      case "REAC":
        result.fuel = getStringParam(nl.body, "FUEL") ?? getParam(nl.body, "FUEL");
        break;
      case "OBST":
        result.obstCount++;
        break;
      case "VENT":
        result.ventCount++;
        break;
      case "DEVC": {
        result.devcCount++;
        const id = getStringParam(nl.body, "ID");
        if (id) {
          const sp = getParam(nl.body, "SETPOINT");
          const setpoint = sp !== null ? parseFloat(sp) : null;
          result.devcs.push({
            id,
            quantity: getStringParam(nl.body, "QUANTITY"),
            setpoint: setpoint !== null && !isNaN(setpoint) ? setpoint : null,
          });
        }
        break;
      }
    }
  }

  if (!hasMesh) {
    result.error = "noMesh";
    return result;
  }
  if (!hasTime) {
    result.error = "noTime";
    return result;
  }

  result.totalCores = result.meshCount * result.ompThreads;
  result.valid = true;
  return result;
}

// ─── Wycena ──────────────────────────────────────────────────────────────────
//
// Sam dobór maszyny i model czasu mieszkają w lib/fds/planner.ts — tu został
// tylko cienki adapter zachowujący dotychczasowe API (`estimateCost`), z którego
// korzysta kreator do natychmiastowego podglądu po wczytaniu pliku. Pełną listę
// wariantów, z żywą dostępnością maszyn i kalibracją z historii, zwraca
// /api/symulacje/plan.

export { EUR_PLN, STORAGE_EUR_PER_GB, computeFinalPrice };

/** Opis maszyny do UI — bez symbolu dostawcy, zgodnie z zasadami copy FDSRun. */
export const serverSpec = serverLabel;

/** Dane wejściowe planera z wyniku analizy pliku. */
export function toPlanInput(parsed: FdsParseResult): PlanInput {
  return {
    meshCount: parsed.meshCount,
    meshCells: parsed.meshDetails.map((m) => m.cells),
    totalCells: parsed.totalCells,
    tEnd: parsed.tEnd,
    minCellDim: parsed.minCellDim,
    domainVolume: parsed.domainVolume,
    ompThreads: parsed.ompThreads,
    forcedProcs: parsed.forcedProcs,
  };
}

function complexityOf(cells: number): FdsEstimate["complexity"] {
  if (cells < 500_000) return "mała";
  if (cells < 2_000_000) return "średnia";
  if (cells < 5_000_000) return "duża";
  return "bardzo duża";
}

/** Przekłada wariant z planera na kształt oczekiwany przez istniejące UI. */
export function planToEstimate(
  plan: RunPlan,
  ctx: { dtEstimate: number; cellDimSource: "file" | "assumed"; totalCells: number }
): FdsEstimate {
  return {
    vcpuHours: plan.billedHours * plan.cores,
    wallHours: plan.wallHours,
    price: plan.price,
    cloudCostEur: plan.cloudCostEur,
    storageCostEur: plan.storageCostEur,
    estimatedOutputGb: plan.estimatedOutputGb,
    serverType: plan.serverType,
    serverCores: plan.cores,
    dtEstimate: ctx.dtEstimate,
    cellDimSource: ctx.cellDimSource,
    complexity: complexityOf(ctx.totalCells),
  };
}

/**
 * Szybka wycena wariantu rekomendowanego — bez odpytywania dostawcy o
 * dostępność, więc nadaje się do liczenia w przeglądarce zaraz po wczytaniu
 * pliku. Ostateczne liczby przy składaniu zlecenia i tak wychodzą z planera
 * po stronie serwera.
 */
export function estimateCost(parsed: FdsParseResult): FdsEstimate {
  const result = planRuns(toPlanInput(parsed));
  const plan = result.balanced ?? result.eco ?? result.fast;

  if (!plan) {
    // Model nie mieści się na żadnej maszynie — zwracamy zerową wycenę, a UI
    // pokazuje komunikat z `result.blocked`. Nie zgadujemy ceny.
    return {
      vcpuHours: 0, wallHours: 0, price: 0, cloudCostEur: 0, storageCostEur: 0,
      estimatedOutputGb: 0, serverType: "", serverCores: 0,
      dtEstimate: result.dtEstimate, cellDimSource: result.cellDimSource,
      complexity: complexityOf(parsed.totalCells),
    };
  }

  return planToEstimate(plan, {
    dtEstimate: result.dtEstimate,
    cellDimSource: result.cellDimSource,
    totalCells: parsed.totalCells,
  });
}
