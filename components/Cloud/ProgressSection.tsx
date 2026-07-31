import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// „Śledź obliczenia na żywo" — sekcja odwrócona (panel po lewej, tekst po
// prawej) wg wzoru. Panel łączy oś czasu zlecenia z kafelkiem telemetrii,
// a nakładająca się karta pokazuje kolejkę zleceń użytkownika.
export default function ProgressSection() {
  const t = useTranslations("cloudLanding.progress");

  const queue = [
    { name: "KLATKA_SCHODOWA_A", meta: t("queue.m1"), action: t("queue.open"), primary: true },
    { name: "GARAZ_P1_ODDYM", meta: t("queue.m2"), action: t("queue.details"), primary: false },
    { name: "HALA_MAGAZYNOWA", meta: t("queue.m3"), action: t("queue.details"), primary: false },
  ];

  return (
    <section className="border-t border-hairline bg-canvas px-4 py-20 md:py-32">
      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 items-center gap-16 lg:grid-cols-2 lg:gap-24">

        {/* Panel — na mobile pod tekstem, na desktopie po lewej */}
        <div className="relative order-2 h-[460px] w-full lg:order-1 lg:h-[600px]">
          <div className="absolute inset-0 flex flex-col overflow-hidden rounded-card border border-hairline bg-panel-deep">

            {/* Oś czasu zlecenia */}
            <div className="relative h-[45%] border-b border-hairline-soft bg-panel p-6">
              <div className="fr-dots pointer-events-none absolute inset-0 opacity-30" />
              <div className="relative flex h-full flex-col">
                <div className="mb-8 flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-fr-micro uppercase text-signal">{t("panel.timeline")}</span>
                    <span className="font-mono text-fr-sm text-muted">{t("panel.timelineMeta")}</span>
                  </div>
                  <div className="flex gap-6 font-mono text-fr-label uppercase tracking-widest text-muted">
                    <span>{t("panel.done")}</span>
                    <span>{t("panel.eta")}</span>
                  </div>
                </div>

                <div className="relative flex-1">
                  <svg className="h-full w-full" viewBox="0 0 600 120" preserveAspectRatio="none">
                    {[50, 200, 350, 500].map((x) => (
                      <line key={x} x1={x} y1="0" x2={x} y2="120" strokeWidth="0.5" strokeDasharray="2 2" className="stroke-hairline" />
                    ))}
                    <path
                      d="M0,60 L50,60 L70,40 L180,40 L200,80 L350,80 L380,20 L500,20 L520,60 L600,60"
                      fill="none" strokeWidth="1" className="stroke-primary" opacity="0.75"
                    />
                    <circle cx="70" cy="40" r="1.5" className="fill-primary" />
                    <circle cx="380" cy="20" r="1.5" className="fill-primary" />
                    <path
                      d="M0,90 L120,90 L150,110 L300,110 L330,70 L480,70 L510,95 L600,95"
                      fill="none" strokeWidth="1" strokeDasharray="4 2" className="stroke-signal" opacity="0.45"
                    />
                  </svg>

                  {/* Opisy zdarzeń w DOM — SVG wyżej jest rozciągane
                      (preserveAspectRatio="none"), więc tekst w nim traciłby
                      proporcje. Pozycje w % wg układu 600×120. */}
                  <div className="pointer-events-none absolute inset-0">
                    <span className="absolute left-[10%] top-[16%] whitespace-nowrap font-mono text-fr-sm text-primary">
                      {t("panel.evt1")}
                    </span>
                    <span className="absolute left-[56%] top-[0%] whitespace-nowrap font-mono text-fr-sm text-primary">
                      {t("panel.evt2")}
                    </span>
                    <span className="absolute left-[22%] top-[58%] whitespace-nowrap font-mono text-fr-sm text-signal">
                      {t("panel.evt3")}
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 flex w-full justify-between px-2 font-mono text-fr-label uppercase tracking-[0.3em] text-muted">
                    <span>0 s</span><span>300 s</span><span>600 s</span><span>900 s</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dolny pas: telemetria + schemat przydziału */}
            <div className="grid flex-1 grid-cols-2 gap-px bg-hairline-soft">
              <div className="flex flex-col gap-5 bg-panel p-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-fr-micro font-bold uppercase text-muted">{t("panel.telemetry")}</span>
                  <span className="font-mono text-fr-sm text-signal">{t("panel.refresh")}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { l: t("panel.mCpu"), v: "15", tone: "text-ink" },
                    { l: t("panel.mStep"), v: "0,84", tone: "text-signal" },
                    { l: t("panel.mLeft"), v: "1:47", tone: "text-ink" },
                  ].map(({ l, v, tone }) => (
                    <div key={l} className="flex flex-col gap-1">
                      <span className="text-fr-label uppercase text-muted">{l}</span>
                      <span className={`fr-num font-mono text-fr-body ${tone}`}>{v}</span>
                    </div>
                  ))}
                </div>
                <div className="relative flex-1 overflow-hidden rounded-tile border border-hairline-soft bg-panel-deep">
                  <div className="fr-grid-sm pointer-events-none absolute inset-0" />
                  <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                    <path
                      d="M0,35 L10,32 L20,36 L30,28 L40,30 L50,15 L60,25 L70,22 L80,30 L90,20 L100,25"
                      fill="none" strokeWidth="0.5" className="stroke-signal" opacity="0.7"
                    />
                  </svg>
                  <span className="absolute bottom-1 right-2 font-mono text-fr-sm text-muted">{t("panel.hrrLive")}</span>
                </div>
              </div>

              <div className="flex flex-col bg-panel p-5">
                <span className="mb-6 font-mono text-fr-micro font-bold uppercase text-muted">{t("panel.alloc")}</span>
                <div className="relative flex flex-1 items-center justify-center">
                  <svg className="h-full w-full" viewBox="0 0 200 120">
                    <circle cx="100" cy="60" r="2" className="fill-primary" />
                    <circle cx="100" cy="60" r="8" fill="none" strokeWidth="0.4" className="stroke-primary" />
                    <path d="M100,60 L60,40" strokeWidth="0.3" className="stroke-muted" opacity="0.5" />
                    <path d="M100,60 L140,40" strokeWidth="0.3" className="stroke-muted" opacity="0.5" />
                    <path d="M100,60 L100,100" strokeWidth="0.3" strokeDasharray="2 1" className="stroke-muted" opacity="0.5" />
                    <rect x="55" y="35" width="10" height="10" fill="none" strokeWidth="0.3" className="stroke-muted" opacity="0.6" />
                    <rect x="135" y="35" width="10" height="10" fill="none" strokeWidth="0.3" className="stroke-muted" opacity="0.6" />
                    <circle cx="100" cy="100" r="1.5" className="fill-warn" opacity="0.7" />
                    <text x="46" y="28" fontFamily="monospace" fontSize="9" className="fill-muted">MESH_A</text>
                    <text x="126" y="28" fontFamily="monospace" fontSize="9" className="fill-muted">MESH_B</text>
                    <text x="104" y="104" fontFamily="monospace" fontSize="9" className="fill-warn">{t("panel.pending")}</text>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Karta kolejki — nachodzi na panel (jak we wzorze) */}
          <div className="absolute -bottom-6 right-0 z-20 w-[300px] rounded-panel border border-hairline bg-panel/95 p-5 shadow-fr-float backdrop-blur-xl lg:-right-10 lg:bottom-[8%]">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-1 w-1 rounded-full bg-signal" />
                <span className="font-mono text-fr-sm font-bold uppercase tracking-[0.2em] text-ink">
                  {t("queue.title")}
                </span>
              </div>
              <span className="font-mono text-fr-label uppercase text-muted">3 / 3</span>
            </div>
            <div className="space-y-4">
              {queue.map(({ name, meta, action, primary }) => (
                <div key={name} className="flex items-center justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <div className="truncate font-mono text-fr-sm text-ink">{name}</div>
                    <div className="font-mono text-fr-label uppercase text-muted">{meta}</div>
                  </div>
                  <span
                    className={`shrink-0 rounded-chip border px-2.5 py-1 font-mono text-fr-label uppercase tracking-widest ${
                      primary ? "border-primary/40 text-primary" : "border-hairline text-muted"
                    }`}
                  >
                    {action}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tekst */}
        <div className="order-1 lg:order-2">
          <span className="mb-5 inline-flex items-center gap-2 rounded-chip border border-hairline px-2.5 py-1 font-mono text-fr-micro uppercase text-muted">
            <span className="h-1 w-1 rounded-full bg-signal" />
            {t("badge")}
          </span>
          <h2 className="mb-6 font-heading text-fr-h1 fr-balance text-ink">{t("title")}</h2>
          <p className="mb-8 max-w-xl text-fr-lead text-muted">{t("lead")}</p>
          <Link
            href="/symulacje/nowa"
            className="inline-flex items-center gap-2 rounded-panel bg-primary px-6 py-3 text-fr-body font-bold text-white transition-opacity hover:opacity-90"
          >
            {t("cta")}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
