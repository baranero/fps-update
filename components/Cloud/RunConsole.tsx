import { useTranslations } from "next-intl";
import {
  Console, ConsoleHead, ConsoleLog, ConsoleMetric, ConsoleNote, ConsolePane, ConsoleProgress, ConsoleReading,
} from "@/components/Cloud/Console";

// Konsola zlecenia na stronie głównej — POGLĄDOWA (stała DEMO poniżej).
// Rama i wszystkie elementy pochodzą ze wspólnego `Console`, tego samego,
// którego używa realny pulpit /symulacje/[caseId]. To celowe: landing pokazuje
// dokładnie ten układ, który użytkownik dostaje po zalogowaniu, a nie ładniejszą
// atrapę. Zmiana wyglądu w jednym miejscu przenosi się na oba.
//
// Demo pokazuje zlecenie W TRAKCIE (45%), więc wykres urywa się na bieżącej
// chwili — dorysowana do końca krzywa obiecywałaby komplet wyników, którego w
// trakcie liczenia jeszcze nie ma.
const DEMO = {
  hash: "0xAF92_KLATKA_A",
  pct: 45,
  readings: [
    { key: "hrr",  unit: "kW", at: "t = 300 s", min: false },
    { key: "temp", unit: "°C", at: "t = 350 s", min: false },
    { key: "vis",  unit: "m",  at: "t = 380 s", min: true  },
  ] as const,
  log: [
    { key: "log1", time: "08:42:11.02", tone: "signal" as const },
    { key: "log2", time: "08:41:05.99", tone: "muted" as const },
    { key: "log3", time: "08:35:22.14", tone: "muted" as const },
  ],
};

export default function RunConsole() {
  const t = useTranslations("cloudLanding.console");

  return (
    <Console
      className="h-[460px] md:h-[560px] lg:h-[620px]"
      title={t("chartTitle")}
      meta={t("chartMeta")}
      left={
        <>
          <ConsoleHead label={t("caseId")} value={DEMO.hash} live />
          <div className="flex flex-1 flex-col gap-6 overflow-hidden p-6">
            <ConsoleProgress label={t("progress")} pct={DEMO.pct} sub={t("progressSub")} />
            <ConsoleMetric label={t("remaining")} value={t("remainingVal")} unit={t("remainingUnit")} sub={t("etaSub")} />
            <ConsoleMetric label={t("cost")} value={t("costVal")} tone="text-primary" sub={t("costSub")} />
          </div>
          <ConsoleNote>{t("modelNote")}</ConsoleNote>
        </>
      }
      right={
        <>
          <ConsolePane title={t("readings")}>
            <div className="flex flex-col gap-3">
              {DEMO.readings.map((r) => (
                <ConsoleReading
                  key={r.key}
                  label={t(`r_${r.key}` as "r_hrr")}
                  kind={r.min ? t("min") : t("max")}
                  value={t(`r_${r.key}_v` as "r_hrr_v")}
                  unit={r.unit}
                  at={r.at}
                />
              ))}
            </div>
          </ConsolePane>
          <ConsolePane title={t("logTitle")} badge={t("live")} deep>
            <ConsoleLog
              entries={DEMO.log.map((e) => ({ time: e.time, msg: t(e.key as "log1"), tone: e.tone }))}
            />
          </ConsolePane>
        </>
      }
    >
      <div className="relative flex flex-1 flex-col justify-end px-5 pb-12 pt-6 md:px-10 md:pb-16">
        {/* Linie odniesienia + oś Y w kW */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between px-5 py-12 md:px-10 md:py-16">
          {["3000", "2000", "1000", "0"].map((v) => (
            <div key={v} className="relative w-full border-t border-hairline-soft">
              <span className="absolute -top-2 left-0 font-mono text-fr-sm text-muted">{v}</span>
            </div>
          ))}
        </div>

        <div className="absolute inset-0 px-5 py-12 md:px-10 md:py-16">
          <svg className="h-full w-full" viewBox="0 0 1000 400" preserveAspectRatio="none">
            <defs>
              <linearGradient id="hrr-fade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Przebieg urywa się na 45% osi czasu — tam, dokąd doszedł solver */}
            <path
              d="M0,396 C120,392 200,330 260,200 C295,124 315,69 333,69 C365,69 395,116 420,150 C434,168 442,174 450,178 L450,400 L0,400 Z"
              fill="url(#hrr-fade)"
              className="text-signal"
            />
            <path
              d="M0,396 C120,392 200,330 260,200 C295,124 315,69 333,69 C365,69 395,116 420,150 C434,168 442,174 450,178"
              fill="none"
              strokeWidth="1.5"
              className="stroke-signal"
            />
            <path
              d="M0,340 L110,315 L200,268 L280,215 L340,168 L389,140 L420,158 L450,150"
              fill="none"
              strokeWidth="1"
              strokeDasharray="2 4"
              className="stroke-primary"
              opacity="0.65"
            />

            {/* Krawędź „teraz” — dalej danych jeszcze nie ma */}
            <line x1="450" y1="0" x2="450" y2="400" strokeWidth="1" strokeDasharray="4 6" className="stroke-muted" opacity="0.5" />

            <circle cx="333" cy="69" r="3" strokeWidth="1.5" className="fill-well stroke-signal" />
            <circle cx="389" cy="140" r="2" className="fill-primary" />
            <circle cx="450" cy="178" r="3.5" className="fill-signal" />
          </svg>

          {/* Opisy punktów w DOM — SVG wyżej ma preserveAspectRatio="none",
              które ścisnęłoby litery w poziomie. */}
          <div className="pointer-events-none absolute inset-0 px-5 py-12 md:px-10 md:py-16">
            <span className="absolute left-[34%] top-[11%] whitespace-nowrap font-mono text-fr-sm font-medium text-signal">
              {t("hrrMax")}
            </span>
            <span className="absolute left-[40%] top-[38%] whitespace-nowrap font-mono text-fr-sm font-medium text-primary">
              {t("tCeiling")}
            </span>
            <span className="absolute left-[45.5%] top-[52%] whitespace-nowrap font-mono text-fr-label uppercase text-muted">
              {t("chartNow")}
            </span>
          </div>
        </div>

        <div className="absolute bottom-5 left-5 right-5 z-20 flex justify-between font-mono text-fr-label uppercase tracking-[0.2em] text-muted md:left-10 md:right-10">
          <span>0 s</span>
          <span>225 s</span>
          <span>450 s</span>
          <span>675 s</span>
          <span>900 s</span>
        </div>
      </div>
    </Console>
  );
}
