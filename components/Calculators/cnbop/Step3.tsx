"use client";

import React from "react";

interface Step3Props {
  systemType: "GRAVITATIONAL" | "MECHANICAL";
  justification: string;
}

export default function Step3({ systemType, justification }: Step3Props) {
  const isGrav = systemType === "GRAVITATIONAL";

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="rounded-xl bg-white p-6 md:p-8 border border-slate-200 dark:bg-[#111827] dark:border-slate-800">
        <h2 className="mb-6 text-base md:text-lg font-semibold text-slate-900 dark:text-white">
          Krok 3: Wymagany Typ Systemu
        </h2>
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-5 mb-6 md:mb-8 pb-6 md:pb-8 border-b border-primary/10">
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold shrink-0 ${
                isGrav ? "bg-amber-100 text-amber-600" : "bg-primary/10 text-primary"
              }`}
            >
              {isGrav ? "G" : "M"}
            </span>
            <p className="text-center md:text-left text-lg md:text-xl font-semibold text-slate-900 dark:text-white">
              {isGrav ? "Oddymianie Grawitacyjne" : "System z Nawiewem Mechanicznym"}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-[#1E2342] p-5 md:p-6 border border-slate-200 dark:border-slate-800">
            <p className="text-sm md:text-base leading-relaxed text-slate-700 dark:text-slate-300">
              <strong>Uzasadnienie wg rozdz. 4 CNBOP:</strong> {justification}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

