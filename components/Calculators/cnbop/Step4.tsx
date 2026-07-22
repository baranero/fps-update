"use client";

import React from "react";
import {
  Step1Data, Step4Data, AeHelperState, CompOpeningType,
  VentUnit, VentInputMethod, VentSizeMethod, defaultVent, isVentEmpty, ventUnitAreas,
  toNum, toStr,
} from "@/lib/calculations/cnbop";
import Tooltip from "@/components/Calculators/ui/Tooltip";
import UnitInput from "@/components/Calculators/ui/UnitInput";
import { AlertTriangleIcon, TrashIcon } from "@/components/Calculators/ui/Icons";
import VentCatalog from "@/components/Calculators/cnbop/VentCatalog";

interface Step4Props {
  systemType: "GRAVITATIONAL" | "MECHANICAL";
  recommendedSystemType: "GRAVITATIONAL" | "MECHANICAL";
  step1Data: Step1Data;
  data: Step4Data;
  setData: React.Dispatch<React.SetStateAction<Step4Data>>;
  aeHelper: AeHelperState;
  setAeHelper: React.Dispatch<React.SetStateAction<AeHelperState>>;
  actualVent: { Acz: number; Ageom: number };
  requiredAcz: number;
}

export default function Step4({ systemType, recommendedSystemType, step1Data, data, setData, aeHelper, setAeHelper, actualVent, requiredAcz }: Step4Props) {
  // Clicking the recommended type clears the override (back to auto); the other sets an explicit override.
  const chooseSystemType = (t: "GRAVITATIONAL" | "MECHANICAL") =>
    setData(p => ({ ...p, systemTypeOverride: t === recommendedSystemType ? null : t }));
  const handleCatalogSelect = (Aa: number, Av: number, count: number, dimA_m: number, dimB_m: number) => {
    const cv = Av > 0 ? Aa / Av : 0.6;
    const newVent: VentUnit = {
      id: Date.now(),
      inputMethod: "acz_cv",
      sizeMethod: "dimensions",
      width:  dimA_m.toFixed(2).replace(".", ","),
      height: dimB_m.toFixed(2).replace(".", ","),
      count: String(count),
      cv: cv.toFixed(3).replace(".", ","),
      // total geometric / aerodynamic area for the whole set
      ageom: toStr(Math.round(Av * count * 1000) / 1000),
      acz:   toStr(Math.round(Aa * count * 1000) / 1000),
    };
    // Replace the last klapa if it's still empty, otherwise append a new one.
    setData(p => {
      const vents = [...p.vents];
      const last = vents[vents.length - 1];
      if (last && isVentEmpty(last)) vents[vents.length - 1] = newVent;
      else vents.push(newVent);
      return { ...p, vents };
    });
  };

  const addVent = () => setData(p => ({ ...p, vents: [...p.vents, defaultVent(Date.now())] }));

  const removeVent = (id: number) =>
    setData(p => ({ ...p, vents: p.vents.length > 1 ? p.vents.filter(v => v.id !== id) : p.vents }));

  const updateVent = (id: number, field: keyof VentUnit, val: string) =>
    setData(p => ({ ...p, vents: p.vents.map(v => (v.id === id ? { ...v, [field]: val } : v)) }));

  const changeVentMethod = (id: number, method: VentInputMethod) =>
    setData(p => ({ ...p, vents: p.vents.map(v => (v.id === id ? { ...v, inputMethod: method } : v)) }));

  const changeVentSizeMethod = (id: number, sizeMethod: VentSizeMethod) =>
    setData(p => ({ ...p, vents: p.vents.map(v => (v.id === id ? { ...v, sizeMethod } : v)) }));
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
    { value: "size_acz", label: <span>Rozmiar + pow. czynna A<sub>cz</sub></span> },
  ];

  const isGrav = systemType === "GRAVITATIONAL";
  const isOverridden = systemType !== recommendedSystemType;
  const recLabel = recommendedSystemType === "GRAVITATIONAL" ? "oddymianie grawitacyjne" : "system z nawiewem mechanicznym";
  const curLabel = isGrav ? "oddymianie grawitacyjne" : "system z nawiewem mechanicznym";

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${isGrav ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" : "bg-primary/10 text-primary"}`}>
              {isGrav ? "G" : "M"}
            </span>
            <div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {isOverridden ? "Typ systemu — zmieniony ręcznie" : "Zalecany typ systemu"}
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {isGrav ? "Oddymianie grawitacyjne" : "System z nawiewem mechanicznym"}
              </p>
            </div>
          </div>

          {/* Manual override toggle */}
          <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 shrink-0">
            {([
              { value: "GRAVITATIONAL" as const, label: "Grawitacyjny" },
              { value: "MECHANICAL" as const, label: "Mechaniczny" },
            ]).map(({ value, label }) => {
              const selected = systemType === value;
              return (
                <button
                  key={value}
                  onClick={() => chooseSystemType(value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    selected
                      ? "bg-white dark:bg-[#111827] text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  {label}
                  {value === recommendedSystemType && (
                    <span className={`ml-1 text-[10px] font-medium ${selected ? "text-primary" : "text-slate-400"}`}>• zalecany</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {isOverridden && (
          <div className="mt-3 flex items-start gap-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 animate-fade-in">
            <AlertTriangleIcon className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
              <p className="font-semibold">Ręczna zmiana typu systemu oddymiania</p>
              <p className="mt-0.5">
                Dobór wg CNBOP-PIB W-0003:2016 dla tego obiektu wskazuje <strong>{recLabel}</strong>.
                Wymuszasz <strong>{curLabel}</strong> — stosuj wyłącznie przy świadomym uzasadnieniu projektowym;
                wynik może nie spełniać wymagań przepisów.
              </p>
              <button
                onClick={() => chooseSystemType(recommendedSystemType)}
                className="mt-1.5 font-semibold underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200"
              >
                Przywróć zalecany ({recommendedSystemType === "GRAVITATIONAL" ? "grawitacyjny" : "mechaniczny"})
              </button>
            </div>
          </div>
        )}
      </div>

      <div>
        {/* Smoke vents (klapy) — multiple dampers, areas summed */}
        <div className="mb-8 border-b border-slate-100 dark:border-slate-800 pb-8">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
              <div>
                <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Dobrane klapy dymowe</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Dodaj każdą klapę osobno — powierzchnie czynne (A<sub>cz</sub>) wszystkich klap są sumowane.
                </p>
              </div>
              {data.vents.length > 1 && (
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">
                  {data.vents.length} klapy
                </span>
              )}
            </div>

            <div className="space-y-4">
              {data.vents.map((vent, vi) => {
                const areas = ventUnitAreas(vent);
                const canRemove = data.vents.length > 1;
                return (
                  <div key={vent.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 md:p-5 animate-fade-in">
                    <div className="flex items-center justify-between mb-4">
                      <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[11px] font-bold text-primary">
                          {vi + 1}
                        </span>
                        Klapa {vi + 1}
                      </span>
                      {canRemove && (
                        <button
                          onClick={() => removeVent(vent.id)}
                          className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          aria-label={`Usuń klapę ${vi + 1}`}
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 mb-4">
                      {ventMethods.map(({ value, label }) => (
                        <label
                          key={value}
                          className={`flex-1 flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2.5 transition ${
                            vent.inputMethod === value
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/40"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`ventMethod-${vent.id}`}
                            checked={vent.inputMethod === value}
                            onChange={() => changeVentMethod(vent.id, value as VentInputMethod)}
                            className="hidden"
                          />
                          <span className="text-xs font-medium text-center">{label}</span>
                        </label>
                      ))}
                    </div>

                    {vent.inputMethod === "dimensions" ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-in">
                        <UnitInput label="Szerokość klapy" unit="m" value={vent.width} onChange={(val) => updateVent(vent.id, "width", val)} placeholder="np. 1,00" />
                        <UnitInput label="Wysokość klapy" unit="m" value={vent.height} onChange={(val) => updateVent(vent.id, "height", val)} placeholder="np. 1,00" />
                        <UnitInput label="Współczynnik aerodyn. C_v" unit="-" value={vent.cv} onChange={(val) => updateVent(vent.id, "cv", val)} placeholder="0,60" />
                        <UnitInput label="Liczba sztuk" unit="szt." value={vent.count} onChange={(val) => updateVent(vent.id, "count", val)} placeholder="1" />
                      </div>
                    ) : vent.inputMethod === "geom_cv" ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                        <UnitInput label="Pow. geometryczna klapy (A_geom)" unit="m²" value={vent.ageom} onChange={(val) => updateVent(vent.id, "ageom", val)} placeholder="np. 1,00" />
                        <UnitInput label="Współczynnik aerodyn. (C_v)" unit="-" value={vent.cv} onChange={(val) => updateVent(vent.id, "cv", val)} placeholder="0,60" />
                      </div>
                    ) : vent.inputMethod === "acz_cv" ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                        <UnitInput label="Pow. czynna klapy (A_cz)" unit="m²" value={vent.acz} onChange={(val) => updateVent(vent.id, "acz", val)} placeholder="np. 0,60" />
                        <UnitInput label="Współczynnik aerodyn. C_v (informacyjnie)" unit="-" value={vent.cv} onChange={(val) => updateVent(vent.id, "cv", val)} placeholder="0,60" />
                      </div>
                    ) : (
                      /* size_acz — rozmiar (wymiary lub pow. geometryczna) + pow. czynna wprost z karty katalogowej */
                      <div className="animate-fade-in space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mr-0.5">Rozmiar podany jako:</span>
                          {([
                            { value: "dimensions" as const, label: "Wymiary" },
                            { value: "geom" as const, label: "Pow. geometryczna" },
                          ]).map(({ value, label }) => (
                            <button
                              key={value}
                              onClick={() => changeVentSizeMethod(vent.id, value)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                vent.sizeMethod === value
                                  ? "border-primary/40 bg-primary/10 text-primary"
                                  : "border-transparent bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {vent.sizeMethod === "geom" ? (
                            <UnitInput label="Pow. geometryczna (A_geom)" unit="m²" value={vent.ageom} onChange={(val) => updateVent(vent.id, "ageom", val)} placeholder="np. 1,40" />
                          ) : (
                            <>
                              <UnitInput label="Szerokość klapy" unit="m" value={vent.width} onChange={(val) => updateVent(vent.id, "width", val)} placeholder="np. 1,40" />
                              <UnitInput label="Wysokość klapy" unit="m" value={vent.height} onChange={(val) => updateVent(vent.id, "height", val)} placeholder="np. 1,00" />
                            </>
                          )}
                          <UnitInput label="Pow. czynna (A_cz)" unit="m²" value={vent.acz} onChange={(val) => updateVent(vent.id, "acz", val)} placeholder="np. 0,98" />
                          <UnitInput label="Liczba sztuk" unit="szt." value={vent.count} onChange={(val) => updateVent(vent.id, "count", val)} placeholder="1" />
                        </div>
                      </div>
                    )}

                    {areas.Acz > 0 && (
                      <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                        A<sub>cz</sub> = <span className="font-semibold text-slate-700 dark:text-slate-300">{toStr(areas.Acz)} m²</span>
                        {" · "}A<sub>geom</sub> = {toStr(areas.Ageom)} m²
                        {vent.inputMethod === "size_acz" && areas.Ageom > 0 && (
                          <>{" · "}C<sub>v</sub> ≈ {toStr(areas.Acz / areas.Ageom)}</>
                        )}
                      </p>
                    )}
                    {vent.inputMethod === "size_acz" && areas.Ageom > 0 && areas.Acz > areas.Ageom && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        <AlertTriangleIcon className="h-3 w-3 shrink-0" />
                        Pow. czynna nie powinna przekraczać pow. geometrycznej.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={addVent}
              className="w-full mt-3 py-2.5 text-sm font-medium border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 hover:border-primary hover:text-primary rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Dodaj kolejną klapę
            </button>

            {actualVent.Acz > 0 && (
              <div className="mt-5 rounded-xl bg-blue-50 border border-blue-200 p-3.5 text-blue-800 text-xs font-semibold dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300">
                {data.vents.length > 1 ? "Suma wszystkich klap: " : "Dobrana klapa: "}
                pow. czynna A<sub>cz</sub> = {toStr(actualVent.Acz)} m² | pow. geometryczna A<sub>geom</sub> = {toStr(actualVent.Ageom)} m²
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

                {data.compArrangement === "series" && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Efektywna pow. szeregu = najmniejszy z otworów (wg CNBOP-PIB W-0003:2016)
                  </p>
                )}

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
                                  label={opening.type === "door_double" ? "Szer. skrzydła 1" : "Szerokość"}
                                  unit="m" value={opening.w}
                                  onChange={(val) => updateOpening(opening.id, "w", val)}
                                  placeholder="0,90" className="w-24"
                                />
                                {opening.type === "door_double" && (
                                  <UnitInput
                                    label="Szer. skrzydła 2"
                                    unit="m" value={opening.w2 ?? ""}
                                    onChange={(val) => updateOpening(opening.id, "w2", val)}
                                    placeholder="= skrz. 1" className="w-24"
                                  />
                                )}
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
                    value={data.Adrzwi}
                    onChange={(val) => setData(p => ({ ...p, Adrzwi: val }))}
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

