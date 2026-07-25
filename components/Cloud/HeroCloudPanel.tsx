"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

// Poglądowy panel „symulacja w toku" — wizualny akcent hero (usługi + landing
// chmury). Dane demonstracyjne; klucze z `hero.panel.*`.
const DEMO = {
  fileName: "klatka_schodowa_A.fds",
  fileSize: "4.2 MB",
  meshes: 15,
  tEnd: 900,
  cells: "3.2M",
  wallHours: "5.4h",
  server: "cpx41",
  progress: 67,
  remaining: "~1h 47min",
  price: "87 zł",
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
    <div className="rounded-2xl border border-primary/20 bg-[#111827] shadow-[0_0_60px_rgba(220,53,69,0.10),0_24px_48px_rgba(0,0,0,0.4)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-primary/10 px-4 py-3">
        <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
          {t("title")}
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          {t("running")}
        </span>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* File row */}
        <div className="flex items-center gap-3 rounded-lg border border-slate-700/50 bg-white/[0.03] px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary text-sm">
            ⬡
          </div>
          <div>
            <p className="font-mono text-[13px] font-semibold text-white">{DEMO.fileName}</p>
            <p className="text-[11px] text-slate-500">
              {DEMO.fileSize} · {DEMO.meshes} {t("meshes")} · T_END {DEMO.tEnd} s
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { val: DEMO.cells, label: t("cells") },
            { val: DEMO.wallHours, label: t("estTime") },
            { val: DEMO.server, label: t("server") },
          ].map(({ val, label }) => (
            <div
              key={label}
              className="rounded-lg border border-primary/10 bg-primary/[0.04] px-3 py-2.5"
            >
              <p className="font-mono text-[17px] font-extrabold tabular-nums text-primary">
                {val}
              </p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-500">
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div>
          <div className="mb-1.5 h-1 overflow-hidden rounded-full bg-white/5">
            <div
              ref={barRef}
              className="h-full rounded-full bg-gradient-to-r from-primary to-red-400 transition-[width] duration-1000"
              style={{ width: "0%" }}
            />
          </div>
          <div className="flex justify-between font-mono text-[11px] text-slate-500">
            <span>{t("progress", { pct: DEMO.progress })}</span>
            <span>{t("remaining", { time: DEMO.remaining })}</span>
          </div>
        </div>

        {/* Price row */}
        <div className="flex items-center justify-between border-t border-slate-700/40 pt-3">
          <span className="text-[12px] text-slate-500">{t("cost")}</span>
          <span className="font-mono text-[22px] font-extrabold tabular-nums text-primary">
            {DEMO.price}
          </span>
        </div>
      </div>
    </div>
  );
}
