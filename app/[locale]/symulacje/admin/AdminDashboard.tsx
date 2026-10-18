"use client";

// Pulpit właściciela: co wymaga decyzji DZIŚ, co liczy się TERAZ na maszynach,
// jak idzie usługa w ostatnich 30 dniach i czy automatyka (cron) żyje.
// Wcześniej było tu osiem liczników „od początku świata” — w tym licznik
// błędów, który raz zapalony świecił się już zawsze i niczego nie mówił.

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { statusMeta } from "@/lib/status";
import { useFormat } from "@/lib/format";
import { STALL_HOURS } from "@/lib/fds/watchdog";
import {
  Btn, Chip, Kpi, Meter, Notice, SectionLabel, cardCls, tableCls, tdCls, tdNumCls, thCls, theadRowCls, trCls,
} from "@/components/Cloud/ui";

export type LiveJob = {
  case_id: string; email: string | null; file_name: string | null; status: string;
  created_at: string; dispatched_at: string | null; started_at: string | null;
  t_end: number | null; last_sim_time: number | null; last_progress_at: string | null;
  server_type: string | null; wall_hours: number | null;
};

export type DashboardStats = {
  counts: {
    total: number; pending: number; running: number; done: number; failed: number;
    revenue: number; unpaid: number; users: number; accessRequests?: number;
  };
  oldestUnpaidAt?: string | null;
  last30?: { done: number; failed: number; failedOurs: number; failedClient: number; revenue: number; byReason: Record<string, number> };
  live?: LiveJob[];
  cronLastAt?: string | null;
  recentErrors?: { at: string; case_id: string | null; stage: string; message: string }[];
  recent: { case_id: string; email: string; file_name: string; status: string; created_at: string; price: number | null; server_type: string | null }[];
};

/** Cisza w postępie, od której zlecenie trafia do „Wymaga uwagi” (przed nadzorcą). */
const QUIET_WARN_H = 1;
/** Kolejka, która nie ruszyła tyle minut, to coś więcej niż chwilowe opóźnienie. */
const PENDING_WARN_MIN = 15;
/** Cron chodzi co 10 min — dwa opuszczone przebiegi to już sygnał. */
const CRON_STALE_MIN = 30;
const UNPAID_WARN_DAYS = 14;

const hoursSince = (iso: string | null | undefined, now: number) =>
  iso ? (now - new Date(iso).getTime()) / 3_600_000 : null;

