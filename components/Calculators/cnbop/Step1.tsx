"use client";

import React from "react";
import { Step1Data, toNum } from "@/lib/calculations/cnbop";
import Tooltip from "@/components/Calculators/ui/Tooltip";
import UnitInput from "@/components/Calculators/ui/UnitInput";
import { HeightIcon, AlertTriangleIcon } from "@/components/Calculators/ui/Icons";

const categories = [
  { value: "ZL_I", label: "ZL I (Użyteczność publ. >50 os.)" },
  { value: "ZL_II", label: "ZL II (Zdrowie, Przedszkola)" },
  { value: "ZL_III", label: "ZL III (Inne użyteczności publ.)" },
  { value: "ZL_IV", label: "ZL IV (Mieszkalne)" },
  { value: "ZL_V", label: "ZL V (Zamieszkania zbiorowego)" },
  { value: "PM", label: "PM (Produkcyjno-Magazynowe)" },
];

const enclosures = [
  { value: "ppoż", label: "Klatka wydzielona (obudowana z drzwiami min. EI 30)" },
  { value: "non-ppoż", label: "Klatka niewydzielona (brak obudowy lub certyfikowanych drzwi)" },
];

interface Step1Props {
  data: Step1Data;
  onChange: (key: keyof Step1Data, value: any) => void;
  allowedBuildingTypes: string[];
}

