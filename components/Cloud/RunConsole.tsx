import { useTranslations } from "next-intl";
import { Console, ConsoleHead, ConsoleLog, ConsoleMetric, ConsolePane, ConsoleRow } from "@/components/Cloud/Console";

// Konsola zlecenia na stronie głównej — POGLĄDOWA (stała DEMO poniżej).
// Rama i wszystkie elementy pochodzą ze wspólnego `Console`, tego samego,
// którego używa realny pulpit /symulacje/[caseId]. To celowe: landing pokazuje
// dokładnie ten układ, który użytkownik dostaje po zalogowaniu, a nie ładniejszą
// atrapę. Zmiana wyglądu w jednym miejscu przenosi się na oba.
const DEMO = {
  hash: "0xAF92_KLATKA_A",
  cells: "3,24 M",
  step: "0,84",
  wall: "1,24",
  sparkCells: "M0,15 L10,12 L20,18 L30,5 L40,10 L50,8 L60,14 L70,2 L80,12 L90,8 L100,10",
  sparkStep: "M0,10 L10,8 L20,12 L30,4 L40,15 L50,5 L60,10 L70,8 L80,12 L90,6 L100,8",
  meshes: [
    { id: "MESH_01…08", state: "ok" as const, value: "OK // 100%" },
    { id: "MESH_09…12", state: "warn" as const, value: "CFL // 94%" },
    { id: "MESH_13…15", state: "idle" as const, value: "KOLEJKA" },
  ],
  log: [
    { time: "08:42:11.02", msg: "DEVC // TC_KLATKA_3M", tone: "ink" as const },
    { time: "08:41:05.99", msg: "SLICE // Z=1,80 m", tone: "signal" as const },
    { time: "08:35:22.14", msg: "START // MESH_01", tone: "muted" as const },
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
          <div className="flex flex-1 flex-col gap-8 overflow-hidden p-6">
            <ConsoleMetric label={t("cells")} value={DEMO.cells} spark={DEMO.sparkCells} />
            <ConsoleMetric label={t("timestep")} value={DEMO.step} unit="ms" tone="text-signal" spark={DEMO.sparkStep} />
            <ConsoleMetric label={t("wallclock")} value={DEMO.wall} unit="h" />
          </div>
        </>
      }
      right={
        <>
          <ConsolePane title={t("meshStatus")}>
            <div className="flex flex-col gap-4">
              {DEMO.meshes.map(({ id, state, value }) => (
                <ConsoleRow key={id} label={id} value={value} state={state} />
              ))}
            </div>
          </ConsolePane>
          <ConsolePane title={t("logTitle")} badge={t("live")} deep>
            <ConsoleLog entries={DEMO.log} />
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

            <path
              d="M0,380 C120,370 200,150 400,120 C560,96 640,300 800,300 C920,300 970,220 1000,210 L1000,400 L0,400 Z"
              fill="url(#hrr-fade)"
              className="text-signal"
            />
            <path
              d="M0,380 C120,370 200,150 400,120 C560,96 640,300 800,300 C920,300 970,220 1000,210"
              fill="none"
              strokeWidth="1.5"
              className="stroke-signal"
            />
            <path
              d="M0,330 L100,300 L250,250 L400,180 L550,220 L700,140 L850,200 L1000,170"
              fill="none"
              strokeWidth="1"
              strokeDasharray="2 4"
              className="stroke-primary"
              opacity="0.65"
            />

            <circle cx="400" cy="120" r="3" strokeWidth="1.5" className="fill-well stroke-signal" />
            <circle cx="800" cy="300" r="3" strokeWidth="1.5" className="fill-well stroke-signal" />
            <circle cx="700" cy="140" r="2" className="fill-primary" />
          </svg>

          {/* Opisy punktów w DOM — SVG wyżej ma preserveAspectRatio="none",
              które ścisnęłoby litery w poziomie. */}
          <div className="pointer-events-none absolute inset-0 px-5 py-12 md:px-10 md:py-16">
            <span className="absolute left-[40%] top-[20%] whitespace-nowrap font-mono text-fr-sm font-medium text-signal">
              HRR_MAX // 2 480 kW
            </span>
            <span className="absolute left-[64%] top-[66%] whitespace-nowrap font-mono text-fr-sm font-medium text-signal">
              FAZA_USTALONA
            </span>
            <span className="absolute left-[62%] top-[41%] whitespace-nowrap font-mono text-fr-sm font-medium text-primary">
              T_STROP 138 °C
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
