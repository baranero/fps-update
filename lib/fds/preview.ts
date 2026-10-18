// ─── Manifest ujęć Smokeview ─────────────────────────────────────────────────
//
// Plik `_preview/manifest.json` pisze maszyna licząca (lib/hetzner/smvPreview.ts).
// Tu jest jego kształt i walidacja — po stronie serwera manifest jest danymi
// z zewnątrz (z maszyny), więc nic nie przechodzi dalej bez sprawdzenia typów.

export interface PreviewView {
  id: string;
  kind: "slice" | "smoke3d";
  /** Nazwa wielkości z .smv, np. „SOOT VISIBILITY”. */
  label: string;
  short?: string;
  unit?: string;
  /** Płaszczyzna przekroju i jej położenie [m] — tylko dla `slice`. */
  plane?: "x" | "y" | "z";
  pos?: number;
}

export interface PreviewFrame {
  /** Czas symulacji [s]. */
  t: number;
  /** Kiedy ujęcie powstało (ISO) — tylko podgląd na żywo. */
  at?: string;
  /** id ujęcia → ścieżka względna (w odpowiedzi API: podpisany URL). */
  files: Record<string, string>;
}

export interface PreviewManifest {
  views: PreviewView[];
  live: PreviewFrame[];
  report: { step: number | null; at?: string; frames: PreviewFrame[] } | null;
  updatedAt?: string;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function parseFiles(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!isObj(v)) return out;
  for (const [k, p] of Object.entries(v)) if (typeof p === "string") out[k] = p;
  return out;
}

function parseFrames(v: unknown): PreviewFrame[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter(isObj)
    .filter((f) => num(f.t))
    .map((f) => ({
      t: f.t as number,
      at: typeof f.at === "string" ? f.at : undefined,
      files: parseFiles(f.files),
    }))
    .filter((f) => Object.keys(f.files).length > 0);
}

/** Bezpieczne odczytanie manifestu; null, gdy go nie ma albo jest bezużyteczny. */
export function parsePreviewManifest(raw: string | null | undefined): PreviewManifest | null {
  if (!raw) return null;
  let m: unknown;
  try {
    m = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(m)) return null;

  const views: PreviewView[] = Array.isArray(m.views)
    ? m.views.filter(isObj).flatMap((v) => {
        if (typeof v.id !== "string" || typeof v.label !== "string") return [];
        const kind = v.kind === "smoke3d" ? "smoke3d" : "slice";
        const plane = v.plane === "x" || v.plane === "y" || v.plane === "z" ? v.plane : undefined;
        return [{
          id: v.id,
          kind,
          label: v.label,
          short: typeof v.short === "string" ? v.short : undefined,
          unit: typeof v.unit === "string" ? v.unit : undefined,
          plane,
          pos: num(v.pos) ? v.pos : undefined,
        } satisfies PreviewView];
      })
    : [];

  const live = parseFrames(m.live).sort((a, b) => a.t - b.t);
  const report = isObj(m.report)
    ? {
        step: num(m.report.step) ? m.report.step : null,
        at: typeof m.report.at === "string" ? m.report.at : undefined,
        frames: parseFrames(m.report.frames).sort((a, b) => a.t - b.t),
      }
    : null;

  if (!views.length || (!live.length && !report?.frames.length)) return null;
  return {
    views,
    live,
    report: report && report.frames.length ? report : null,
    updatedAt: typeof m.updatedAt === "string" ? m.updatedAt : undefined,
  };
}

/** Czytelny podpis ujęcia: „SOOT VISIBILITY · y = 1,25 m” albo „Dym 3D”. */
export function viewCaption(v: PreviewView, smoke3dLabel: string, locale = "pl-PL"): string {
  if (v.kind === "smoke3d") return smoke3dLabel;
  const pos = v.pos != null ? v.pos.toLocaleString(locale, { maximumFractionDigits: 2 }) : "?";
  return v.plane ? `${v.label} · ${v.plane} = ${pos} m` : v.label;
}
