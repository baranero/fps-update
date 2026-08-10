"use client";

import { useMemo, type ReactNode } from "react";
import { useTranslations, useLocale } from "next-intl";
import { parseDevcCsv, parseHrrCsv } from "@/lib/fds/devc";
import { keyReadings, formatReading, type FdsReading } from "@/lib/fds/readings";
import { ConsolePane, ConsoleReading } from "@/components/Cloud/Console";
import type { FdsDevc } from "@/lib/fds/parser";

// Górna szyna prawej kolumny konsoli. Dopóki z modelu nie ma ani jednej
// wartości, pokazuje `fallback` (etapy zlecenia) — bo wtedy jedyne sensowne
// pytanie brzmi „czy to w ogóle ruszyło". Gdy tylko FDS zapisze pierwsze dane,
// miejsce przejmują odczyty: to one są powodem, dla którego klient tu wraca.
//
// Pane rysuje ten komponent (a nie strona), żeby parsowanie CSV siedziało pod
// `useMemo` po tej stronie granicy — strona zlecenia przerysowuje się co 5 s.
export default function ConsoleReadings({
  devcCsv,
  hrrCsv,
  setpoints,
  fallbackTitle,
  fallback,
}: {
  devcCsv: string | null;
  hrrCsv: string | null;
  setpoints: FdsDevc[] | null;
  fallbackTitle: string;
  fallback: ReactNode;
}) {
  const t = useTranslations("symDetail.console");
  const locale = useLocale();
  const numLocale = locale === "en" ? "en-GB" : "pl-PL";

  const readings = useMemo<FdsReading[]>(
    () => keyReadings(parseHrrCsv(hrrCsv), parseDevcCsv(devcCsv), setpoints, 3),
    [hrrCsv, devcCsv, setpoints]
  );

  if (!readings.length) {
    return <ConsolePane title={fallbackTitle}>{fallback}</ConsolePane>;
  }

  return (
    <ConsolePane title={t("readings")}>
      <div className="flex flex-col gap-3">
        {readings.map((r) => (
          <ConsoleReading
            key={r.id}
            label={r.id}
            kind={r.kind === "min" ? t("min") : t("max")}
            value={formatReading(r.value, numLocale)}
            unit={r.unit}
            at={r.time !== null ? `t = ${Math.round(r.time)} s` : undefined}
          />
        ))}
      </div>
    </ConsolePane>
  );
}