export default function Step1({ data, onChange, allowedBuildingTypes }: Step1Props) {
  const heightGroup = data.buildingHeightGroup;
  const heightGroupLabel =
    heightGroup === "N" ? "Niski (N)" :
    heightGroup === "SW" ? "Średniowysoki (SW)" :
    heightGroup === "W" ? "Wysoki (W)" : "Wysokościowy (WW)";

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
          {/* Category + staircase type */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                <Tooltip text="Przeznaczenie i sposób użytkowania wg WT.">Kategoria zagrożenia ludzi (ZL)</Tooltip>
              </label>
              <select
                value={data.categoryZL}
                onChange={(e) => onChange("categoryZL", e.target.value as any)}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-[#1E2342]"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                <Tooltip text="Definiuje prawne minima dla gabarytów schodów i spoczników wg WT § 68. Opcje dopasowują się do wybranej kategorii ZL.">Rygor wymiarowy schodów</Tooltip>
              </label>
              <select
                value={data.buildingTypeWT}
                onChange={(e) => onChange("buildingTypeWT", e.target.value as any)}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-[#1E2342]"
              >
                <option value="standard">Standard (bieg 1,2 m, spocznik 1,5 m)</option>
                <option value="nursery" disabled={!allowedBuildingTypes.includes("nursery")}>
                  Przedszkola i żłobki (bieg 1,2 m, spocznik 1,3 m)
                </option>
                <option value="healthcare" disabled={!allowedBuildingTypes.includes("healthcare")}>
                  Budynki opieki zdrowotnej (bieg 1,4 m, spocznik 1,5 m)
                </option>
                <option value="single_family" disabled={!allowedBuildingTypes.includes("single_family")}>
                  Jednorodzinne / zabudowa zagrodowa (bieg 0,8 m, spocznik 0,8 m)
                </option>
                <option value="garage">Garaże / usługi ≤10 os. (bieg 0,9 m, spocznik 0,9 m)</option>
              </select>
            </div>
          </div>

          {/* Height */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            <UnitInput
              label={data.categoryZL === "ZL_IV" ? "Wysokość w kondygnacjach nadziemnych" : "Wysokość budynku"}
              unit={data.categoryZL === "ZL_IV" ? "kond." : "m"}
              required
              value={data.buildingHeightValue}
              onChange={(val) => onChange("buildingHeightValue", val)}
            />
            {data.categoryZL === "ZL_IV" ? (
              <div>
                <UnitInput
                  label="Kondygnacje podziemne klatki schodowej"
                  tooltip="Liczba kondygnacji poniżej poziomu terenu obsługiwanych przez tę klatkę. Suma z kondygnacjami nadziemnymi daje łączną liczbę kondygnacji."
                  unit="kond."
                  value={data.numberOfFloorsBelow}
                  onChange={(val) => onChange("numberOfFloorsBelow", val)}
                  placeholder="np. 1"
                />
                {data.numberOfFloorsTotal > 0 && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    Łącznie: <strong className="text-primary">{data.numberOfFloorsTotal}</strong> kond.{" "}
                    (nadziemne: {data.numberOfFloorsAbove} + podziemne: {data.numberOfFloorsBelow})
                  </p>
                )}
              </div>
            ) : (
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Tooltip text="Łączna liczba kondygnacji obsługiwanych przez system — kluczowa do wyznaczenia ciśnień.">
                    Kondygnacje klatki schodowej
                  </Tooltip>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <UnitInput
                    label="Nadziemne"
                    unit="kond."
                    value={data.numberOfFloorsAbove}
                    onChange={(val) => onChange("numberOfFloorsAbove", val)}
                    placeholder="np. 5"
                  />
                  <UnitInput
                    label="Podziemne"
                    unit="kond."
                    value={data.numberOfFloorsBelow}
                    onChange={(val) => onChange("numberOfFloorsBelow", val)}
                    placeholder="np. 1"
                  />
                </div>
                {data.numberOfFloorsTotal > 0 && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    Łącznie: <strong className="text-primary">{data.numberOfFloorsTotal}</strong> kondygnacji
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Height group banner */}
          {toNum(data.buildingHeightValue) > 0 && (
            <div className="rounded-xl bg-primary/5 p-4 md:p-5 border border-primary/10 flex items-center gap-3.5 animate-fade-in">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <HeightIcon className="h-4 w-4 text-primary" />
              </span>
              <p className="text-sm md:text-base font-semibold text-primary">
                Klasyfikacja wysokości § 8 WT: <strong>{heightGroupLabel}</strong>
              </p>
            </div>
          )}

          {/* CNBOP inapplicability warning */}
          {toNum(data.buildingHeightValue) > 0 && (
            (data.buildingHeightGroup === "WW") ||
            (data.buildingHeightGroup === "W" && !["ZL_IV", "PM"].includes(data.categoryZL))
          ) && (
            <div className="rounded-xl border border-red-300 dark:border-red-700/50 bg-red-50 dark:bg-red-950/30 p-4 md:p-5 flex items-start gap-3.5 animate-fade-in">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/40 mt-0.5">
                <AlertTriangleIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
              </span>
              <div>
                <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">
                  Wytyczne CNBOP-PIB W-0003:2016 nie mają tu zastosowania
                </p>
                <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
                  Klatki schodowe w budynku{" "}
                  {data.buildingHeightGroup === "WW" ? "wysokościowym (WW)" : `wysokim (W) kategorii ${data.categoryZL.replace("_", " ")}`}{" "}
                  powinny być wyposażone w urządzenia zapobiegające zadymieniu wg odrębnych przepisów{" "}
                  (§ 245 WT, rozdz. 1 CNBOP). Obliczenia na niniejszym kalkulatorze mają charakter poglądowy.
                </p>
              </div>
            </div>
          )}

          {/* Stairwell enclosure */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Wydzielenie pożarowe klatki schodowej
            </label>
            <select
              value={data.stairwellEnclosure}
              onChange={(e) => onChange("stairwellEnclosure", e.target.value as any)}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-[#1E2342]"
            >
              {enclosures.map((enc) => (
                <option key={enc.value} value={enc.value}>{enc.label}</option>
              ))}
            </select>
          </div>

          {/* Checkboxes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
              <input
                type="checkbox"
                checked={data.expandsEvacuation}
                onChange={(e) => onChange("expandsEvacuation", e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Powiększanie dojścia ewakuacyjnego
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Czy system służy do powiększania prawnej długości dojścia w budynku?
                </p>
              </div>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
              <input
                type="checkbox"
                checked={data.selfClosers}
                onChange={(e) => onChange("selfClosers", e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Wyposażenie drzwi w samozamykacze
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Czy wszystkie drzwi prowadzące na klatkę schodową (w tym wyjściowe) posiadają sprawne samozamykacze?
                </p>
              </div>
            </label>
          </div>

          {/* No self-closers warning */}
          {!data.selfClosers && (
            <div className="rounded-xl bg-amber-50 p-4 md:p-5 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 flex items-start gap-3.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40 mt-0.5">
                <AlertTriangleIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </span>
              <p className="text-xs md:text-sm text-amber-900 dark:text-amber-300 leading-relaxed">
                Brak pełnego zestawu samozamykaczy wymusza obliczanie dodatkowego strumienia ucieczki (V<sub>n_v</sub>){" "}
                wg rozdz. 6.4.3. Skutkuje to wyższą wymaganą mocą wentylatora.
              </p>
            </div>
          )}
    </div>
  );
}

