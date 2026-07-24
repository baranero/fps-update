"use client";

import { useCallback, useEffect, useState } from "react";
import { fmtDateTime, fmtEur } from "@/lib/format";

type ServerRow = {
  id: number; name: string; status: string; serverType: string;
  cores: number; memoryGb: number; diskGb: number; location: string;
  ipv4: string; created: string; uptimeHours: number;
  priceHourlyNet: number; priceMonthlyNet: number; accruedNet: number;
};

type Storage = {
  bucket: string; objectCount: number; totalBytes: number;
  prefixes: Array<{ prefix: string; objectCount: number; totalBytes: number }>;
  truncated: boolean; monthlyCostEstimateEur: number;
};

type MonthCost = { month: string; totalEur: number; count: number; runtimeHours: number };

type Data = {
  servers: ServerRow[];
  serverTotals: { count: number; running: number; hourlyNet: number; monthlyNet: number; accruedNet: number };
  storage: Storage | null;
  monthlyCompute: MonthCost[];
  pricePerTbEur: number;
  generatedAt: string;
  errors: string[];
};

function fmtBytes(n: number) {
  if (n >= 1_000 ** 4) return `${(n / 1_000 ** 4).toFixed(2)} TB`;
  if (n >= 1_000 ** 3) return `${(n / 1_000 ** 3).toFixed(2)} GB`;
  if (n >= 1_000 ** 2) return `${(n / 1_000 ** 2).toFixed(1)} MB`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} kB`;
  return `${n} B`;
}

function fmtMonth(month: string) {
  const d = new Date(month + "-01T00:00:00");
  return d.toLocaleDateString("pl-PL", { month: "long", year: "numeric" });
}

function fmtUptime(h: number) {
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const rem = Math.round(h % 24);
    return `${d} d ${rem} h`;
  }
  if (h >= 1) return `${h.toFixed(1)} h`;
  return `${Math.round(h * 60)} min`;
}

function statusCls(status: string) {
  switch (status) {
    case "running": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "starting":
    case "initializing": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "stopping":
    case "off": return "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300";
    default: return "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300";
  }
}

function Kpi({ label, value, sub, cls }: { label: string; value: string; sub?: string; cls?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] p-4">
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${cls ?? "text-slate-800 dark:text-white"}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{sub}</p>}
    </div>
  );
}

export default function AdminInfra() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/hetzner");
      if (!res.ok) { setError(true); setLoading(false); return; }
      setData(await res.json());
    } catch {
      setError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
        </div>
        <div className="h-64 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/70 dark:bg-red-900/10 p-5">
        <p className="text-sm font-semibold text-red-700 dark:text-red-400">Nie udało się pobrać danych z Hetznera.</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Sprawdź HETZNER_API_TOKEN oraz dane dostępowe do Object Storage.</p>
        <button onClick={load} className="mt-3 rounded-lg border border-red-200 dark:border-red-900/50 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100/50 dark:hover:bg-red-900/20 transition-colors">
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  const { servers, serverTotals: st, storage } = data;

  // Realny koszt bieżącego miesiąca: compute odtworzony z historii zleceń (nie cap
  // chwilowo działających serwerów — te są efemeryczne) + szacunek storage.
  const curMonthKey = new Date().toISOString().slice(0, 7);
  const computeMonthly = data.monthlyCompute.find(m => m.month === curMonthKey)?.totalEur ?? 0;
  const storageMonthly = storage?.monthlyCostEstimateEur ?? 0;
  const totalMonthly = computeMonthly + storageMonthly;
  const computePct = totalMonthly > 0 ? (computeMonthly / totalMonthly) * 100 : 0;
  const storagePct = totalMonthly > 0 ? (storageMonthly / totalMonthly) * 100 : 0;

  return (
    <div className="space-y-6">

      {/* Nagłówek + odświeżenie */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Dane na {fmtDateTime(data.generatedAt)} · koszty netto (EUR)
        </p>
        <button onClick={load}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Odśwież
        </button>
      </div>

      {/* Ostrzeżenia o częściowych błędach */}
      {data.errors.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-900/10 p-3">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Część danych mogła się nie załadować:</p>
          <ul className="mt-1 list-disc pl-5 text-[11px] text-amber-700 dark:text-amber-400">
            {data.errors.map((e, i) => <li key={i} className="break-words">{e}</li>)}
          </ul>
        </div>
      )}

      {/* Podsumowanie kosztów */}
      <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.07] to-transparent p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Koszt bieżącego miesiąca (szac.)</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900 dark:text-white">{fmtEur(totalMonthly)}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Serwery {fmtEur(computeMonthly)} · Storage {fmtEur(storageMonthly)}
            </p>
          </div>
          <div className="flex gap-6 text-right">
            <div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Spalanie teraz</p>
              <p className="text-lg font-bold tabular-nums text-primary">
                {fmtEur(st.hourlyNet, 3)}<span className="text-xs font-normal text-slate-400 dark:text-slate-500"> /h</span>
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Serwery teraz</p>
              <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{st.running}</p>
            </div>
          </div>
        </div>

        {totalMonthly > 0 && (
          <div className="mt-4">
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full bg-primary" style={{ width: `${computePct}%` }} />
              <div className="h-full bg-amber-400" style={{ width: `${storagePct}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />Serwery {computePct.toFixed(0)}%</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" />Storage {storagePct.toFixed(0)}%</span>
              <span className="ml-auto">{st.running}/{st.count} serwerów aktywnych · {storage ? fmtBytes(storage.totalBytes) : "—"} danych</span>
            </div>
          </div>
        )}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="Serwery" value={String(st.count)} sub={`${st.running} uruchomionych`} />
        <Kpi label="Aktywne" value={String(st.running)} cls={st.running > 0 ? "text-green-600 dark:text-green-400" : undefined} />
        <Kpi label="Koszt / h" value={fmtEur(st.hourlyNet, 3)} sub="serwery uruchomione" cls="text-primary" />
        <Kpi label="Koszt / mies" value={fmtEur(st.monthlyNet)} sub="cap serwerów aktywnych" />
        <Kpi label="Naliczono" value={fmtEur(st.accruedNet)} sub="od utworzenia (szac.)" cls="text-amber-600 dark:text-amber-400" />
        <Kpi
          label="Storage / mies"
          value={storage ? fmtEur(storage.monthlyCostEstimateEur) : "—"}
          sub={storage ? fmtBytes(storage.totalBytes) : "brak danych"}
        />
      </div>

      {/* Tabela serwerów */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
          Serwery Hetzner Cloud {servers.length > 0 && <span className="text-slate-400 dark:text-slate-500 font-normal">({servers.length})</span>}
        </h2>
        {servers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            Brak uruchomionych serwerów — zero kosztów compute.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden overflow-x-auto">
            <table className="w-full text-xs min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                  {["Nazwa", "Status", "Typ", "vCPU / RAM", "Lokalizacja", "IPv4", "Utworzono", "Uptime", "€/h", "Naliczono"].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {servers.map(s => (
                  <tr key={s.id} className="bg-white dark:bg-[#1E232E] hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-2.5 font-mono text-slate-700 dark:text-slate-200 whitespace-nowrap">{s.name}</td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusCls(s.status)}`}>{s.status}</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono uppercase text-slate-600 dark:text-slate-300">{s.serverType}</td>
                    <td className="px-3 py-2.5 tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">{s.cores} / {s.memoryGb} GB</td>
                    <td className="px-3 py-2.5 uppercase text-slate-500 dark:text-slate-400">{s.location}</td>
                    <td className="px-3 py-2.5 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">{s.ipv4 || "—"}</td>
                    <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDateTime(s.created)}</td>
                    <td className="px-3 py-2.5 tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">{fmtUptime(s.uptimeHours)}</td>
                    <td className="px-3 py-2.5 tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">{fmtEur(s.priceHourlyNet, 3)}</td>
                    <td className="px-3 py-2.5 tabular-nums font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">{fmtEur(s.accruedNet)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Koszt serwerów miesięcznie (odtworzony z historii zleceń) */}
      <div>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Koszt serwerów miesięcznie</h2>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">czas życia serwera × stawka typu · szacunek netto</p>
        </div>
        {data.monthlyCompute.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Brak historii zleceń do wyceny.
          </div>
        ) : (() => {
          const maxEur = Math.max(...data.monthlyCompute.map(m => m.totalEur), 0.0001);
          const totalEur = data.monthlyCompute.reduce((s, m) => s + m.totalEur, 0);
          const totalCount = data.monthlyCompute.reduce((s, m) => s + m.count, 0);
          return (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                    {["Miesiąc", "Zleceń", "Czas serwerów", "Koszt", ""].map((h, i) => (
                      <th key={i} className={`px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 ${i === 0 ? "text-left" : i === 4 ? "" : "text-right"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.monthlyCompute.map(m => (
                    <tr key={m.month} className="bg-white dark:bg-[#1E232E] hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2.5 font-medium capitalize text-slate-700 dark:text-slate-200 whitespace-nowrap">{fmtMonth(m.month)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-500 dark:text-slate-400">{m.count}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtUptime(m.runtimeHours)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">{fmtEur(m.totalEur)}</td>
                      <td className="px-3 py-2.5 w-32">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${(m.totalEur / maxEur) * 100}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 font-semibold">
                    <td className="px-3 py-2.5 text-slate-700 dark:text-slate-200">Razem</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{totalCount}</td>
                    <td className="px-3 py-2.5" />
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-900 dark:text-white whitespace-nowrap">{fmtEur(totalEur)}</td>
                    <td className="px-3 py-2.5" />
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })()}
      </div>

      {/* Object Storage */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Object Storage</h2>
        {!storage ? (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Brak danych o magazynie (sprawdź dane dostępowe S3).
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] p-5 space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-200">{storage.bucket}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {storage.objectCount.toLocaleString("pl-PL")} obiektów · {fmtBytes(storage.totalBytes)}
                {storage.truncated && <span className="ml-1 text-amber-600 dark:text-amber-400">(zliczanie przerwane — więcej danych)</span>}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-lg bg-slate-50 dark:bg-[#0B1120] p-3">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">Zajętość</p>
                <p className="text-lg font-bold tabular-nums text-slate-800 dark:text-white">{fmtBytes(storage.totalBytes)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-[#0B1120] p-3">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">Obiekty</p>
                <p className="text-lg font-bold tabular-nums text-slate-800 dark:text-white">{storage.objectCount.toLocaleString("pl-PL")}</p>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-[#0B1120] p-3">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">Koszt / mies (szac.)</p>
                <p className="text-lg font-bold tabular-nums text-primary">{fmtEur(storage.monthlyCostEstimateEur)}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{fmtEur(data.pricePerTbEur)} / rozpoczęty TB</p>
              </div>
            </div>

            {storage.prefixes.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Rozbicie po katalogach</p>
                <div className="rounded-lg border border-slate-100 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {storage.prefixes.map(p => (
                        <tr key={p.prefix} className="bg-white dark:bg-[#1E232E]">
                          <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300">{p.prefix}/</td>
                          <td className="px-3 py-2 tabular-nums text-right text-slate-500 dark:text-slate-400">{p.objectCount.toLocaleString("pl-PL")} obiektów</td>
                          <td className="px-3 py-2 tabular-nums text-right font-medium text-slate-700 dark:text-slate-200">{fmtBytes(p.totalBytes)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
