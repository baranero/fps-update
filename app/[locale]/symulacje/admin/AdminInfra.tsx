"use client";

import { useCallback, useEffect, useState } from "react";
import { fmtDateTime, fmtEur } from "@/lib/format";
import { chipCls, type Tone } from "@/lib/tone";
import {
  Btn, Kpi, Meter, Notice, SectionLabel, Skeleton,
  cardCls, tableCls, tdCls, tdNumCls, thCls, theadRowCls, trCls,
} from "@/components/Cloud/ui";

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

// Stan maszyny Hetznera mapowany na tony systemu — ta sama forma chipa,
// co status zlecenia (`lib/status`) i format raportu.
function statusTone(status: string): Tone {
  switch (status) {
    case "running": return "ok";
    case "starting":
    case "initializing": return "warn";
    default: return "muted";
  }
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Notice
        tone="primary"
        title="Nie udało się pobrać danych z Hetznera."
        actions={<Btn variant="secondary" size="sm" onClick={load}>Spróbuj ponownie</Btn>}
      >
        Sprawdź HETZNER_API_TOKEN oraz dane dostępowe do Object Storage.
      </Notice>
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
        <p className="font-mono text-fr-micro uppercase text-muted">
          Dane na {fmtDateTime(data.generatedAt)} · koszty netto (EUR)
        </p>
        <Btn variant="secondary" size="sm" onClick={load}>
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Odśwież
        </Btn>
      </div>

      {/* Ostrzeżenia o częściowych błędach */}
      {data.errors.length > 0 && (
        <Notice tone="warn" title="Część danych mogła się nie załadować">
          <ul className="list-disc pl-5">
            {data.errors.map((e, i) => <li key={i} className="break-words">{e}</li>)}
          </ul>
        </Notice>
      )}

      {/* Podsumowanie kosztów */}
      <div className="rounded-card border border-primary/25 bg-primary/[0.05] p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-fr-micro uppercase text-muted">Koszt bieżącego miesiąca (szac.)</p>
            <p className="fr-num mt-1 font-heading text-fr-h1 text-ink">{fmtEur(totalMonthly)}</p>
            <p className="fr-num mt-1 font-mono text-fr-sm text-muted">
              Serwery {fmtEur(computeMonthly)} · Storage {fmtEur(storageMonthly)}
            </p>
          </div>
          <div className="flex gap-6 text-right">
            <div>
              <p className="font-mono text-fr-micro uppercase text-muted">Spalanie teraz</p>
              <p className="fr-num font-heading text-fr-h3 text-primary">
                {fmtEur(st.hourlyNet, 3)}<span className="font-mono text-fr-sm font-normal text-faint"> /h</span>
              </p>
            </div>
            <div>
              <p className="font-mono text-fr-micro uppercase text-muted">Serwery teraz</p>
              <p className="fr-num font-heading text-fr-h3 text-ink">{st.running}</p>
            </div>
          </div>
        </div>

        {totalMonthly > 0 && (
          <div className="mt-4">
            <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-panel-deep">
              <div className="h-full bg-primary" style={{ width: `${computePct}%` }} />
              <div className="h-full bg-warn" style={{ width: `${storagePct}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-fr-micro uppercase text-muted">
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-primary" />Serwery {computePct.toFixed(0)}%</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-warn" />Storage {storagePct.toFixed(0)}%</span>
              <span className="ml-auto">{st.running}/{st.count} serwerów aktywnych · {storage ? fmtBytes(storage.totalBytes) : "—"} danych</span>
            </div>
          </div>
        )}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Serwery" value={String(st.count)} sub={`${st.running} uruchomionych`} />
        <Kpi label="Aktywne" value={String(st.running)} tone={st.running > 0 ? "ok" : "ink"} />
        <Kpi label="Koszt / h" value={fmtEur(st.hourlyNet, 3)} sub="serwery uruchomione" tone="primary" />
        <Kpi label="Koszt / mies" value={fmtEur(st.monthlyNet)} sub="cap serwerów aktywnych" />
        <Kpi label="Naliczono" value={fmtEur(st.accruedNet)} sub="od utworzenia (szac.)" tone="warn" />
        <Kpi
          label="Storage / mies"
          value={storage ? fmtEur(storage.monthlyCostEstimateEur) : "—"}
          sub={storage ? fmtBytes(storage.totalBytes) : "brak danych"}
        />
      </div>

      {/* Tabela serwerów */}
      <div>
        <SectionLabel className="mb-3 block">
          Serwery Hetzner Cloud {servers.length > 0 && <span className="fr-num">({servers.length})</span>}
        </SectionLabel>
        {servers.length === 0 ? (
          <div className="rounded-card border border-dashed border-hairline px-6 py-10 text-center text-fr-sm text-muted">
            Brak uruchomionych serwerów — zero kosztów compute.
          </div>
        ) : (
          <div className={`${cardCls} overflow-hidden overflow-x-auto`}>
            <table className={`${tableCls} min-w-[900px]`}>
              <thead>
                <tr className={theadRowCls}>
                  {["Nazwa", "Status", "Typ", "vCPU / RAM", "Lokalizacja", "IPv4", "Utworzono", "Uptime", "€/h", "Naliczono"].map(h => (
                    <th key={h} className={thCls}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-soft">
                {servers.map(s => (
                  <tr key={s.id} className={trCls}>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-ink">{s.name}</td>
                    <td className="px-3 py-2.5">
                      <span className={chipCls(statusTone(s.status))}>{s.status}</span>
                    </td>
                    <td className={`${tdCls} font-mono uppercase`}>{s.serverType}</td>
                    <td className={tdNumCls}>{s.cores} / {s.memoryGb} GB</td>
                    <td className={`${tdCls} uppercase`}>{s.location}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-muted">{s.ipv4 || "—"}</td>
                    <td className={`${tdCls} whitespace-nowrap`}>{fmtDateTime(s.created)}</td>
                    <td className={tdNumCls}>{fmtUptime(s.uptimeHours)}</td>
                    <td className={tdNumCls}>{fmtEur(s.priceHourlyNet, 3)}</td>
                    <td className={`${tdNumCls} text-warn`}>{fmtEur(s.accruedNet)}</td>
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
          <SectionLabel>Koszt serwerów miesięcznie</SectionLabel>
          <p className="text-fr-sm text-faint">czas życia serwera × stawka typu · szacunek netto</p>
        </div>
        {data.monthlyCompute.length === 0 ? (
          <div className="rounded-card border border-dashed border-hairline px-6 py-8 text-center text-fr-sm text-muted">
            Brak historii zleceń do wyceny.
          </div>
        ) : (() => {
          const maxEur = Math.max(...data.monthlyCompute.map(m => m.totalEur), 0.0001);
          const totalEur = data.monthlyCompute.reduce((s, m) => s + m.totalEur, 0);
          const totalCount = data.monthlyCompute.reduce((s, m) => s + m.count, 0);
          return (
            <div className={`${cardCls} overflow-hidden`}>
              <table className={tableCls}>
                <thead>
                  <tr className={theadRowCls}>
                    {["Miesiąc", "Zleceń", "Czas serwerów", "Koszt", ""].map((h, i) => (
                      <th key={i} className={`${thCls} ${i > 0 && i < 4 ? "!text-right" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline-soft">
                  {data.monthlyCompute.map(m => (
                    <tr key={m.month} className={trCls}>
                      <td className="whitespace-nowrap px-3 py-2.5 capitalize text-ink">{fmtMonth(m.month)}</td>
                      <td className={`${tdNumCls} text-right`}>{m.count}</td>
                      <td className={`${tdNumCls} text-right`}>{fmtUptime(m.runtimeHours)}</td>
                      <td className={`${tdNumCls} text-right text-warn`}>{fmtEur(m.totalEur)}</td>
                      <td className="w-32 px-3 py-2.5">
                        <Meter pct={(m.totalEur / maxEur) * 100} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-hairline bg-panel-deep">
                    <td className="px-3 py-2.5 font-mono text-fr-micro uppercase text-ink">Razem</td>
                    <td className={`${tdNumCls} text-right`}>{totalCount}</td>
                    <td className="px-3 py-2.5" />
                    <td className={`${tdNumCls} text-right text-ink`}>{fmtEur(totalEur)}</td>
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
        <SectionLabel className="mb-3 block">Object Storage</SectionLabel>
        {!storage ? (
          <div className="rounded-card border border-dashed border-hairline px-6 py-8 text-center text-fr-sm text-muted">
            Brak danych o magazynie (sprawdź dane dostępowe S3).
          </div>
        ) : (
          <div className={`${cardCls} space-y-4 p-5`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-mono text-fr-body text-ink">{storage.bucket}</p>
              <p className="fr-num font-mono text-fr-sm text-muted">
                {storage.objectCount.toLocaleString("pl-PL")} obiektów · {fmtBytes(storage.totalBytes)}
                {storage.truncated && <span className="ml-1 text-warn">(zliczanie przerwane — więcej danych)</span>}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-panel border border-hairline-soft bg-panel-deep p-3">
                <p className="mb-1 font-mono text-fr-micro uppercase text-muted">Zajętość</p>
                <p className="fr-num font-heading text-fr-h3 text-ink">{fmtBytes(storage.totalBytes)}</p>
              </div>
              <div className="rounded-panel border border-hairline-soft bg-panel-deep p-3">
                <p className="mb-1 font-mono text-fr-micro uppercase text-muted">Obiekty</p>
                <p className="fr-num font-heading text-fr-h3 text-ink">{storage.objectCount.toLocaleString("pl-PL")}</p>
              </div>
              <div className="rounded-panel border border-hairline-soft bg-panel-deep p-3">
                <p className="mb-1 font-mono text-fr-micro uppercase text-muted">Koszt / mies (szac.)</p>
                <p className="fr-num font-heading text-fr-h3 text-primary">{fmtEur(storage.monthlyCostEstimateEur)}</p>
                <p className="mt-0.5 font-mono text-fr-sm text-faint">{fmtEur(data.pricePerTbEur)} / rozpoczęty TB</p>
              </div>
            </div>

            {storage.prefixes.length > 0 && (
              <div>
                <p className="mb-2 font-mono text-fr-micro uppercase text-muted">Rozbicie po katalogach</p>
                <div className="overflow-hidden rounded-panel border border-hairline-soft">
                  <table className={tableCls}>
                    <tbody className="divide-y divide-hairline-soft">
                      {storage.prefixes.map(p => (
                        <tr key={p.prefix} className="bg-panel">
                          <td className="px-3 py-2 font-mono text-muted">{p.prefix}/</td>
                          <td className="fr-num px-3 py-2 text-right text-muted">{p.objectCount.toLocaleString("pl-PL")} obiektów</td>
                          <td className="fr-num px-3 py-2 text-right text-ink">{fmtBytes(p.totalBytes)}</td>
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