export default function AdminDashboard({
  stats, onJump, onUsers,
}: { stats: DashboardStats; onJump: (status: string) => void; onUsers: () => void }) {
  const t = useTranslations("admin");
  const ts = useTranslations("status");
  const f = useFormat();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const c = stats.counts;
  const live = stats.live ?? [];
  const l30 = stats.last30;

  const stalled = live.filter((j) => {
    if (j.status !== "running") return false;
    const h = hoursSince(j.last_progress_at ?? j.started_at, now);
    return h != null && h >= QUIET_WARN_H;
  });
  const stuckQueue = live.filter((j) => j.status === "pending" && (hoursSince(j.created_at, now) ?? 0) * 60 >= PENDING_WARN_MIN);
  const unpaidDays = stats.oldestUnpaidAt ? Math.floor((hoursSince(stats.oldestUnpaidAt, now) ?? 0) / 24) : null;
  const cronMin = stats.cronLastAt ? (hoursSince(stats.cronLastAt, now) ?? 0) * 60 : null;
  // null = brak dziennika (migracja), "" = nigdy nie przeszedł.
  const cronStale = stats.cronLastAt === "" || (cronMin != null && cronMin > CRON_STALE_MIN);

  const attention = [
    (c.accessRequests ?? 0) > 0 && (
      <Btn key="acc" variant="secondary" size="sm" onClick={onUsers}>
        {t("attention.accessRequests", { n: c.accessRequests ?? 0 })} <span aria-hidden>→</span>
      </Btn>
    ),
    stalled.length > 0 && (
      <Btn key="stall" variant="secondary" size="sm" onClick={() => onJump("running")}>
        {t("dash.stalled", { n: stalled.length, h: QUIET_WARN_H })} <span aria-hidden>→</span>
      </Btn>
    ),
    stuckQueue.length > 0 && (
      <Btn key="queue" variant="secondary" size="sm" onClick={() => onJump("pending")}>
        {t("dash.stuckQueue", { n: stuckQueue.length, min: PENDING_WARN_MIN })} <span aria-hidden>→</span>
      </Btn>
    ),
    unpaidDays != null && unpaidDays >= UNPAID_WARN_DAYS && (
      <Btn key="unpaid" variant="secondary" size="sm" onClick={() => onJump("done")}>
        {t("dash.unpaidOld", { amount: f.fmtPrice(c.unpaid), days: unpaidDays })} <span aria-hidden>→</span>
      </Btn>
    ),
    cronStale && (
      <span key="cron" className="self-center text-fr-sm text-warn">
        {stats.cronLastAt === "" ? t("dash.cronNever") : t("dash.cronStale", { min: Math.round(cronMin ?? 0) })}
      </span>
    ),
  ].filter(Boolean);

  const successRate = l30 && l30.done + l30.failedOurs > 0 ? (l30.done / (l30.done + l30.failedOurs)) * 100 : null;

  return (
    <div className="space-y-6">
      {attention.length > 0 ? (
        <Notice tone="warn" title={t("attention.title")}>
          <div className="mt-2 flex flex-wrap gap-2">{attention}</div>
        </Notice>
      ) : (
        <Notice tone="signal" title={t("dash.allClearTitle")}>
          <p>{t("dash.allClear")}</p>
        </Notice>
      )}

      {/* Stan bieżący + 30 dni */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label={t("dash.kpiRunning")} value={c.running} tone="signal" />
        <Kpi label={t("dash.kpiQueue")} value={c.pending} tone={c.pending > 0 ? "warn" : "ink"} />
        <Kpi label={t("kpi.unpaid")} value={f.fmtPrice(c.unpaid)} tone={c.unpaid > 0 ? "warn" : "ink"} />
        <Kpi label={t("kpi.users")} value={c.users} />
      </div>
      {l30 && (
        <div>
          <SectionLabel className="mb-3 block">{t("dash.last30")}</SectionLabel>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label={t("dash.kpiRevenue30")} value={f.fmtPrice(l30.revenue)} tone="primary" />
            <Kpi label={t("dash.kpiDone30")} value={l30.done} tone="ok" />
            <Kpi
              label={t("dash.kpiSuccess")}
              value={successRate == null ? "—" : `${Math.round(successRate)}%`}
              tone={successRate == null ? "ink" : successRate >= 90 ? "ok" : "warn"}
            />
            <Kpi label={t("dash.kpiFailedSplit")} value={`${l30.failedOurs} / ${l30.failedClient}`} tone={l30.failedOurs > 0 ? "primary" : "ink"} />
          </div>
          {l30.failed > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Object.entries(l30.byReason).sort((a, b) => b[1] - a[1]).map(([reason, n]) => (
                <Chip key={reason} tone="muted">{t(`reasons.${reason}`)} · {n}</Chip>
              ))}
            </div>
          )}
          <p className="mt-2 text-fr-sm text-faint">{t("dash.successHint")}</p>
        </div>
      )}

      {/* Teraz na maszynach */}
      <div>
        <SectionLabel className="mb-3 block">{t("dash.liveTitle")}</SectionLabel>
        {live.length === 0 ? (
          <p className="text-fr-sm text-muted">{t("dash.liveEmpty")}</p>
        ) : (
          <div className={`${cardCls} overflow-hidden overflow-x-auto`}>
            <table className={`${tableCls} min-w-[860px]`}>
              <thead>
                <tr className={theadRowCls}>
                  {[t("cols.status"), t("cols.caseId"), t("cols.email"), t("cols.server"), t("dash.colProgress"), t("dash.colRuntime"), t("dash.colQuiet")].map((h) => (
                    <th key={h} className={thCls}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-soft">
                {live.map((j) => {
                  const pct = j.last_sim_time != null && j.t_end ? Math.min(100, (j.last_sim_time / j.t_end) * 100) : null;
                  const runH = hoursSince(j.dispatched_at ?? j.created_at, now);
                  const quietH = j.status === "running" ? hoursSince(j.last_progress_at ?? j.started_at, now) : null;
                  return (
                    <tr key={j.case_id} className={trCls}>
                      <td className="px-3 py-2.5"><span className={statusMeta(j.status).cls}>{ts(statusMeta(j.status).key)}</span></td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-muted">
                        <Link href={`/symulacje/${j.case_id}`} className="transition-colors hover:text-accent">{j.case_id}</Link>
                      </td>
                      <td className={`${tdCls} max-w-[180px] truncate`} title={j.file_name ?? undefined}>{j.email}</td>
                      <td className={`${tdCls} font-mono uppercase`}>{j.server_type ?? "—"}</td>
                      <td className="w-48 px-3 py-2.5">
                        {pct == null ? <span className="text-faint">—</span> : (
                          <div>
                            <Meter pct={pct} tone="signal" />
                            <p className="fr-num mt-1 font-mono text-fr-micro text-muted">
                              {Math.round(j.last_sim_time ?? 0)} / {Math.round(j.t_end ?? 0)} s · {Math.round(pct)}%
                            </p>
                          </div>
                        )}
                      </td>
                      <td className={tdNumCls}>
                        {f.fmtHours(runH)}
                        {j.wall_hours ? <span className="text-faint"> / {f.fmtHours(j.wall_hours)}</span> : null}
                      </td>
                      <td className={`${tdNumCls} ${quietH != null && quietH >= QUIET_WARN_H ? "text-warn" : ""}`}>
                        {quietH == null ? "—" : quietH < 1 / 60 ? t("dash.justNow") : `${Math.round(quietH * 60)} min`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-fr-sm text-faint">{t("dash.liveHint", { stall: STALL_HOURS })}</p>
      </div>

      {/* Automatyka i błędy */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={`${cardCls} p-4`}>
          <SectionLabel>{t("dash.cronTitle")}</SectionLabel>
          <p className={`mt-2 font-heading text-fr-h4 ${cronStale ? "text-warn" : "text-ink"}`}>
            {stats.cronLastAt === null ? t("dash.cronUnknown")
              : stats.cronLastAt === "" ? t("dash.cronNeverShort")
              : f.fmtDateTime(stats.cronLastAt)}
          </p>
          <p className="mt-1 text-fr-sm text-faint">{t("dash.cronHint")}</p>
        </div>
        <div className={`${cardCls} p-4 lg:col-span-2`}>
          <SectionLabel>{t("dash.errorsTitle")}</SectionLabel>
          {(stats.recentErrors ?? []).length === 0 ? (
            <p className="mt-2 text-fr-sm text-muted">{t("dash.errorsEmpty")}</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {stats.recentErrors!.map((e, i) => (
                <li key={i} className="flex gap-3 text-fr-sm">
                  <span className="shrink-0 font-mono text-faint">{f.fmtDateTime(e.at)}</span>
                  {e.case_id && (
                    <Link href={`/symulacje/${e.case_id}`} className="shrink-0 font-mono text-muted hover:text-accent">{e.case_id}</Link>
                  )}
                  <span className="min-w-0 truncate text-ink" title={e.message}>{e.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Ostatnie zlecenia */}
      <div>
        <SectionLabel className="mb-3 block">{t("recent")}</SectionLabel>
        <div className={`${cardCls} overflow-hidden overflow-x-auto`}>
          <table className={`${tableCls} min-w-[720px]`}>
            <thead>
              <tr className={theadRowCls}>
                {[t("cols.status"), t("cols.caseId"), t("cols.email"), t("cols.file"), t("cols.server"), t("cols.price"), t("cols.date")].map((h) => (
                  <th key={h} className={thCls}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline-soft">
              {stats.recent.map((r) => (
                <tr key={r.case_id} className={trCls}>
                  <td className="px-3 py-2"><span className={statusMeta(r.status).cls}>{ts(statusMeta(r.status).key)}</span></td>
                  <td className="px-3 py-2 font-mono text-muted">
                    <Link href={`/symulacje/${r.case_id}`} className="transition-colors hover:text-accent">{r.case_id}</Link>
                  </td>
                  <td className={`${tdCls} max-w-[140px] truncate`}>{r.email}</td>
                  <td className={`${tdCls} max-w-[120px] truncate`}>{r.file_name}</td>
                  <td className={`${tdCls} font-mono uppercase`}>{r.server_type ?? "—"}</td>
                  <td className={`${tdNumCls} text-ink`}>{f.fmtPrice(r.price)}</td>
                  <td className={`${tdCls} whitespace-nowrap`}>{f.fmtDateTime(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
