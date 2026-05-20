export interface FdsMeshDetail {
  ijk: [number, number, number];
  cells: number;
}

export interface FdsParseResult {
  chid: string | null;
  meshCount: number;
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
  cpuHours: number;
  wallHours: number;
  price: number;
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

  result.valid = true;
  return result;
}

export function estimateCost(parsed: FdsParseResult): FdsEstimate {
  const cells = parsed.totalCells || 0;
  const tEnd = parsed.tEnd || 300;

  // Empirical rule: 1M cells × 300s ≈ 24 CPU-hours
  const cpuHours = Math.max(0.5, (cells / 1_000_000) * (tEnd / 300) * 24);

  // 16-core node: wall time = cpu / 16
  const wallHours = cpuHours / 16;

  // 15 PLN/CPU-h + 150 PLN setup, rounded to nearest 10 PLN
  const price = Math.round((cpuHours * 15 + 150) / 10) * 10;

  let complexity: FdsEstimate["complexity"];
  if (cells < 500_000) complexity = "mała";
  else if (cells < 2_000_000) complexity = "średnia";
  else if (cells < 5_000_000) complexity = "duża";
  else complexity = "bardzo duża";

  return { cpuHours, wallHours, price, complexity };
}
