import { useTranslations } from "next-intl";

// Trzy „rysunki techniczne" — sekcja zasady działania. Rysujemy to, co widać
// naprawdę: bryłę modelu pociętą na siatki &MESH (widok jak w PyroSimie),
// przydział siatek do procesów MPI i krzywą HRR z pliku _hrr.csv. Czyste SVG
// na tokenach koloru, więc działa w obu motywach bez duplikowania klas.

// Rzut izometryczny: metry modelu → układ SVG. Oś X biegnie w prawo-dół,
// Y w lewo-dół, Z w górę. Skala i środek dobrane pod halę 12 × 8 × 6 m
// w polu 200 × 200.
const ISO = { s: 7.4, ox: 88, oy: 86 };

type P3 = readonly [number, number, number];
type XB = readonly [number, number, number, number, number, number];

function iso(x: number, y: number, z: number) {
  return [
    ISO.ox + (x - y) * 0.866 * ISO.s,
    ISO.oy + (x + y) * 0.5 * ISO.s - z * ISO.s,
  ] as const;
}

function poly(corners: readonly P3[]) {
  return corners.map(([x, y, z]) => iso(x, y, z).join(",")).join(" ");
}

// Hala 12 × 8 × 6 m przy komórce 0,10 m — 576 000 komórek pociętych na cztery
// siatki po 60 × 40 × 60. Te same cztery siatki wracają na RYS 0.2.
const HALL: XB = [0, 12, 0, 8, 0, 6];
const OBST: XB = [7, 9.4, 2, 4.4, 0, 2.6];
const MESHES: { x: number; y: number; name: string }[] = [
  { x: 3, y: 2, name: "MESH_01" },
  { x: 9, y: 2, name: "MESH_02" },
  { x: 3, y: 6, name: "MESH_03" },
  { x: 9, y: 6, name: "MESH_04" },
];

// Krzywa HRR: wzrost α·t² (pożar „fast") do 2 480 kW, dalej plateau do końca
// czasu z sekcji &TIME. Te same liczby co w panelu wyników na żywo.
const HRR = { peak: 2480, tPeak: 230, tEnd: 900, qAxis: 3000 };
const PLOT = { x0: 36, x1: 184, y0: 30, y1: 162 };

function hrrPoint(t: number) {
  const q = t <= HRR.tPeak ? HRR.peak * (t / HRR.tPeak) ** 2 : HRR.peak;
  return [
    PLOT.x0 + (t / HRR.tEnd) * (PLOT.x1 - PLOT.x0),
    PLOT.y1 - (q / HRR.qAxis) * (PLOT.y1 - PLOT.y0),
  ] as const;
}

const HRR_CURVE = Array.from({ length: 73 }, (_, i) => hrrPoint((i / 72) * HRR.tEnd).join(",")).join(" ");
const HRR_KNEE = hrrPoint(HRR.tPeak);

// Cztery siatki eksplodowane w rzucie — każda na innej randze MPI. Rangę
// znaczymy kryciem stropu, nie nową barwą: paleta serii zostaje nietknięta.
const RANKS: { xb: XB; rank: number; fill: number }[] = [
  { xb: [0, 5.6, 0, 3.6, 0, 5], rank: 0, fill: 0.1 },
  { xb: [6.4, 12, 0, 3.6, 0, 5], rank: 1, fill: 0.18 },
  { xb: [0, 5.6, 4.4, 8, 0, 5], rank: 2, fill: 0.26 },
  { xb: [6.4, 12, 4.4, 8, 0, 5], rank: 3, fill: 0.34 },
];

