export interface FdsMeshDetail {
  ijk: [number, number, number];
  cells: number;
}

export interface FdsParseResult {
  chid: string | null;
  meshCount: number;
  ompThreads: number;   // OMP_NUM_THREADS z &MISC (domyślnie 1)
  totalCores: number;   // meshCount × ompThreads
  totalCells: number;
  meshDetails: FdsMeshDetail[];
  tEnd: number | null;
  fuel: string | null;
  obstCount: number;
  ventCount: number;
  devcCount: number;
  valid: boolean;
  error?: string;
}

export interface FdsEstimate {
  vcpuHours: number;
  wallHours: number;
  price: number;
  cloudCostEur: number;
  complexity: "mała" | "średnia" | "duża" | "bardzo duża";
}

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
          result.meshDetails.push({ ijk: [ijk[0], ijk[1], ijk[2]], cells });
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

// ─── Stałe kalibracyjne ──────────────────────────────────────────────────────
// Źródło: rzeczywisty job na CloudHPC (n2highcpu-32):
//   1,1M komórek × 720 s → 557,8 vCPU-h → €44,5
//
// Stała K [vCPU-h / (1M komórek × 300 s)]:
//   K = 557,8 / (1,1 × 720/300) = 557,8 / 2,64 ≈ 211,3
const VCPU_H_PER_1M_300S = 211.3;

// Liczba rdzeni standardowej instancji (do przeliczenia na czas zegarowy)
const CORES = 32;

// Stawka za vCPU-h w EUR (cel: nieco taniej niż CloudHPC ~€0,08)
const EUR_PER_VCPU_H = 0.06;

// Kurs EUR/PLN
const EUR_PLN = 4.3;
// ─────────────────────────────────────────────────────────────────────────────

export function estimateCost(parsed: FdsParseResult): FdsEstimate {
  const cells = parsed.totalCells || 0;
  const tEnd = parsed.tEnd || 300;
  const meshCount = parsed.meshCount || 1;
  const totalCores = parsed.totalCores || meshCount;

  // 1. Bazowe vCPU-h z kalibracji
  const baseVcpuH = (cells / 1_000_000) * (tEnd / 300) * VCPU_H_PER_1M_300S;

  // 2. Narzut komunikacyjny przy wielu siatkach (+5% za każdą dodatkową)
  const meshFactor = 1 + Math.max(0, meshCount - 1) * 0.05;

  const vcpuHours = Math.max(1, baseVcpuH * meshFactor);

  // 3. Czas zegarowy — na faktycznej liczbie rdzeni z pliku (meshCount × ompThreads)
  const effectiveCores = Math.max(totalCores, CORES);
  const wallHours = vcpuHours / effectiveCores;

  // 4. Koszt chmury w EUR i PLN
  const cloudCostEur = vcpuHours * EUR_PER_VCPU_H;
  const cloudCostPln = cloudCostEur * EUR_PLN;

  // 5. Minimalna cena według rozmiaru modelu
  let minimum: number;
  if (cells < 500_000) minimum = 250;
  else if (cells < 2_000_000) minimum = 400;
  else if (cells < 5_000_000) minimum = 700;
  else minimum = 1_200;

  // 6. Cena końcowa: max(koszt chmury, minimum), zaokrąglona do 10 zł
  const price = Math.round(Math.max(cloudCostPln, minimum) / 10) * 10;

  let complexity: FdsEstimate["complexity"];
  if (cells < 500_000) complexity = "mała";
  else if (cells < 2_000_000) complexity = "średnia";
  else if (cells < 5_000_000) complexity = "duża";
  else complexity = "bardzo duża";

  return { vcpuHours, wallHours, price, cloudCostEur, complexity };
}
