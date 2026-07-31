import { useTranslations } from "next-intl";

// Pas czterech etapów zlecenia (wzór: rząd węzłów na osi). Pierwszy węzeł jest
// „aktywny" — rombem i świeceniem prowadzi wzrok od lewej. Pod każdym etapem
// mikro-wskaźnik: sparkline, słupki, pasek i grzebień — cztery różne formy,
// żeby rząd nie czytał się jak czterokrotnie ta sama karta.
export default function StageStrip() {
  const t = useTranslations("cloudLanding.stages");

  return (
    <section className="border-t border-hairline bg-canvas px-4 pb-24 pt-20 md:pb-32">
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">

          {["s1", "s2", "s3", "s4"].map((k, i) => (
            <div key={k} className="relative flex flex-col items-start text-left">
              {/* Węzeł na osi */}
              <div className="relative mb-6 flex h-12 w-full items-center">
                {i === 0 ? (
                  <span className="absolute left-1/2 z-10 h-3 w-3 -translate-x-1/2 rotate-45 border border-primary bg-primary/20 shadow-[0_0_15px_rgb(var(--fr-signal)/0.35)]" />
                ) : (
                  <span className="absolute left-1/2 z-10 h-2 w-2 -translate-x-1/2 border border-hairline bg-canvas" />
                )}
                <span className={`h-px w-full ${i === 0 ? "bg-primary/25" : "bg-hairline-soft"}`} />
              </div>

              <div className="px-1">
                <div
                  className={`mb-1 font-mono text-fr-micro uppercase ${
                    i === 0 ? "text-primary" : "text-muted"
                  }`}
                >
                  {t(`${k}Meta`)}
                </div>
                <h3 className="mb-1.5 font-heading text-fr-h4 text-ink">{t(`${k}Title`)}</h3>
                <p className="mb-4 text-fr-sm text-muted">{t(`${k}Desc`)}</p>

                <div className="border-t border-hairline-soft pt-4">
                  {i === 0 && (
                    <svg className="h-4 w-24 opacity-70" viewBox="0 0 100 20">
                      <path
                        d="M0,10 L10,8 L20,15 L30,5 L40,12 L50,10 L60,18 L70,2 L80,12 L90,8 L100,10"
                        fill="none" strokeWidth="0.5" className="stroke-primary"
                      />
                    </svg>
                  )}
                  {i === 1 && (
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((b) => (
                        <span key={b} className={`h-3 w-1 ${b === 2 ? "bg-primary/50" : "bg-hairline"}`} />
                      ))}
                    </div>
                  )}
                  {i === 2 && (
                    <div className="h-1 w-12 overflow-hidden bg-hairline">
                      <span className="block h-full w-2/3 bg-signal/60" />
                    </div>
                  )}
                  {i === 3 && (
                    <div className="flex gap-0.5">
                      {[0, 1, 2, 3, 4].map((b) => (
                        <span key={b} className={`h-3 w-px ${b === 3 ? "bg-muted" : "bg-hairline"}`} />
                      ))}
                    </div>
                  )}
                  <div className="mt-2 font-mono text-fr-label uppercase tracking-tight text-muted">
                    {t(`${k}Stat`)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
