import { useTranslations } from "next-intl";

// Trzy „rysunki techniczne" — sekcja zasady działania. Wzór graficzny ma tu
// abstrakcyjne figury (FIG 0.1/0.2/0.3); u nas niosą realną treść FDS:
// podział na siatki, rozdział na rdzenie i krzywa HRR. Rysunki są czystym SVG
// na tokenach koloru, więc działają w obu motywach bez duplikowania klas.
export default function FigurePlates() {
  const t = useTranslations("cloudLanding.figures");

  return (
    <section className="border-t border-hairline bg-canvas px-4 py-20 md:py-28">
      <div className="mx-auto w-full max-w-[1400px]">
        <h2 className="mx-auto mb-16 max-w-3xl fr-balance text-center font-heading text-fr-h1 text-ink md:mb-24">
          {t("title")}
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-10">
          {/* RYS 0.1 — podział modelu na siatki */}
          <Plate caption={t("f1Caption")} title={t("f1Title")} desc={t("f1Desc")} corner="34.22 // 11.08">
            <svg width="80%" height="80%" viewBox="0 0 200 200" fill="none">
              <rect x="20" y="20" width="160" height="160" rx="2" strokeWidth="0.5" className="stroke-hairline" />
              <line x1="60" y1="20" x2="60" y2="180" strokeWidth="0.5" className="stroke-hairline" />
              <rect x="70" y="30" width="100" height="40" rx="1" strokeWidth="0.75" className="stroke-primary" />
              <rect x="70" y="80" width="100" height="90" rx="1" strokeWidth="0.5" className="stroke-hairline" />
              <text x="75" y="45" fontFamily="monospace" fontSize="11" className="fill-muted">MESH_01</text>
              <text x="75" y="95" fontFamily="monospace" fontSize="11" className="fill-muted">MESH_02</text>
              <text x="20" y="14" fontFamily="monospace" fontSize="11" className="fill-muted">Z = 0,00</text>
            </svg>
          </Plate>

          {/* RYS 0.2 — rozdział siatek na rdzenie */}
          <Plate caption={t("f2Caption")} title={t("f2Title")} desc={t("f2Desc")} corner="MPI // 15 RANK">
            <svg width="80%" height="80%" viewBox="0 0 200 200" fill="none">
              <circle cx="100" cy="100" r="40" strokeWidth="0.5" className="stroke-signal" />
              {[
                [40, 40], [160, 40], [160, 160], [40, 160],
              ].map(([cx, cy]) => (
                <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="8" strokeWidth="0.5" className="stroke-hairline" />
              ))}
              {[
                [47, 47, 71, 71], [153, 47, 129, 71], [153, 153, 129, 129], [47, 153, 71, 129],
              ].map(([x1, y1, x2, y2]) => (
                <line
                  key={`${x1}-${y1}`}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  strokeWidth="0.5" strokeDasharray="2 2" className="stroke-faint"
                />
              ))}
              {[[70, 70], [128, 70], [128, 128], [70, 128]].map(([x, y]) => (
                <rect key={`${x}-${y}`} x={x} y={y} width="2" height="2" className="fill-signal" />
              ))}
              <text x="77" y="104" fontFamily="monospace" fontSize="11" className="fill-muted">EPYC_VM</text>
              <text x="20" y="18" fontFamily="monospace" fontSize="11" className="fill-muted">RANK_0</text>
              <text x="140" y="18" fontFamily="monospace" fontSize="11" className="fill-muted">RANK_1</text>
            </svg>
          </Plate>

          {/* RYS 0.3 — krzywa HRR */}
          <Plate caption={t("f3Caption")} title={t("f3Title")} desc={t("f3Desc")} corner="α·t² // 900 s">
            <svg width="80%" height="80%" viewBox="0 0 200 200" fill="none">
              <path d="M20,170 Q70,170 100,90 T180,60" strokeWidth="0.75" className="stroke-primary" />
              <line x1="100" y1="20" x2="100" y2="180" strokeWidth="0.5" strokeDasharray="2 2" className="stroke-faint" />
              <circle cx="100" cy="90" r="3" className="fill-primary" />
              <text x="185" y="178" fontFamily="monospace" fontSize="12" className="fill-muted">t</text>
              <text x="105" y="25" fontFamily="monospace" fontSize="12" className="fill-muted">Q</text>
              <text x="110" y="84" fontFamily="monospace" fontSize="11" className="fill-primary">2 480 kW</text>
              <text x="110" y="99" fontFamily="monospace" fontSize="11" className="fill-muted">T_ROZWOJU</text>
            </svg>
          </Plate>
        </div>
      </div>
    </section>
  );
}

function Plate({
  caption,
  title,
  desc,
  corner,
  children,
}: {
  caption: string;
  title: string;
  desc: string;
  corner: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-card border border-hairline bg-panel p-6">
      <div className="mb-4 font-mono text-fr-micro uppercase text-muted">{caption}</div>

      <div className="mb-5 flex h-[280px] items-center justify-center rounded-panel border border-hairline-soft bg-panel-deep p-4">
        <div className="fr-dots relative flex h-full w-full items-center justify-center">
          {children}
          <span className="absolute bottom-1 right-1 font-mono text-fr-sm text-muted">{corner}</span>
        </div>
      </div>

      <h3 className="mb-1.5 font-heading text-fr-h4 text-ink">{title}</h3>
      <p className="text-fr-sm text-muted">{desc}</p>
    </div>
  );
}
