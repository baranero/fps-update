"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

// Poglądowy panel „symulacja w toku" — wizualny akcent hero (usługi + landing
// chmury). Dane demonstracyjne; klucze z `hero.panel.*`.
//
// Panel był do tej pory jedynym elementem chmury pomalowanym poza systemem:
// tło wpisane na sztywno (`bg-[#111827]`), szarości z palety Tailwinda
// (`slate-500/700`), zieleń `emerald-400` zamiast tonu `ok`, promienie
// `2xl/lg/md` spoza skali i rozmiary liter w pikselach. Na jasnym motywie
// oznaczało to ciemny prostokąt wstawiony w jasną stronę. Teraz maluje się
// tokenami, więc sam przełącza motyw razem z resztą serwisu.
const DEMO = {
  fileName: "klatka_schodowa_A.fds",
  fileSize: "4.2 MB",
  meshes: 15,
  tEnd: 900,
  cells: "3.2M",
  wallHours: "5.4h",
  // Opis sprzętu, nie symbol maszyny dostawcy — klient nigdzie go nie ogląda.
  server: "16 vCPU",
  progress: 67,
  remaining: "~1h 47min",
};

export default function HeroCloudPanel() {
  const t = useTranslations("hero.panel");
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (barRef.current) barRef.current.style.width = `${DEMO.progress}%`;
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="overflow-hidden rounded-card border border-hairline bg-panel shadow-fr-float">
      {/* Belka tytułowa */}
      <div className="flex items-center justify-between border-b border-hairline-soft px-4 py-3">
        <span className="font-mono text-fr-micro font-bold uppercase tracking-widest text-accent">
          {t("title")}
        </span>
        <span className="flex items-center gap-1.5 font-mono text-fr-micro uppercase text-ok">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ok" />
          {t("running")}
        </span>
      </div>

      <div className="space-y-4 p-4">
        {/* Wiersz pliku */}
        <div className="flex items-center gap-3 rounded-tile border border-hairline-soft bg-panel-deep px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-tile border border-primary/20 bg-primary/10 text-fr-sm text-accent">
            ⬡
          </div>
          <div className="min-w-0">
            <p className="truncate font-mono text-fr-sm font-semibold text-ink">{DEMO.fileName}</p>
            <p className="text-fr-sm text-muted">
              {DEMO.fileSize} · {DEMO.meshes} {t("meshes")} · T_END {DEMO.tEnd} s
            </p>
          </div>
        </div>

        {/* Odczyty */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { val: DEMO.cells, label: t("cells") },
            { val: DEMO.wallHours, label: t("estTime") },
            { val: DEMO.server, label: t("server") },
          ].map(({ val, label }) => (
            <div key={label} className="rounded-tile border border-primary/10 bg-primary/[0.04] px-3 py-2.5">
              <p className="fr-num font-heading text-fr-h4 text-accent">{val}</p>
              <p className="mt-0.5 font-mono text-fr-micro uppercase tracking-wider text-faint">
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Postęp */}
        <div>
          <div className="mb-1.5 h-1 overflow-hidden rounded-full bg-panel-deep">
            <div
              ref={barRef}
              className="h-full rounded-full bg-primary transition-[width] duration-1000"
              style={{ width: "0%" }}
            />
          </div>
          <div className="flex justify-between font-mono text-fr-sm text-muted">
            <span>{t("progress", { pct: DEMO.progress })}</span>
            <span>{t("remaining", { time: DEMO.remaining })}</span>
          </div>
        </div>

        {/* Cena */}
        <div className="flex items-center justify-between border-t border-hairline-soft pt-3">
          <span className="font-mono text-fr-micro uppercase text-muted">{t("cost")}</span>
          <span className="fr-num font-heading text-fr-h3 text-accent">{t("priceValue")}</span>
        </div>
      </div>
    </div>
  );
}
