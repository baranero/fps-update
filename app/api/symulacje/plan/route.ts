export const dynamic = "force-dynamic";

// Warianty sprzętowe dla wczytanego modelu.
//
// Kreator analizuje plik w przeglądarce i przysyła tu wyłącznie liczby opisujące
// model (siatki, komórki, czas). Nic z tego nie jest przyjmowane na wiarę przy
// składaniu zlecenia — /api/symulacje/submit parsuje plik jeszcze raz u siebie
// i przelicza plan od zera. Ten endpoint służy wyłącznie do pokazania wyboru.

import { NextRequest, NextResponse } from "next/server";
import { planRuns, type PlanInput } from "@/lib/fds/planner";
import { getCalibration } from "@/lib/fds/calibration";
import { fetchLiveCatalog } from "@/lib/hetzner/client";

/** Górna granica na wejściu — chroni planer przed absurdalnymi liczbami. */
const MAX_MESHES = 20_000;
const MAX_CELLS = 2_000_000_000;

function sanitize(body: unknown): PlanInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  const num = (v: unknown): number | null => {
    const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
    return Number.isFinite(n) ? n : null;
  };

  const meshCount = num(b.meshCount);
  const totalCells = num(b.totalCells);
  if (!meshCount || meshCount < 1 || meshCount > MAX_MESHES) return null;
  if (!totalCells || totalCells < 1 || totalCells > MAX_CELLS) return null;

  const rawCells = Array.isArray(b.meshCells) ? b.meshCells : [];
  const meshCells = rawCells
    .map((c) => num(c))
    .filter((c): c is number => c !== null && c > 0)
    .slice(0, MAX_MESHES);

  const omp = num(b.ompThreads);
  const forced = num(b.forcedProcs);

  return {
    meshCount: Math.round(meshCount),
    meshCells,
    totalCells: Math.round(totalCells),
    tEnd: num(b.tEnd),
    minCellDim: num(b.minCellDim),
    domainVolume: num(b.domainVolume),
    ompThreads: omp && omp >= 1 ? Math.round(omp) : 1,
    forcedProcs: forced && forced >= 1 ? Math.round(forced) : null,
  };
}

export async function POST(req: NextRequest) {
  try {
    const input = sanitize(await req.json().catch(() => null));
    if (!input) {
      return NextResponse.json({ error: "Nieprawidłowe dane modelu." }, { status: 400 });
    }

    // Dostępność maszyn i kalibracja są niezależne — gdy któraś zawiedzie,
    // planer i tak policzy warianty na wartościach zapasowych.
    const [catalogResult, calibration] = await Promise.all([
      fetchLiveCatalog().catch((err) => {
        console.error("plan: odczyt oferty dostawcy nieudany:", err);
        return null;
      }),
      getCalibration(),
    ]);

    const result = planRuns(input, {
      availableTypes: catalogResult ? Object.keys(catalogResult.locationByType) : null,
      prices: catalogResult?.priceByType ?? null,
      calibration,
    });

    return NextResponse.json({
      plans: result.plans,
      tiers: {
        eco: result.eco?.serverType ?? null,
        balanced: result.balanced?.serverType ?? null,
        fast: result.fast?.serverType ?? null,
      },
      dtEstimate: result.dtEstimate,
      steps: result.steps,
      vEff: result.vEff,
      cellDimSource: result.cellDimSource,
      blocked: result.blocked,
      calibration: {
        samples: calibration.samples,
        updatedAt: calibration.updatedAt,
        live: catalogResult !== null,
      },
    });
  } catch (err) {
    console.error("plan: błąd:", err);
    return NextResponse.json({ error: "Nie udało się dobrać maszyny." }, { status: 500 });
  }
}
