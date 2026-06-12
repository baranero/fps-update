"use client";

import { useState } from "react";
import Link from "next/link";

const STANDARDS = {
  PN:    { label: "Polska Norma (PN)",    norm: "PN-B-02877-4:2025-07", factor: 0.02 },
  CNBOP: { label: "Wytyczne CNBOP",      norm: "W-0003:2001 (CNBOP)",   factor: 0.025 },
  VDS:   { label: "Wytyczne VdS",        norm: "VdS 2098",              factor: 0.03 },
} as const;

type Standard = keyof typeof STANDARDS;

export default function SmokeExhaustCalculatorPage() {
  const [active, setActive] = useState<Standard>("PN");
  const [area, setArea]   = useState<string>("");
  const [result, setResult] = useState<number | null>(null);

  const std = STANDARDS[active];

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    const s = parseFloat(area.replace(",", "."));
    if (!s || s <= 0) return;
    setResult(Number((s * std.factor).toFixed(2)));
  };

  const handleTabChange = (tab: Standard) => {
    setActive(tab);
    setResult(null);
  };

  return (
    <div>

      {/* Header block */}
      <div className="rounded-xl bg-slate-900 dark:bg-[#0D1117] mb-8 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
          <Link
            href="/narzedzia/kalkulatory"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Kalkulatory
          </Link>
        </div>
        <div className="px-5 py-4 flex items-center gap-3">
          <svg className="h-4 w-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <div>
            <span className="text-white text-sm font-medium">Szybki dobór A<sub>cz</sub> — oddymianie grawitacyjne</span>
            <span className="ml-3 text-slate-600 text-xs">PN / CNBOP / VdS</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 pb-10">

        {/* Form */}
        <div>
          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8">
            {(Object.keys(STANDARDS) as Standard[]).map((key) => (
              <button
                key={key}
                onClick={() => handleTabChange(key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  active === key
                    ? "border-primary text-primary"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {STANDARDS[key].label}
              </button>
            ))}
          </div>

          <div className="rounded-lg bg-primary/5 border border-primary/10 px-4 py-3 text-xs text-primary mb-8">
            Aktywna norma: <strong>{std.norm}</strong> — A<sub>cz</sub> = F · {(std.factor * 100).toFixed(0)}%
          </div>

          <form onSubmit={handleCalculate} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Powierzchnia strefy dymowej [m²]
              </label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={area}
                onChange={(e) => { setArea(e.target.value); setResult(null); }}
                placeholder="np. 2000"
                className="w-full max-w-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E2342] px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
              />
            </div>

            {active === "PN" && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Grupa projektowa (GP)
                </label>
                <select className="w-full max-w-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E2342] px-4 py-3 text-sm outline-none focus:border-primary transition">
                  <option value="GP1">GP1 — małe obciążenie ogniowe</option>
                  <option value="GP2">GP2</option>
                  <option value="GP3">GP3 — średnie obciążenie</option>
                  <option value="GP4">GP4</option>
                  <option value="GP5">GP5 — wysokie obciążenie (S3)</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              Oblicz A<sub>cz</sub>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </form>

          {/* Result */}
          {result !== null && (
            <div className="mt-8 animate-fade-in rounded-xl border border-green-200 dark:border-green-800/50 overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-green-200 dark:divide-green-800/50">
                <div className="p-5 bg-green-50 dark:bg-green-950/20">
                  <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-2">
                    Wymagana A<sub>cz,min</sub>
                  </p>
                  <p className="text-3xl font-semibold text-green-700 dark:text-green-300 tabular-nums">
                    {result} <span className="text-base font-medium">m²</span>
                  </p>
                </div>
                <div className="p-5">
                  <p className="text-xs text-slate-500 mb-2">Parametry</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    F = {area} m² · {(std.factor * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{std.norm}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar info */}
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4">Współczynniki</p>
            <div className="space-y-3">
              {(Object.entries(STANDARDS) as [Standard, typeof STANDARDS[Standard]][]).map(([key, s]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className={`font-medium ${active === key ? "text-primary" : "text-slate-600 dark:text-slate-400"}`}>{key}</span>
                  <span className="text-slate-500 text-xs">{(s.factor * 100).toFixed(0)}% · F</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Potrzebujesz więcej?</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Pełna weryfikacja oddymiania klatek schodowych z doborem klap z katalogów, napowietrzaniem i raportem PDF.
            </p>
            <Link
              href="/narzedzia/kalkulatory/cnbop"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              Kalkulator CNBOP
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
