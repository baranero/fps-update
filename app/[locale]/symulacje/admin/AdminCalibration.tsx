"use client";

// ─── Kalibracja predykcji (panel admina) ─────────────────────────────────────
//
// Pokazuje, czego model nauczył się z zakończonych biegów i jak bardzo rozjeżdża
// się z rzeczywistością. To jedyne miejsce, gdzie wolno pokazać symbole maszyn
// dostawcy — dane operacyjne, nie copy klienckie.

import { useEffect, useState } from "react";
import { useFormat } from "@/lib/format";
import { CHIP_SHAPE, TONE_CHIP } from "@/lib/tone";
import { Kpi, SectionLabel, Skeleton, cardCls, tableCls, tdCls, tdNumCls, thCls, theadRowCls, trCls } from "@/components/Cloud/ui";

type FamilyPerf = { throughput: number; contention: number; estimated: boolean };

type Payload = {
  calibration: {
    perf: Record<string, FamilyPerf>;
    vCoeff: number;
    spreadLo: number;
    spreadHi: number;
    samples: number;
    updatedAt: string | null;
  };
  accuracy: {
    median: number | null;
    min: number | null;
    max: number | null;
    withinBand: number;
    total: number;
  };
  runs: Array<{
    caseId: string;
    serverType: string;
    mpiProcs: number;
    totalCells: number;
    reachedSimTime: number;
    actualHours: number;
    predictedHours: number;
    ratio: number | null;
    throughput: number;
    hasGeometry: boolean;
  }>;
};

const FAMILY_LABEL: Record<string, string> = {
  cx: "Ekonomiczne (CX)",
  cpx: "Standardowe (CPX)",
  ccx: "Dedykowane (CCX)",
};

function fmtHours(h: number): string {
  return h < 1 ? `${Math.round(h * 60)} min` : `${h.toFixed(1)} h`;
}

/** Rozjazd predykcji: 1,00 = idealnie; >1 = liczyło się dłużej, niż zapowiadaliśmy. */
function ratioTone(ratio: number, lo: number, hi: number): string {
  if (ratio >= lo && ratio <= hi) return TONE_CHIP.signal;
  return ratio > hi ? TONE_CHIP.primary : TONE_CHIP.warn;
}

export default function AdminCalibration() {
  const f = useFormat();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/kalibracja")
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        setData(await res.json());
      })
      .catch(() => setError("Nie udało się wczytać kalibracji."));
  }, []);

  if (error) {
    return <div className={`${cardCls} p-6 text-fr-body text-muted`}>{error}</div>;
  }
  if (!data) return <Skeleton className="h-64" />;

  const { calibration: cal, accuracy, runs } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Biegi w kalibracji" value={String(cal.samples)} />
        <Kpi
          label="Mediana predykcji"
          value={accuracy.median ? `${accuracy.median.toFixed(2)}×` : "—"}
          sub="1,00 = model trafia idealnie"
        />
        <Kpi
          label="W widełkach"
          value={accuracy.total ? `${accuracy.withinBand}/${accuracy.total}` : "—"}
          sub={`${cal.spreadLo.toFixed(2)}× – ${cal.spreadHi.toFixed(2)}×`}
        />
        <Kpi
          label="Współczynnik prędkości"
          value={cal.vCoeff.toFixed(2)}
          sub="V = k · L^(1/3) w warunku CFL"
        />
      </div>

      <div className={`${cardCls} p-5`}>
        <SectionLabel>Wydajność maszyn (cell-timesteps/s na proces)</SectionLabel>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {Object.entries(cal.perf).map(([family, perf]) => (
            <div key={family} className="rounded-tile border border-hairline-soft bg-panel-deep p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-mono text-fr-micro uppercase text-muted">
                  {FAMILY_LABEL[family] ?? family}
                </span>
                <span className={`${CHIP_SHAPE} ${perf.estimated ? TONE_CHIP.warn : TONE_CHIP.signal}`}>
                  {perf.estimated ? "szacowane" : "zmierzone"}
                </span>
              </div>
              <p className="fr-num font-heading text-fr-h3 text-ink">
                {perf.throughput.toLocaleString("pl-PL")}
              </p>
              <p className="mt-1 font-mono text-fr-sm text-muted">
                spadek {(perf.contention * 100).toFixed(1)}% na każdy kolejny proces
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 border-t border-hairline pt-3 font-mono text-fr-sm text-faint">
          {cal.updatedAt
            ? `Przeliczono ${f.fmtDateTime(cal.updatedAt)} · odświeża się co 10 min`
            : "Wartości domyślne — za mało zakończonych biegów."}
        </p>
      </div>

      <div className={`${cardCls} p-5`}>
        <SectionLabel>Predykcja vs rzeczywistość</SectionLabel>
        <div className="mt-3 overflow-x-auto">
          <table className={`${tableCls} min-w-[760px]`}>
            <thead>
              <tr className={theadRowCls}>
                <th className={thCls}>Zlecenie</th>
                <th className={thCls}>Maszyna</th>
                <th className={`${thCls} text-right`}>Komórki</th>
                <th className={`${thCls} text-right`}>Przewidziano</th>
                <th className={`${thCls} text-right`}>Realnie</th>
                <th className={`${thCls} text-right`}>Rozjazd</th>
                <th className={`${thCls} text-right`}>ct/s/proc</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.caseId} className={trCls}>
                  <td className={`${tdCls} font-mono`}>
                    {r.caseId}
                    {!r.hasGeometry && (
                      <span className="ml-2 text-faint" title="Brak geometrii w bazie — krok czasowy z logu">
                        ◦
                      </span>
                    )}
                  </td>
                  <td className={`${tdCls} font-mono uppercase`}>
                    {r.serverType} <span className="text-faint">× {r.mpiProcs}</span>
                  </td>
                  <td className={tdNumCls}>{(r.totalCells / 1000).toFixed(0)} k</td>
                  <td className={tdNumCls}>{fmtHours(r.predictedHours)}</td>
                  <td className={tdNumCls}>{fmtHours(r.actualHours)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    {r.ratio ? (
                      <span className={`${CHIP_SHAPE} ${ratioTone(r.ratio, cal.spreadLo, cal.spreadHi)}`}>
                        {r.ratio.toFixed(2)}×
                      </span>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                  <td className={tdNumCls}>{r.throughput.toLocaleString("pl-PL")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 border-t border-hairline pt-3 font-mono text-fr-sm text-faint">
          Rozjazd &gt; 1 = liczyło się dłużej, niż zapowiedzieliśmy klientowi. Znak ◦ oznacza
          zlecenie sprzed migracji planera — bez zapisanej geometrii model porównuje samą
          prędkość liczenia.
        </p>
      </div>
    </div>
  );
}
