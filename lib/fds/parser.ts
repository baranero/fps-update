export interface FdsMeshDetail {
  ijk: [number, number, number];
  cells: number;
  minCellDim: number | null; // najmniejszy wymiar komórki [m], null gdy brak XB
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
  minCellDim: number | null; // min z wszystkich siatek [m], null gdy brak XB
  valid: boolean;
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
    minCellDim: null,
    valid: false,
  };

  let namelists: Array<{ name: string; body: string }>;
  try {
    namelists = parseNamelists(content);
  } catch {
    result.error = "Nie można odczytać struktury pliku FDS.";
    return result;
  }

  if (namelists.length === 0) {
    result.error = "Plik nie zawiera sekcji FDS (namelists). Sprawdź czy plik jest poprawny.";
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
      case "DEVC":
        result.devcCount++;
        break;
    }
  }

  if (!hasMesh) {
    result.error = "Nie znaleziono sekcji &MESH. Sprawdź czy plik FDS jest kompletny.";
    return result;
  }
  if (!hasTime) {
    result.error = "Nie znaleziono sekcji &TIME (T_END). Czas symulacji jest wymagany do wyceny.";
    return result;
  }

  result.totalCores = result.meshCount * result.ompThreads;
  result.valid = true;
  return result;
}

// ─── Hetzner CPX shared AMD EPYC — tymczasowo do testów (EUR/h, Norymberga) ──
// TODO: przywrócić CCX po zatwierdzeniu limitu dedicated_core przez Hetzner
const HETZNER_CCX: Record<string, { cores: number; eurPerHour: number }> = {
  cpx11: { cores: 2,  eurPerHour: 0.006 },
  cpx21: { cores: 3,  eurPerHour: 0.011 },
  cpx31: { cores: 4,  eurPerHour: 0.019 },
  cpx41: { cores: 8,  eurPerHour: 0.035 },
  cpx51: { cores: 16, eurPerHour: 0.067 },
};

function pickServerType(meshCount: number): string {
  if (meshCount <= 2)  return "cpx11";
  if (meshCount <= 3)  return "cpx21";
  if (meshCount <= 4)  return "cpx31";
  if (meshCount <= 8)  return "cpx41";
  return "cpx51";
}

// ─── Algorytm kalibrowany z trzech punktów pomiarowych ───────────────────────
//
// Fundament: wydajność FDS na Hetzner CCX (AMD EPYC) wynosi ~240 000
// cell-timesteps na sekundę na rdzeń MPI.
//
// Kalibracja z danych rzeczywistych:
//   test.fds  (Hetzner):    16k  komórek, 60s, dt=0.019s, 1 rdzeń → 3.5 min → 246k ct/s
//   model 15.3M (local):   15.3M komórek, 1200s, dt=0.016s, 15 proc → 91h → 234k ct/s
//   CloudHPC 1.33M (Google): 1.33M, 720s, 32 proc → 17.43h → ~240k ct/s przy dt=0.002s
//
// Krok czasowy Δt wyznaczany z warunku CFL:
//   dt = CFL × min_dx / V_fire   (CFL=0.8, V_fire=5 m/s dla typowego pożaru)
//
// Gdy XB niedostępne w pliku: zakładamy min_dx = 10 cm (typowe w inżynierii pożarowej).

const THROUGHPUT    = 240_000; // cell-timesteps/s per rdzeń MPI (Hetzner CCX)
const FIRE_VEL      = 5.0;     // m/s — zakładana prędkość charakterystyczna przepływu
const CFL_FACTOR    = 0.8;     // współczynnik CFL (domyślny w FDS)
const DEFAULT_DX    = 0.10;    // m — zakładany rozmiar komórki gdy brak XB
const MARKUP        = 10;      // ~10x marża na koszcie serwera
const EUR_PLN       = 4.3;
const OVERHEAD_H    = 10 / 60; // ~10 min: boot + upload wyników + auto-delete

// Hetzner Object Storage (eu-central) + egress na pobranie wyników
const STORAGE_EUR_PER_GB = 0.031; // €0.0119 storage/m-c + €0.019 egress ≈ €0.031/GB

function estimateOutputGb(cells: number, tEnd: number): number {
  // Szacunek: ~0.3 GB na milion komórek na minutę symulacji (slice + csv + smv)
  return Math.max(0.05, (cells / 1_000_000) * 0.3 * (tEnd / 60));
}

export function estimateCost(parsed: FdsParseResult): FdsEstimate {
  const cells     = parsed.totalCells || 1;
  const tEnd      = parsed.tEnd || 300;
  const meshCount = parsed.meshCount || 1;

  // 1. Serwer
  const serverType = pickServerType(meshCount);
  const server     = HETZNER_CCX[serverType];

  // 2. Krok czasowy Δt z warunku CFL
  //    Gdy XB dostępne: używamy rzeczywistego min_dx
  //    Gdy nie: zakładamy DEFAULT_DX = 10 cm
  const cellDimSource: "file" | "assumed" = parsed.minCellDim ? "file" : "assumed";
  const minDx   = parsed.minCellDim ?? DEFAULT_DX;
  const dtEst   = Math.max(0.001, Math.min(CFL_FACTOR * minDx / FIRE_VEL, 0.5));
  const steps   = tEnd / dtEst;

  // 3. Czas zegarowy
  //    wallH = kroki × komórek_na_rdzeń × narzut_MPI / THROUGHPUT / 3600
  const cellsPerProc = cells / meshCount;
  const mpiOverhead  = 1 + 0.024 * Math.max(0, meshCount - 1);
  const wallHours    = Math.max(1 / 60, (steps * cellsPerProc * mpiOverhead) / THROUGHPUT / 3600);
  const billedHours  = wallHours + OVERHEAD_H;

  // 4. Koszty
  const cloudCostEur     = billedHours * server.eurPerHour;
  const vcpuHours        = billedHours * server.cores;
  const estimatedOutputGb = estimateOutputGb(cells, tEnd);
  const storageCostEur   = estimatedOutputGb * STORAGE_EUR_PER_GB;
  const price            = Math.max(1, Math.round((cloudCostEur + storageCostEur) * MARKUP * EUR_PLN));

  let complexity: FdsEstimate["complexity"];
  if (cells < 500_000)        complexity = "mała";
  else if (cells < 2_000_000) complexity = "średnia";
  else if (cells < 5_000_000) complexity = "duża";
  else                        complexity = "bardzo duża";

  return {
    vcpuHours, wallHours, price, cloudCostEur,
    storageCostEur, estimatedOutputGb,
    serverType, serverCores: server.cores,
    dtEstimate: dtEst, cellDimSource,
    complexity,
  };
}