export default function FigurePlates() {
  const t = useTranslations("cloudLanding.figures");

  return (
    <section className="border-t border-hairline bg-canvas px-4 py-20 md:py-28">
      <div className="mx-auto w-full max-w-[1400px]">
        <h2 className="mx-auto mb-16 max-w-3xl fr-balance text-center font-heading text-fr-h1 text-ink md:mb-24">
          {t("title")}
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-10">
          {/* RYS 0.1 — model pocięty na siatki &MESH */}
          <Plate caption={t("f1Caption")} title={t("f1Title")} desc={t("f1Desc")} note={t("f1Note")} tag={t("f1Tag")}>
            <svg width="100%" height="100%" viewBox="0 0 200 200" fill="none">
              {/* siatka komórek na stropie bryły — czytelny ślad podziału */}
              {Array.from({ length: 13 }, (_, i) => (
                <line
                  key={`gx-${i}`}
                  x1={iso(i, 0, 6)[0]} y1={iso(i, 0, 6)[1]}
                  x2={iso(i, 8, 6)[0]} y2={iso(i, 8, 6)[1]}
                  strokeWidth="0.25" className="stroke-faint opacity-50"
                />
              ))}
              {Array.from({ length: 9 }, (_, i) => (
                <line
                  key={`gy-${i}`}
                  x1={iso(0, i, 6)[0]} y1={iso(0, i, 6)[1]}
                  x2={iso(12, i, 6)[0]} y2={iso(12, i, 6)[1]}
                  strokeWidth="0.25" className="stroke-faint opacity-50"
                />
              ))}

              <BoxWire xb={HALL} />
              <BoxWire xb={OBST} solid />

              {/* płaszczyzny podziału na cztery siatki */}
              <polygon
                points={poly([[6, 0, 0], [6, 8, 0], [6, 8, 6], [6, 0, 6]])}
                strokeWidth="0.75"
                className="stroke-primary fill-primary"
                fillOpacity={0.1}
              />
              <polygon
                points={poly([[0, 4, 0], [12, 4, 0], [12, 4, 6], [0, 4, 6]])}
                strokeWidth="0.75"
                className="stroke-primary fill-primary"
                fillOpacity={0.1}
              />

              {MESHES.map(({ x, y, name }) => (
                <MeshLabel key={name} x={x} y={y} name={name} />
              ))}

              <text x="8" y="16" fontFamily="monospace" fontSize="9" className="fill-muted">
                XB = 0,0 12,0 0,0 8,0 0,0 6,0
              </text>
            </svg>
          </Plate>

          {/* RYS 0.2 — siatki rozdzielone na procesy MPI */}
          <Plate caption={t("f2Caption")} title={t("f2Title")} desc={t("f2Desc")} note={t("f2Note")} tag={t("f2Tag")}>
            <svg width="100%" height="100%" viewBox="0 0 200 200" fill="none">
              {RANKS.map(({ xb, rank, fill }) => {
                const [cx, cy] = iso((xb[0] + xb[1]) / 2, (xb[2] + xb[3]) / 2, xb[5]);
                return (
                  <g key={rank}>
                    <BoxWire xb={xb} topFill={fill} />
                    <text x={cx} y={cy + 1} textAnchor="middle" fontFamily="monospace" fontSize="10" className="fill-ink">
                      RANK {rank}
                    </text>
                  </g>
                );
              })}

              <text x="8" y="16" fontFamily="monospace" fontSize="9" className="fill-muted">
                MPI_PROCESS = 0,1,2,3
              </text>
            </svg>
          </Plate>

          {/* RYS 0.3 — krzywa HRR z pliku _hrr.csv */}
          <Plate caption={t("f3Caption")} title={t("f3Title")} desc={t("f3Desc")} note={t("f3Note")} tag={t("f3Tag")}>
            <svg width="100%" height="100%" viewBox="0 0 200 200" fill="none">
              {[1000, 2000, 3000].map((q) => {
                const y = PLOT.y1 - (q / HRR.qAxis) * (PLOT.y1 - PLOT.y0);
                return (
                  <g key={q}>
                    <line x1={PLOT.x0} y1={y} x2={PLOT.x1} y2={y} strokeWidth="0.25" className="stroke-faint opacity-60" />
                    <text x={PLOT.x0 - 4} y={y + 3} textAnchor="end" fontFamily="monospace" fontSize="8" className="fill-muted">
                      {q}
                    </text>
                  </g>
                );
              })}

              <line x1={PLOT.x0} y1={PLOT.y0} x2={PLOT.x0} y2={PLOT.y1} strokeWidth="0.5" className="stroke-hairline" />
              <line x1={PLOT.x0} y1={PLOT.y1} x2={PLOT.x1} y2={PLOT.y1} strokeWidth="0.5" className="stroke-hairline" />

              {[0, 300, 600, 900].map((tick) => {
                const x = PLOT.x0 + (tick / HRR.tEnd) * (PLOT.x1 - PLOT.x0);
                return (
                  <g key={tick}>
                    <line x1={x} y1={PLOT.y1} x2={x} y2={PLOT.y1 + 3} strokeWidth="0.5" className="stroke-hairline" />
                    <text x={x} y={PLOT.y1 + 13} textAnchor="middle" fontFamily="monospace" fontSize="8" className="fill-muted">
                      {tick}
                    </text>
                  </g>
                );
              })}

              <polyline points={HRR_CURVE} strokeWidth="1" className="stroke-primary" />

              {/* koniec czasu z sekcji &TIME */}
              <line
                x1={PLOT.x1} y1={PLOT.y0} x2={PLOT.x1} y2={PLOT.y1}
                strokeWidth="0.5" strokeDasharray="2 2" className="stroke-faint"
              />

              <circle cx={HRR_KNEE[0]} cy={HRR_KNEE[1]} r="2" className="fill-primary" />
              <text x={HRR_KNEE[0] + 6} y={HRR_KNEE[1] - 5} fontFamily="monospace" fontSize="9" className="fill-primary">
                2 480 kW
              </text>

              <text x={PLOT.x0 - 8} y={PLOT.y0 - 10} fontFamily="monospace" fontSize="9" className="fill-muted">
                HRR [kW]
              </text>
              {/* Opis osi — sam czas. Sekcja &TIME przeniosła się do metryczki. */}
              <text x={PLOT.x1} y={PLOT.y1 + 26} textAnchor="end" fontFamily="monospace" fontSize="8" className="fill-muted">
                t [s]
              </text>
            </svg>
          </Plate>
        </div>
      </div>
    </section>
  );
}

