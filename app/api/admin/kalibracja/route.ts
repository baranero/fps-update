export const dynamic = "force-dynamic";

// Podgląd kalibracji predykcji — wyłącznie dla admina.
//
// Pokazuje, co model wyciągnął z zakończonych biegów: zmierzoną wydajność
// maszyn, współczynnik prędkości w warunku CFL i rozjazd między przewidywanym
// a rzeczywistym czasem każdego zlecenia.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/utils/adminCheck";
import { getCalibrationDetail } from "@/lib/fds/calibration";
import { effectiveVelocity, effectiveProcLoad, perProcThroughputFor } from "@/lib/fds/planner";

export async function GET() {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!isAdmin(user?.email)) {
    return NextResponse.json({ error: "Brak uprawnień." }, { status: 403 });
  }

  try {
    const { calibration, measurements } = await getCalibrationDetail();

    // Rozjazd predykcji: ile model przewidziałby dla biegu, który już znamy.
    const runs = measurements.map((m) => {
      const perProc = perProcThroughputFor(calibration, m.family, m.mpiProcs);
      const dtModel =
        m.minCellDim && m.domainVolume
          ? (0.8 * m.minCellDim) / effectiveVelocity(m.domainVolume, calibration.vCoeff)
          : null;
      // Bez geometrii nie odtworzymy kroku czasowego — porównujemy wtedy samą
      // prędkość liczenia, przy realnym dt z logu.
      const dt = dtModel ?? m.dtMean;
      const load = effectiveProcLoad(m.totalCells, m.meshCount ?? m.mpiProcs, m.mpiProcs);
      const predictedHours = ((m.reachedSimTime / dt) * load) / perProc / 3600;

      return {
        caseId: m.caseId,
        serverType: m.serverType,
        family: m.family,
        mpiProcs: m.mpiProcs,
        totalCells: m.totalCells,
        reachedSimTime: m.reachedSimTime,
        actualHours: m.fdsHours,
        predictedHours,
        ratio: predictedHours > 0 ? m.fdsHours / predictedHours : null,
        throughput: Math.round(m.throughput),
        dtMean: m.dtMean,
        dtModel,
        hasGeometry: dtModel !== null,
      };
    });

    const ratios = runs.map((r) => r.ratio).filter((r): r is number => r !== null).sort((a, b) => a - b);
    const median = ratios.length
      ? ratios.length % 2
        ? ratios[(ratios.length - 1) / 2]
        : (ratios[ratios.length / 2 - 1] + ratios[ratios.length / 2]) / 2
      : null;

    return NextResponse.json({
      calibration: {
        perf: calibration.perf,
        vCoeff: calibration.vCoeff,
        spreadLo: calibration.spreadLo,
        spreadHi: calibration.spreadHi,
        samples: calibration.samples,
        updatedAt: calibration.updatedAt,
      },
      accuracy: {
        median,
        min: ratios[0] ?? null,
        max: ratios[ratios.length - 1] ?? null,
        withinBand: ratios.filter((r) => r >= calibration.spreadLo && r <= calibration.spreadHi).length,
        total: ratios.length,
      },
      runs: runs.sort((a, b) => b.actualHours - a.actualHours),
    });
  } catch (err) {
    console.error("kalibracja: błąd:", err);
    return NextResponse.json({ error: "Nie udało się policzyć kalibracji." }, { status: 500 });
  }
}
