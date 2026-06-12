"use client";

import React from "react";
import { Step1Data, Step4Data, AeHelperState, CompOpeningType, toNum, toStr } from "@/lib/calculations/cnbop";
import Tooltip from "@/components/Calculators/ui/Tooltip";
import UnitInput from "@/components/Calculators/ui/UnitInput";
import { AlertTriangleIcon } from "@/components/Calculators/ui/Icons";
import VentCatalog from "@/components/Calculators/cnbop/VentCatalog";

interface Step4Props {
  systemType: "GRAVITATIONAL" | "MECHANICAL";
  step1Data: Step1Data;
  data: Step4Data;
  setData: React.Dispatch<React.SetStateAction<Step4Data>>;
  aeHelper: AeHelperState;
  setAeHelper: React.Dispatch<React.SetStateAction<AeHelperState>>;
  actualVent: { Acz: number; Ageom: number };
  requiredAcz: number;
}

export default function Step4({ systemType, step1Data, data, setData, aeHelper, setAeHelper, actualVent, requiredAcz }: Step4Props) {
  const handleCatalogSelect = (Aa: number, Av: number, count: number, dimA_m: number, dimB_m: number) => {
    const cv = Aa / Av;
    const cvStr = cv.toFixed(3).replace(".", ",");
    setData(p => ({
      ...p,
      ventInputMethod: "acz_cv" as const,
      // dimensions tab
      ventWidth:  dimA_m.toFixed(2).replace(".", ","),
      ventHeight: dimB_m.toFixed(2).replace(".", ","),
      count: String(count),
      // geom_cv tab (total geometric area)
      ventAgeom: toStr(Math.round(Av * count * 1000) / 1000),
      // acz_cv tab (total aerodynamic area)
      ventAcz: toStr(Math.round(Aa * count * 1000) / 1000),
      cv: cvStr,
    }));
  };
  const switchArrangement = (to: "parallel" | "series") => {
    setData(p => {
      const all = p.compGroups.flatMap(g => g.openings);
      const safe = all.length > 0 ? all : [{ id: Date.now(), type: "door_single" as CompOpeningType, w: "", h: "", area: "" }];
      const newGroups = to === "parallel"
        ? safe.map((o, i) => ({ id: Date.now() + i, openings: [o], distances: [] as string[] }))
        : [{ id: Date.now(), openings: safe, distances: safe.slice(1).map(() => "") }];
      return { ...p, compArrangement: to, compGroups: newGroups };
    });
  };

  const addOpening = () => {
    const id = Date.now();
    const newO = { id, type: "door_single" as CompOpeningType, w: "", h: "", area: "" };
    if (data.compArrangement === "parallel") {
      setData(p => ({ ...p, compGroups: [...p.compGroups, { id: id - 1, openings: [newO], distances: [] }] }));
    } else {
      setData(p => ({
        ...p,
        compGroups: [{ ...p.compGroups[0], openings: [...p.compGroups[0].openings, newO], distances: [...p.compGroups[0].distances, ""] }],
      }));
    }
  };

  const removeOpening = (oid: number) => {
    if (data.compArrangement === "parallel") {
      setData(p => ({ ...p, compGroups: p.compGroups.filter(g => !g.openings.some(o => o.id === oid)) }));
    } else {
      setData(p => {
        const g = p.compGroups[0];
        const idx = g.openings.findIndex(o => o.id === oid);
        return {
          ...p,
          compGroups: [{
            ...g,
            openings: g.openings.filter(o => o.id !== oid),
            distances: g.distances.filter((_, i) => i !== (idx < g.distances.length ? idx : idx - 1)),
          }],
        };
      });
    }
  };

  const updateOpening = (oid: number, field: string, val: string) => {
    setData(p => ({
      ...p,
      compGroups: p.compGroups.map(g => ({ ...g, openings: g.openings.map(o => o.id !== oid ? o : { ...o, [field]: val }) })),
    }));
  };

  const changeOpeningType = (oid: number, type: CompOpeningType) => {
    setData(p => ({
      ...p,
      compGroups: p.compGroups.map(g => ({ ...g, openings: g.openings.map(o => o.id !== oid ? o : { ...o, type }) })),
    }));
  };

  const updateDistance = (idx: number, val: string) => {
    setData(p => ({
      ...p,
      compGroups: [{ ...p.compGroups[0], distances: p.compGroups[0].distances.map((d, i) => i === idx ? val : d) }],
    }));
  };

  const ventMethods = [
    { value: "dimensions", label: <span>Wymiary i współczynnik C<sub>v</sub></span> },
    { value: "geom_cv", label: <span>Pow. geometryczna A<sub>geom</sub> i C<sub>v</sub></span> },
    { value: "acz_cv", label: <span>Pow. czynna A<sub>cz</sub> i C<sub>v</sub></span> },
  ];

  const isGrav = systemType === "GRAVITATIONAL";

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] px-4 py-3.5">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${isGrav ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" : "bg-primary/10 text-primary"}`}>
          {isGrav ? "G" : "M"}
        </span>
        <div>
          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Zalecany typ systemu</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {isGrav ? "Oddymianie grawitacyjne" : "System z nawiewem mechanicznym"}
          </p>
        </div>
      </div>

      <div>
        {/* Smoke vent selection */}
        <div className="mb-8 border-b border-slate-100 dark:border-slate-800 pb-8">
          <div>
            <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-5">Dobrana klapa dymowa</h4>
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 mb-5">
              {ventMethods.map(({ value, label }) => (
                <label
                  key={value}
                  className={`flex-1 flex cursor-pointer items-center justify-center gap-3 rounded-xl border p-3.5 transition ${
                    data.ventInputMethod === value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-slate-200 text-slate-600 hover:bg-white dark:border-slate-700"
                  }`}
                >
                  <input type="radio" checked={data.ventInputMethod === value} onChange={() => setData(p => ({ ...p, ventInputMethod: value as any }))} className="hidden" />
                  <span className="text-sm font-medium text-center">{label}</span>
                </label>
              ))}
            </div>

            {data.ventInputMethod === "dimensions" ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-in">
                <UnitInput label="Szerokość klapy" unit="m" value={data.ventWidth} onChange={(val) => setData(p => ({ ...p, ventWidth: val }))} placeholder="np. 1,00" />
                <UnitInput label="Wysokość klapy" unit="m" value={data.ventHeight} onChange={(val) => setData(p => ({ ...p, ventHeight: val }))} placeholder="np. 1,00" />
                <UnitInput label="Współczynnik aerodyn. C_v" unit="-" value={data.cv} onChange={(val) => setData(p => ({ ...p, cv: val }))} placeholder="0,60" />
                <UnitInput label="Liczba sztuk" unit="szt." value={data.count} onChange={(val) => setData(p => ({ ...p, count: val }))} placeholder="1" />
              </div>
            ) : data.ventInputMethod === "geom_cv" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                <UnitInput label="Pow. geometryczna klapy (A_geom)" unit="m²" value={data.ventAgeom} onChange={(val) => setData(p => ({ ...p, ventAgeom: val }))} placeholder="np. 1,00" />
                <UnitInput label="Współczynnik aerodyn. (C_v)" unit="-" value={data.cv} onChange={(val) => setData(p => ({ ...p, cv: val }))} placeholder="0,60" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                <UnitInput label="Pow. czynna klapy (A_cz)" unit="m²" value={data.ventAcz} onChange={(val) => setData(p => ({ ...p, ventAcz: val }))} placeholder="np. 0,60" />
                <UnitInput label="Współczynnik aerodyn. (C_v)" unit="-" value={data.cv} onChange={(val) => setData(p => ({ ...p, cv: val }))} placeholder="0,60" />
              </div>
            )}

            {actualVent.Acz > 0 && (
              <div className="mt-5 rounded-xl bg-blue-50 border border-blue-200 p-3.5 text-blue-800 text-xs font-semibold dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300">
                Dobrana klapa: pow. czynna A<sub>cz</sub> = {toStr(actualVent.Acz)} m² | pow. geometryczna A<sub>geom</sub> = {toStr(actualVent.Ageom)} m²
              </div>
            )}

            <VentCatalog requiredAcz={requiredAcz} onSelect={handleCatalogSelect} />
          </div>
        </div>

        {/* Gravitational: compensation */}
        {systemType === "GRAVITATIONAL" ? (
          <div className="space-y-6">
            <div>
              <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-5">Urządzenia do napowietrzania</h4>

              <div className="flex flex-col sm:flex-row gap-4 mb-5">
                {[
                  { value: "known_acz", label: <span>Znam pow. czynną (A<sub>cz</sub>)</span> },
                  { value: "calculate", label: <span>Oblicz z pow. geometrycznej (A<sub>geom</sub>)</span> },
                ].map(({ value, label }) => (
                  <label
                    key={value}
                    className={`flex-1 flex cursor-pointer items-center justify-center gap-3 rounded-xl border p-3.5 transition ${
                      data.compInputMethod === value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-slate-200 text-slate-600 hover:bg-white dark:border-slate-700"
                    }`}
                  >
                    <input type="radio" checked={data.compInputMethod === value} onChange={() => setData(p => ({ ...p, compInputMethod: value as any }))} className="hidden" />
                    <span className="text-sm font-bold">{label}</span>
                  </label>
                ))}
              </div>

              <div className="space-y-4 animate-fade-in">
                {/* Arrangement toggle — applies to both methods */}
                <div className="flex gap-3">
                  {([
                    { value: "parallel", label: "Bezpośrednio z zewnątrz",      desc: "Otwory napowietrzają wprost z zewnątrz budynku — powierzchnie sumowane" },
                    { value: "series",   label: "Przez pomieszczenie pośrednie", desc: "np. hall, przedsionek — klatka → pomieszczenie → zewnątrz" },
                  ] as const).map(({ value, label, desc }) => (
                    <button
                      key={value}
                      onClick={() => switchArrangement(value)}
                      className={`flex-1 rounded-xl border p-3.5 text-left transition ${
                        data.compArrangement === value
                          ? "border-primary bg-primary/5"
                          : "border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <p className={`text-sm font-semibold ${data.compArrangement === value ? "text-primary" : "text-slate-700 dark:text-slate-200"}`}>{label}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>
                    </button>
                  ))}
                </div>

                {/* PN norm note for series >2 */}
                {data.compArrangement === "series" && (() => {
                  const count = data.compGroups[0]?.openings.length ?? 0;
                  return count > 2 ? (
                    <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 p-3">
                      <AlertTriangleIcon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
                        Dla więcej niż 2 otworów w szeregu wytyczne CNBOP nie mają zastosowania — obliczenia prowadzone wg <strong>PN-B-02877-4:2020-07</strong> (ta sama formuła hydrauliczna).
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      Do 2 otworów — wytyczne CNBOP-PIB W-0003:2016. Powyżej — PN-B-02877-4:2020-07.
                    </p>
                  );
                })()}

                {/* Opening rows */}
                {(() => {
                  const openings = data.compArrangement === "parallel"
                    ? data.compGroups.map(g => g.openings[0]).filter(Boolean)
                    : (data.compGroups[0]?.openings ?? []);
                  const distances = data.compGroups[0]?.distances ?? [];
                  const canRemove = openings.length > 1;

                  return (
                    <div className="space-y-1">
                      {openings.map((opening, oi) => (
                        <div key={opening.id}>
                          <div className="flex flex-wrap gap-2 items-end py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">

                            {/* Type selector — only in calculate mode */}
                            {data.compInputMethod === "calculate" && (
                              <div className="flex-none">
                                <label className="block text-[11px] font-medium text-slate-500 mb-1">Typ</label>
                                <select
                                  value={opening.type}
                                  onChange={(e) => changeOpeningType(opening.id, e.target.value as CompOpeningType)}
                                  className="text-sm rounded-lg border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-600 dark:bg-[#1E2342] outline-none focus:border-primary"
                                >
                                  <option value="door_single">Drzwi 1-skrzydłowe</option>
                                  <option value="door_double">Drzwi 2-skrzydłowe</option>
                                  <option value="window">Okno</option>
                                  <option value="louvre">Żaluzja/Kratka</option>
                                  <option value="other">Inny otwór</option>
                                </select>
                              </div>
                            )}

                            {/* Area inputs — adapt per method */}
                            {data.compInputMethod === "known_acz" ? (
                              <UnitInput
                                label="Pow. czynna (A_cz)"
                                unit="m²" value={opening.area}
                                onChange={(val) => updateOpening(opening.id, "area", val)}
                                placeholder="np. 1,20" className="w-36"
                              />
                            ) : (opening.type === "door_single" || opening.type === "door_double") ? (
                              <>
                                <UnitInput
                                  label={opening.type === "door_double" ? "Szer. skrzydła" : "Szerokość"}
                                  unit="m" value={opening.w}
                                  onChange={(val) => updateOpening(opening.id, "w", val)}
                                  placeholder="0,90" className="w-24"
                                />
                                <UnitInput
                                  label="Wysokość"
                                  unit="m" value={opening.h}
                                  onChange={(val) => updateOpening(opening.id, "h", val)}
                                  placeholder="2,00" className="w-24"
                                />
                              </>
                            ) : (
                              <UnitInput
                                label="Pow. efektywna"
                                unit="m²" value={opening.area}
                                onChange={(val) => updateOpening(opening.id, "area", val)}
                                placeholder="np. 1,00" className="w-32"
                              />
                            )}

                            {canRemove && (
                              <button
                                onClick={() => removeOpening(opening.id)}
                                className="self-end mb-0.5 text-red-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>

                          {data.compArrangement === "series" && oi < openings.length - 1 && (
                            <div className="flex items-center gap-3 my-1.5 px-3">
                              <div className="flex-1 border-t border-dashed border-slate-200 dark:border-slate-700" />
                              <div className="shrink-0">
                                <UnitInput
                                  label="Odległość między otworami"
                                  unit="m" value={distances[oi] ?? ""}
                                  onChange={(val) => updateDistance(oi, val)}
                                  placeholder="np. 3,50" className="w-40"
                                />
                                {toNum(distances[oi]) > 5 && (
                                  <p className="text-[11px] font-medium text-red-500 flex items-center gap-1 mt-1">
                                    <AlertTriangleIcon className="w-3 h-3" /> &gt;5 m → wymagane CFD (rozdz. 7.1)
                                  </p>
                                )}
                              </div>
                              <div className="flex-1 border-t border-dashed border-slate-200 dark:border-slate-700" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                <button
                  onClick={addOpening}
                  className="w-full py-2.5 text-sm font-medium border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 hover:border-primary hover:text-primary rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  {data.compArrangement === "parallel" ? "Dodaj kolejny otwór" : "Dodaj otwór w szeregu"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Mechanical: leakage area + fan pressure */
          <div className="space-y-8 md:space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-3">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Efektywna pow. nieszczelności (<Tooltip text="Suma nieszczelności przegród klatki.">A<sub>e</sub></Tooltip>)
                  </label>
                  <button
                    onClick={() => setAeHelper(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className="text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 py-1.5 px-3 rounded-lg hover:border-slate-300 dark:hover:border-slate-600 transition-colors self-start sm:self-auto"
                  >
                    {aeHelper.enabled ? "Zamknij Asystenta" : "Otwórz Asystenta Ae"}
                  </button>
                </div>
                <UnitInput
                  value={data.Ae}
                  onChange={(val) => setData(p => ({ ...p, Ae: val }))}
                  disabled={aeHelper.enabled}
                  unit="m²"
                  placeholder="0,00"
                  className="disabled:opacity-60"
                  required
                />
              </div>
              {!step1Data.selfClosers && (
                <div className="rounded-xl bg-amber-50 p-5 md:p-6 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 flex flex-col justify-center">
                  <UnitInput
                    label="Pow. największego otwartego skrzydła (A_drzwi)"
                    unit="m²"
                    value={data.openDoorArea}
                    onChange={(val) => setData(p => ({ ...p, openDoorArea: val }))}
                    placeholder="np. 1,80"
                    required
                  />
                </div>
              )}
            </div>

            {/* Ae assistant */}
            {aeHelper.enabled && (
              <div className="animate-fade-in border-l-2 border-slate-200 dark:border-slate-700 pl-5 space-y-8">
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Asystent obliczania pow. nieszczelności (A<sub>e</sub>)
                </h4>
                <div className="space-y-6">
                  <div>
                    <h5 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4">1. Zamknięte drzwi</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                      <UnitInput label="1-skrz. do wewnątrz" unit="szt." value={aeHelper.doorsIn} onChange={(val) => setAeHelper(p => ({ ...p, doorsIn: val }))} className="text-sm py-2 px-3" />
                      <UnitInput label="1-skrz. na zewnątrz" unit="szt." value={aeHelper.doorsOut} onChange={(val) => setAeHelper(p => ({ ...p, doorsOut: val }))} className="text-sm py-2 px-3" />
                      <UnitInput label="Dwuskrzydłowe" unit="szt." value={aeHelper.doorsDouble} onChange={(val) => setAeHelper(p => ({ ...p, doorsDouble: val }))} className="text-sm py-2 px-3" />
                      <UnitInput label="Drzwi windy" unit="szt." value={aeHelper.doorsElevator} onChange={(val) => setAeHelper(p => ({ ...p, doorsElevator: val }))} className="text-sm py-2 px-3" />
                    </div>
                  </div>
                  <div>
                    <h5 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4">2. Zamknięte okna</h5>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
                      <UnitInput label="Długość szczelin (obwód)" unit="m" value={aeHelper.windowLength} onChange={(val) => setAeHelper(p => ({ ...p, windowLength: val }))} className="text-sm py-2 px-3" />
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Szczelność okien</label>
                        <select
                          value={aeHelper.windowType}
                          onChange={(e) => setAeHelper(p => ({ ...p, windowType: e.target.value as any }))}
                          className="w-full text-sm rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-[#1E2342] outline-none focus:border-primary"
                        >
                          <option value="sealed">Rozwierane z uszczelką</option>
                          <option value="unsealed">Rozwierane bez uszczelki</option>
                          <option value="sliding">Przesuwne</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h5 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4">3. Ściany i stropy</h5>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-6 md:gap-y-8">
                      {([
                        { key: "wallExtArea", tKey: "wallExtTightness", label: "Ściany zewnętrzne", opts: [{ v: "tight", l: "Szczelna (7,0×10⁻⁵ m²/m²)" }, { v: "average", l: "Przeciętna (2,1×10⁻³ m²/m²)" }, { v: "leaky", l: "Nieszczelna (4,2×10⁻³ m²/m²)" }, { v: "very_leaky", l: "B. nieszczelna (1,3×10⁻² m²/m²)" }] },
                        { key: "wallIntArea", tKey: "wallIntTightness", label: "Ściany wewnętrzne", opts: [{ v: "tight", l: "Szczelna (1,4×10⁻⁵ m²/m²)" }, { v: "average", l: "Przeciętna (1,1×10⁻³ m²/m²)" }, { v: "leaky", l: "Nieszczelna (3,5×10⁻³ m²/m²)" }] },
                        { key: "wallElevArea", tKey: "wallElevTightness", label: "Szyby windowe", opts: [{ v: "tight", l: "Szczelna (1,8×10⁻³ m²/m²)" }, { v: "average", l: "Przeciętna (8,4×10⁻³ m²/m²)" }, { v: "leaky", l: "Nieszczelna (1,8×10⁻² m²/m²)" }] },
                      ] as { key: keyof AeHelperState; tKey: keyof AeHelperState; label: string; opts: { v: string; l: string }[] }[]).map(({ key, tKey, label, opts }) => (
                        <div key={key} className="bg-white dark:bg-[#111827] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                          <UnitInput label={label} unit="m²" value={aeHelper[key] as string} onChange={(val) => setAeHelper(p => ({ ...p, [key]: val }))} className="text-sm py-2 px-3 mb-2" />
                          <select
                            value={aeHelper[tKey] as string}
                            onChange={(e) => setAeHelper(p => ({ ...p, [tKey]: e.target.value as any }))}
                            className="w-full text-xs rounded border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-[#1E2342] outline-none"
                          >
                            {opts.map(({ v, l }) => <option key={v} value={v}>{l}</option>)}
                          </select>
                        </div>
                      ))}
                      <div className="bg-white dark:bg-[#111827] p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-center">
                        <UnitInput label="Strop najwyższej kond." unit="m²" value={aeHelper.ceilingArea} onChange={(val) => setAeHelper(p => ({ ...p, ceilingArea: val }))} className="text-sm py-2 px-3" />
                      </div>
                    </div>
                  </div>
                  <div className="pt-2">
                    <UnitInput label="Inne nieszczelności i kratki transferowe" unit="m²" value={aeHelper.otherAe} onChange={(val) => setAeHelper(p => ({ ...p, otherAe: val }))} className="text-sm py-2 px-3 lg:w-1/2" />
                  </div>
                </div>
              </div>
            )}

            {/* Fan pressure */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-5">
                Wyrzut i spręż wentylatora (<Tooltip text="Określa opory trasy hydraulicznej.">ΔP sieci</Tooltip>)
              </h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Typ instalacji tłocznej</label>
                  <select
                    value={data.installationType}
                    onChange={(e) => setData(p => ({ ...p, installationType: e.target.value as any }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-primary dark:border-slate-700 dark:bg-[#1E2342]"
                  >
                    <option value="wall">Wyrzut Ścienny (Bezpośredni, 0 Pa)</option>
                    <option value="ducted">Wyrzut Kanałowy (Wymaga obliczenia strat)</option>
                  </select>
                </div>
                <UnitInput
                  label="Opory i straty tłoczne kanału"
                  unit="Pa"
                  disabled={data.installationType === "wall"}
                  value={data.ductPressureLoss}
                  onChange={(val) => setData(p => ({ ...p, ductPressureLoss: val }))}
                  placeholder="0"
                  className="disabled:bg-slate-50 dark:disabled:bg-[#1C213E]"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