// Podpis siatki na środku jej stropu. Jedna linia — cztery podpisy w rzucie
// izometrycznym stoją blisko siebie i drugi wiersz wchodziłby na sąsiada.
function MeshLabel({ x, y, name }: { x: number; y: number; name: string }) {
  const [sx, sy] = iso(x, y, 6);
  return (
    <text x={sx} y={sy + 3} textAnchor="middle" fontFamily="monospace" fontSize="9" className="fill-ink">
      {name}
    </text>
  );
}

// Bryła w rzucie izometrycznym: trzy widoczne ściany, krawędzie zasłonięte
// linią przerywaną. `topFill` przyciemnia strop — tak rozróżniamy rangi MPI.
function BoxWire({ xb, topFill, solid }: { xb: XB; topFill?: number; solid?: boolean }) {
  const [x0, x1, y0, y1, z0, z1] = xb;
  const edge = solid ? "stroke-muted" : "stroke-hairline";

  return (
    <g>
      <polygon
        points={poly([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]])}
        strokeWidth="0.5"
        className={topFill ? `${edge} fill-signal` : `${edge} fill-none`}
        fillOpacity={topFill}
      />
      <polygon
        points={poly([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]])}
        strokeWidth="0.5" className={edge}
      />
      <polygon
        points={poly([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]])}
        strokeWidth="0.5" className={edge}
      />
      {([
        [[x0, y0, z0], [x1, y0, z0]],
        [[x0, y0, z0], [x0, y1, z0]],
        [[x0, y0, z0], [x0, y0, z1]],
      ] as const).map(([a, b], i) => (
        <line
          key={i}
          x1={iso(...a)[0]} y1={iso(...a)[1]}
          x2={iso(...b)[0]} y2={iso(...b)[1]}
          strokeWidth="0.35" strokeDasharray="2 2" className="stroke-faint"
        />
      ))}
    </g>
  );
}

/**
 * Jeden rysunek techniczny: kadr + metryczka pod nim.
 *
 * `note` to odczyt z pliku (lewa strona), `tag` — wniosek (prawa). Obie idą
 * z tłumaczeń, bo serwis chmurowy jest dwujęzyczny.
 *
 * Metryczka jest ZWYKŁYM wierszem pod kadrem, a nie napisem nałożonym na
 * rysunek. Wcześniej te dwa podpisy żyły w osobnych układach — jeden jako
 * `<text>` w środku SVG, drugi jako `absolute` span w rogu — więc żaden nie
 * wiedział o szerokości drugiego i przy dłuższym tekście wchodziły na siebie
 * (RYS 0.1 i 0.3). Przy okazji renderowały się w dwóch różnych rozmiarach:
 * napis w SVG skaluje się razem z rysunkiem, span nie.
 */
function Plate({
  caption,
  title,
  desc,
  note,
  tag,
  children,
}: {
  caption: string;
  title: string;
  desc: string;
  note: string;
  tag: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-card border border-hairline bg-panel p-6">
      <div className="mb-4 font-mono text-fr-micro uppercase text-muted">{caption}</div>

      <div className="mb-5 flex h-[280px] flex-col overflow-hidden rounded-panel border border-hairline-soft bg-panel-deep">
        <div className="fr-dots flex min-h-0 flex-1 items-center justify-center p-4">
          {children}
        </div>

        {/* Tabliczka rysunkowa. Kolumna na wąskich kartach (w siatce md pole ma
            ~230 px i dwa napisy obok siebie by się nie zmieściły), wiersz od lg.
            W obu układach to jeden flex — napisy nie mają jak na siebie wejść. */}
        <div className="flex flex-col gap-0.5 border-t border-hairline-soft px-3 py-2 font-mono text-fr-micro text-muted lg:flex-row lg:items-center lg:justify-between lg:gap-3">
          <span className="truncate">{note}</span>
          <span className="truncate text-ink lg:shrink-0">{tag}</span>
        </div>
      </div>

      <h3 className="mb-1.5 font-heading text-fr-h4 text-ink">{title}</h3>
      <p className="text-fr-sm text-muted">{desc}</p>
    </div>
  );
}
