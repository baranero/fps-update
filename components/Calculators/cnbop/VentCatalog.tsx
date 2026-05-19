"use client";

import { useState, useMemo, useEffect } from "react";
import { GulajskiVent, gulajskiVents } from "@/lib/data/gulajskiVents";
import { AskonVent, AskonConfig, askonVents, askonAa } from "@/lib/data/askonVents";
import { AwakVent, AwakConfig, awakVents, awakAa } from "@/lib/data/awakVents";

type Producer = "gulajski" | "askon" | "awak";
type SortCol  = "A" | "B" | "Av" | "Aa";
type SortDir  = "asc" | "desc";

interface VentCatalogProps {
  requiredAcz: number;
  onSelect: (Aa: number, Av: number, count: number, dimA_m: number, dimB_m: number) => void;
}

const r3  = (n: number) => Math.round(n * 1000) / 1000;
const fmt = (n: number, d = 3) => n.toFixed(d).replace(".", ",");

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-slate-300 dark:text-slate-600">↕</span>;
  return <span className="ml-1 text-primary">{dir === "asc" ? "↑" : "↓"}</span>;
}

export default function VentCatalog({ requiredAcz, onSelect }: VentCatalogProps) {
  const [isOpen,     setIsOpen]     = useState(false);
  const [producer,   setProducer]   = useState<Producer>("gulajski");

  /* Gulajski filters */
  const [gType,  setGType]  = useState<"all" | "PS" | "P">("all");
  const [gH,     setGH]     = useState<350 | 500>(350);
  const [gMaxA,  setGMaxA]  = useState("");
  const [gMaxB,  setGMaxB]  = useState("");

  /* ASKON filters */
  const [aCfg,  setACfg]  = useState<AskonConfig>("basic");
  const [aMaxA, setAMaxA] = useState("");
  const [aMaxB, setAMaxB] = useState("");

  /* AWAK filters */
  const [wCfg,  setWCfg]  = useState<AwakConfig>("basic");
  const [wMaxA, setWMaxA] = useState("");
  const [wMaxB, setWMaxB] = useState("");

  /* Shared */
  const [count,       setCount]       = useState(1);
  const [showSmaller, setShowSmaller] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [sortCol,     setSortCol]     = useState<SortCol>("Aa");
  const [sortDir,     setSortDir]     = useState<SortDir>("asc");

  useEffect(() => { setSelectedKey(null); }, [producer, count, gH, aCfg, wCfg]);

  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  };

  const thSort = (col: SortCol, align: "left" | "right" = "left") =>
    `px-3 py-2 font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap cursor-pointer select-none hover:text-primary transition-colors text-${align}`;

  const thStatic = "px-3 py-2 font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap";

  const perVentMin = count > 0 ? requiredAcz / count : requiredAcz;

  /* ── Gulajski data ── */
  const filteredG = useMemo(() => {
    if (producer !== "gulajski") return [] as GulajskiVent[];
    const aa = (v: GulajskiVent) => (gH === 350 ? v.Aa350 : v.Aa500);
    const maxAn = parseInt(gMaxA, 10), maxBn = parseInt(gMaxB, 10);
    let vs = gulajskiVents;
    if (gType !== "all")               vs = vs.filter(v => v.base === gType);
    if (!isNaN(maxAn) && maxAn > 0)    vs = vs.filter(v => v.A <= maxAn);
    if (!isNaN(maxBn) && maxBn > 0)    vs = vs.filter(v => v.B <= maxBn);
    if (!showSmaller && requiredAcz > 0) vs = vs.filter(v => aa(v) >= perVentMin);
    return [...vs].sort((a, b) => {
      const d = sortCol === "A" ? a.A - b.A : sortCol === "B" ? a.B - b.B : sortCol === "Av" ? a.Av - b.Av : aa(a) - aa(b);
      return sortDir === "asc" ? d : -d;
    });
  }, [producer, gType, gH, gMaxA, gMaxB, count, showSmaller, requiredAcz, sortCol, sortDir, perVentMin]);

  /* ── ASKON data ── */
  const filteredA = useMemo(() => {
    if (producer !== "askon") return [] as AskonVent[];
    const aa = (v: AskonVent) => askonAa(v, aCfg);
    const maxAn = parseInt(aMaxA, 10), maxBn = parseInt(aMaxB, 10);
    let vs = askonVents;
    if (!isNaN(maxAn) && maxAn > 0)    vs = vs.filter(v => v.A <= maxAn);
    if (!isNaN(maxBn) && maxBn > 0)    vs = vs.filter(v => v.B <= maxBn);
    if (!showSmaller && requiredAcz > 0) vs = vs.filter(v => aa(v) >= perVentMin);
    return [...vs].sort((a, b) => {
      const d = sortCol === "A" ? a.A - b.A : sortCol === "B" ? a.B - b.B : sortCol === "Av" ? a.Av - b.Av : aa(a) - aa(b);
      return sortDir === "asc" ? d : -d;
    });
  }, [producer, aCfg, aMaxA, aMaxB, count, showSmaller, requiredAcz, sortCol, sortDir, perVentMin]);

  /* ── AWAK data ── */
  const filteredW = useMemo(() => {
    if (producer !== "awak") return [] as AwakVent[];
    const aa = (v: AwakVent) => awakAa(v, wCfg);
    const maxAn = parseInt(wMaxA, 10), maxBn = parseInt(wMaxB, 10);
    let vs = awakVents;
    if (!isNaN(maxAn) && maxAn > 0)    vs = vs.filter(v => v.A <= maxAn);
    if (!isNaN(maxBn) && maxBn > 0)    vs = vs.filter(v => v.B <= maxBn);
    if (!showSmaller && requiredAcz > 0) vs = vs.filter(v => aa(v) >= perVentMin);
    return [...vs].sort((a, b) => {
      const d = sortCol === "A" ? a.A - b.A : sortCol === "B" ? a.B - b.B : sortCol === "Av" ? a.Av - b.Av : aa(a) - aa(b);
      return sortDir === "asc" ? d : -d;
    });
  }, [producer, wCfg, wMaxA, wMaxB, count, showSmaller, requiredAcz, sortCol, sortDir, perVentMin]);

  const filteredCount = producer === "gulajski" ? filteredG.length : producer === "askon" ? filteredA.length : filteredW.length;

  const hasFilters = producer === "gulajski"
    ? (gMaxA !== "" || gMaxB !== "" || gType !== "all" || showSmaller)
    : producer === "askon"
    ? (aMaxA !== "" || aMaxB !== "" || showSmaller)
    : (wMaxA !== "" || wMaxB !== "" || showSmaller);

  const resetFilters = () => {
    setShowSmaller(false);
    if (producer === "gulajski") { setGType("all"); setGMaxA(""); setGMaxB(""); }
    else if (producer === "askon") { setAMaxA(""); setAMaxB(""); }
    else { setWMaxA(""); setWMaxB(""); }
  };

  const selectG = (v: GulajskiVent) => {
    const Aa = gH === 350 ? v.Aa350 : v.Aa500;
    setSelectedKey(`${producer}-${v.A}-${v.B}`);
    onSelect(Aa, v.Av, count, v.A / 1000, v.B / 1000);
  };

  const selectA = (v: AskonVent) => {
    const Aa = askonAa(v, aCfg);
    setSelectedKey(`${producer}-${v.A}-${v.B}`);
    onSelect(Aa, v.Av, count, v.A / 100, v.B / 100);
  };

  const selectW = (v: AwakVent) => {
    const Aa = awakAa(v, wCfg);
    setSelectedKey(`${producer}-${v.A}-${v.B}`);
    onSelect(Aa, v.Av, count, v.A / 100, v.B / 100);
  };

  const rowClass = (key: string, ok: boolean) =>
    `transition-colors ${
      selectedKey === key
        ? "bg-primary/10 dark:bg-primary/15"
        : ok
        ? "hover:bg-slate-50 dark:hover:bg-slate-800/40"
        : "opacity-40 hover:opacity-60 hover:bg-slate-50 dark:hover:bg-slate-800/40"
    }`;

  const selectBtn = (key: string) =>
    `rounded-lg px-2 py-1 text-[10px] font-bold transition ${
      selectedKey === key
        ? "bg-primary text-white"
        : "border border-slate-200 dark:border-slate-600 text-slate-500 hover:border-primary hover:text-primary dark:text-slate-400"
    }`;

  const dimInput = (value: string, onChange: (v: string) => void, unit: string) => (
    <div className="relative">
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="brak"
        className="w-24 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 pr-8 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-primary"
      />
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">{unit}</span>
    </div>
  );

  const pillBtn = (active: boolean, onClick: () => void, label: React.ReactNode) => (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
        active
          ? "bg-primary text-white"
          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="mt-5">
      <button
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-center justify-between rounded-xl border border-dashed border-slate-300 dark:border-slate-600 px-4 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:border-primary/70 hover:text-primary transition-colors"
      >
        <span className="flex items-center gap-2.5">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Dobierz z katalogu producenta
        </span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 animate-fade-in">

          {/* Producer toggle */}
          <div className="flex gap-2 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            {([
              { value: "gulajski", label: "Gulajski PPSPP" },
              { value: "askon",    label: "ASKON FIRE" },
              { value: "awak",     label: "AWAK P2" },
            ] as const).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setProducer(value); setSelectedKey(null); setSortCol("Aa"); setSortDir("asc"); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  producer === value
                    ? "bg-primary text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Required Acz */}
          {requiredAcz > 0 && (
            <div className="mb-4 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-xs font-semibold text-primary">
              Wymagane A<sub>cz</sub> ≥ {fmt(requiredAcz)} m²
              {count > 1 && (
                <span className="ml-1.5 text-slate-500 dark:text-slate-400 font-normal">
                  (na klapę: ≥ {fmt(perVentMin)} m²)
                </span>
              )}
            </div>
          )}

          {/* Filters row 1 */}
          <div className="flex flex-wrap gap-x-5 gap-y-2.5 mb-3">
            {producer === "gulajski" && (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mr-0.5">Typ</span>
                  {(["all", "PS", "P"] as const).map(t => pillBtn(gType === t, () => setGType(t), t === "all" ? "Wszystkie" : t))}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mr-0.5">Wys. otwarcia</span>
                  {([350, 500] as const).map(h => pillBtn(gH === h, () => setGH(h), `H=${h}mm`))}
                </div>
              </>
            )}

            {producer === "askon" && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mr-0.5">Konfiguracja</span>
                {([
                  { v: "basic"        as AskonConfig, l: "Bazowa" },
                  { v: "cowls"        as AskonConfig, l: "Z owiewkami" },
                  { v: "cowls_nozzle" as AskonConfig, l: "Z owiew. i dyszą" },
                ]).map(({ v, l }) => pillBtn(aCfg === v, () => setACfg(v), l))}
              </div>
            )}

            {producer === "awak" && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mr-0.5">Konfiguracja</span>
                {([
                  { v: "basic"        as AwakConfig, l: "Bazowa" },
                  { v: "cowls"        as AwakConfig, l: "Z wiatrownicą" },
                  { v: "cowls_nozzle" as AwakConfig, l: "Z wiatr. i dyszą" },
                ]).map(({ v, l }) => pillBtn(wCfg === v, () => setWCfg(v), l))}
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mr-0.5">Ilość szt.</span>
              {[1, 2, 3, 4].map(n => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition ${count === n ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Filters row 2 — dimension caps */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Maks. A</span>
              {producer === "gulajski"
                ? dimInput(gMaxA, setGMaxA, "mm")
                : producer === "askon"
                ? dimInput(aMaxA, setAMaxA, "cm")
                : dimInput(wMaxA, setWMaxA, "cm")}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Maks. B</span>
              {producer === "gulajski"
                ? dimInput(gMaxB, setGMaxB, "mm")
                : producer === "askon"
                ? dimInput(aMaxB, setAMaxB, "cm")
                : dimInput(wMaxB, setWMaxB, "cm")}
            </div>
            {hasFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Resetuj filtry
              </button>
            )}
          </div>

          {/* Table */}
          <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-100 dark:border-slate-700">

            {/* Gulajski */}
            {producer === "gulajski" && (
              <table className="w-full text-xs min-w-[420px]">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10">
                  <tr>
                    <th className={thStatic}>Typ</th>
                    <th className={thSort("A")} onClick={() => handleSort("A")}>A [mm]<SortIcon active={sortCol === "A"} dir={sortDir} /></th>
                    <th className={thSort("B")} onClick={() => handleSort("B")}>B [mm]<SortIcon active={sortCol === "B"} dir={sortDir} /></th>
                    <th className={thSort("Av", "right")} onClick={() => handleSort("Av")}>A<sub>v</sub> [m²]<SortIcon active={sortCol === "Av"} dir={sortDir} /></th>
                    <th className={thSort("Aa", "right")} onClick={() => handleSort("Aa")}>A<sub>cz</sub>{count > 1 ? ` ×${count}` : ""} [m²]<SortIcon active={sortCol === "Aa"} dir={sortDir} /></th>
                    <th className="px-2 py-2 w-[76px]" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filteredG.map(v => {
                    const Aa  = gH === 350 ? v.Aa350 : v.Aa500;
                    const tot = r3(Aa * count);
                    const ok  = tot >= requiredAcz;
                    const key = `gulajski-${v.A}-${v.B}`;
                    return (
                      <tr key={key} className={rowClass(key, ok)}>
                        <td className="px-3 py-2">
                          <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold ${v.base === "PS" ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" : "bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300"}`}>
                            {v.base}
                          </span>
                        </td>
                        <td className="px-3 py-2 tabular-nums text-slate-700 dark:text-slate-300">{v.A}</td>
                        <td className="px-3 py-2 tabular-nums text-slate-700 dark:text-slate-300">{v.B}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400">{fmt(v.Av)}</td>
                        <td className={`px-3 py-2 text-right font-bold tabular-nums whitespace-nowrap ${ok ? "text-green-600 dark:text-green-400" : "text-slate-400"}`}>
                          {count > 1 ? <>{fmt(Aa)} × {count} = <strong>{fmt(tot)}</strong></> : fmt(tot)}
                        </td>
                        <td className="px-2 py-2 text-right">
                          <button className={selectBtn(key)} onClick={() => selectG(v)}>
                            {selectedKey === key ? "✓ Wybrana" : "Wybierz"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredG.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">Brak klapek spełniających podane kryteria.</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {/* AWAK */}
            {producer === "awak" && (
              <table className="w-full text-xs min-w-[420px]">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10">
                  <tr>
                    <th className={thSort("A")} onClick={() => handleSort("A")}>A [cm]<SortIcon active={sortCol === "A"} dir={sortDir} /></th>
                    <th className={thSort("B")} onClick={() => handleSort("B")}>B [cm]<SortIcon active={sortCol === "B"} dir={sortDir} /></th>
                    <th className={thSort("Av", "right")} onClick={() => handleSort("Av")}>A<sub>v</sub> [m²]<SortIcon active={sortCol === "Av"} dir={sortDir} /></th>
                    <th className={thSort("Aa", "right")} onClick={() => handleSort("Aa")}>A<sub>cz</sub>{count > 1 ? ` ×${count}` : ""} [m²]<SortIcon active={sortCol === "Aa"} dir={sortDir} /></th>
                    <th className="px-2 py-2 w-[76px]" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filteredW.map(v => {
                    const Aa  = awakAa(v, wCfg);
                    const tot = r3(Aa * count);
                    const ok  = tot >= requiredAcz;
                    const key = `awak-${v.A}-${v.B}`;
                    return (
                      <tr key={key} className={rowClass(key, ok)}>
                        <td className="px-3 py-2 tabular-nums text-slate-700 dark:text-slate-300">{v.A}</td>
                        <td className="px-3 py-2 tabular-nums text-slate-700 dark:text-slate-300">{v.B}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400">{fmt(v.Av, 4)}</td>
                        <td className={`px-3 py-2 text-right font-bold tabular-nums whitespace-nowrap ${ok ? "text-green-600 dark:text-green-400" : "text-slate-400"}`}>
                          {count > 1 ? <>{fmt(Aa, 3)} × {count} = <strong>{fmt(tot)}</strong></> : fmt(Aa, 3)}
                        </td>
                        <td className="px-2 py-2 text-right">
                          <button className={selectBtn(key)} onClick={() => selectW(v)}>
                            {selectedKey === key ? "✓ Wybrana" : "Wybierz"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredW.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">Brak klapek spełniających podane kryteria.</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {/* ASKON */}
            {producer === "askon" && (
              <table className="w-full text-xs min-w-[420px]">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10">
                  <tr>
                    <th className={thSort("A")} onClick={() => handleSort("A")}>A [cm]<SortIcon active={sortCol === "A"} dir={sortDir} /></th>
                    <th className={thSort("B")} onClick={() => handleSort("B")}>B [cm]<SortIcon active={sortCol === "B"} dir={sortDir} /></th>
                    <th className={thSort("Av", "right")} onClick={() => handleSort("Av")}>A<sub>v</sub> [m²]<SortIcon active={sortCol === "Av"} dir={sortDir} /></th>
                    <th className={thSort("Aa", "right")} onClick={() => handleSort("Aa")}>A<sub>cz</sub>{count > 1 ? ` ×${count}` : ""} [m²]<SortIcon active={sortCol === "Aa"} dir={sortDir} /></th>
                    <th className="text-center px-3 py-2 font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">Prąd</th>
                    <th className="px-2 py-2 w-[76px]" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filteredA.map(v => {
                    const Aa  = askonAa(v, aCfg);
                    const tot = r3(Aa * count);
                    const ok  = tot >= requiredAcz;
                    const key = `askon-${v.A}-${v.B}`;
                    return (
                      <tr key={key} className={rowClass(key, ok)}>
                        <td className="px-3 py-2 tabular-nums text-slate-700 dark:text-slate-300">{v.A}</td>
                        <td className="px-3 py-2 tabular-nums text-slate-700 dark:text-slate-300">{v.B}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400">{fmt(v.Av, 4)}</td>
                        <td className={`px-3 py-2 text-right font-bold tabular-nums whitespace-nowrap ${ok ? "text-green-600 dark:text-green-400" : "text-slate-400"}`}>
                          {count > 1 ? <>{fmt(Aa, 2)} × {count} = <strong>{fmt(tot)}</strong></> : fmt(Aa, 2)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold ${v.current === 4 ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"}`}>
                            {v.current}A
                          </span>
                        </td>
                        <td className="px-2 py-2 text-right">
                          <button className={selectBtn(key)} onClick={() => selectA(v)}>
                            {selectedKey === key ? "✓ Wybrana" : "Wybierz"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredA.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">Brak klapek spełniających podane kryteria.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="mt-3 flex items-center justify-between">
            <button onClick={() => setShowSmaller(s => !s)} className="text-[11px] text-slate-400 hover:text-primary transition-colors">
              {showSmaller ? "▲ Ukryj za małe" : "▼ Pokaż wszystkie rozmiary"}
            </button>
            <p className="text-[10px] text-slate-400">
              {filteredCount} pozycji ·{" "}
              {producer === "gulajski"
                ? "katalog Gulajski PPSPP"
                : producer === "askon"
                ? "ASKON FIRE · podstawa prosta H=50 cm"
                : "AWAK P2 · podstawa prosta H=50 cm"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
