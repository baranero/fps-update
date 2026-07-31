import { useTranslations } from "next-intl";

// „Z pliku .fds w konkretną wycenę" — sekcja dwukolumnowa wg wzoru (tekst po
// lewej, przyrządowa ramka po prawej). Ramka pokazuje to, co parser naprawdę
// wyciąga z pliku: rozkład komórek w siatkach i wynikowy koszt.
export default function ParserSection() {
  const t = useTranslations("cloudLanding.parser");

  return (
    <section className="border-t border-hairline bg-canvas px-4 py-20 md:py-28">
      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-24">
        <div>
          <span className="mb-5 inline-flex items-center gap-2 rounded-chip border border-hairline px-2.5 py-1 font-mono text-fr-micro uppercase text-muted">
            <span className="h-1 w-1 rounded-full bg-primary" />
            {t("badge")}
          </span>
          <h2 className="mb-6 font-heading text-fr-h1 fr-balance text-ink">{t("title")}</h2>
          <p className="mb-8 max-w-xl text-fr-lead text-muted">{t("lead")}</p>

          <ul className="space-y-4">
            {["p1", "p2", "p3"].map((k) => (
              <li key={k} className="flex gap-3 border-t border-hairline-soft pt-4">
                <span className="mt-0.5 font-mono text-fr-micro text-primary">{`0${k.slice(1)}`}</span>
                <p className="text-fr-sm text-muted">{t(`points.${k}`)}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Ramka analityczna */}
        <div className="relative h-[440px] w-full overflow-hidden rounded-card border border-hairline bg-panel-deep md:h-[560px]">
          <div className="fr-dots pointer-events-none absolute inset-0 opacity-40" />
          <div className="fr-grid pointer-events-none absolute inset-0" style={{ backgroundSize: "60px 60px" }} />

          {/* Znaczniki narożników — detal „przyrządowy" ze wzoru */}
          <span className="absolute left-4 top-4 h-2 w-2 border-l border-t border-muted" />
          <span className="absolute right-4 top-4 h-2 w-2 border-r border-t border-muted" />
          <span className="absolute bottom-4 left-4 h-2 w-2 border-b border-l border-muted" />
          <span className="absolute bottom-4 right-4 h-2 w-2 border-b border-r border-muted" />

          <div className="absolute left-6 top-6 flex gap-8 md:left-8">
            <div className="flex flex-col">
              <span className="font-mono text-fr-micro uppercase text-muted">{t("panel.file")}</span>
              <span className="font-mono text-fr-sm text-ink">klatka_schodowa_A.fds</span>
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-fr-micro uppercase text-muted">{t("panel.cells")}</span>
              <span className="fr-num font-mono text-fr-sm text-signal">3 240 000</span>
            </div>
          </div>

          {/* Rozkład komórek w siatkach */}
          <div className="absolute inset-0 flex items-center justify-center px-8">
            <svg className="h-[55%] w-full" viewBox="0 0 1000 400" preserveAspectRatio="none">
              <defs>
                <linearGradient id="parser-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
                  <stop offset="50%" stopColor="currentColor" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              </defs>

              {[100, 200, 300].map((y, i) => (
                <line
                  key={y}
                  x1="0" y1={y} x2="1000" y2={y}
                  strokeWidth="0.5"
                  strokeDasharray={i === 1 ? undefined : "4 4"}
                  className="stroke-hairline"
                />
              ))}

              <path
                d="M0,200 L100,195 L200,210 L300,180 L400,220 L500,150 L600,230 L700,200 L800,210 L900,190 L1000,200"
                fill="none"
                strokeWidth="1"
                stroke="url(#parser-grad)"
                className="text-signal"
              />
              <circle cx="300" cy="180" r="2" className="fill-signal" />
              <circle cx="500" cy="150" r="2" className="fill-signal" />
              <circle cx="600" cy="230" r="2" className="fill-warn" />
            </svg>
          </div>

          {/* Opisy poza SVG — wykres jest rozciągany (preserveAspectRatio
              ="none"), co zniekształcałoby litery. Ten kontener powiela
              geometrię kontenera wykresu wyżej (inset-0 + px-8 + h-[55%]),
              więc pozycje w % trafiają w te same punkty układu 1000×400:
              (500,150) i (600,230). */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8">
            <div className="relative h-[55%] w-full">
              <span className="absolute left-[48%] top-[24%] whitespace-nowrap font-mono text-fr-sm font-medium text-signal">
                MESH_07 // 412 k
              </span>
              <span className="absolute left-[52%] top-[64%] whitespace-nowrap font-mono text-fr-sm font-medium text-warn">
                CFL // krok 0,006 s
              </span>
            </div>
          </div>

          {/* Wycena — to, po co użytkownik tu jest */}
          <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between md:left-8 md:right-8">
            <div className="font-mono text-fr-sm leading-relaxed text-muted">
              {t("panel.note1")}
              <br />
              {t("panel.note2")}
            </div>
            <div className="text-right">
              <span className="block font-mono text-fr-micro uppercase text-muted">{t("panel.cost")}</span>
              <span className="fr-num font-heading text-fr-h3 text-primary">87 zł</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
