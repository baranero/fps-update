"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { statusMeta, ACTIVE_STATUSES } from "@/lib/status";
import { fmtCells, fmtHours } from "@/lib/format";
import { Btn, Chip, EmptyState, FilterTabs, PageHead, Shell, cardCls, inputSmCls } from "@/components/Cloud/ui";

type Submission = {
  case_id: string;
  file_name: string;
  status: string;
  created_at: string;
  price: number;
  wall_hours: number;
  server_type: string | null;
  mesh_count: number;
  total_cells: number;
};

type FilterTab = "all" | "active" | "done" | "failed" | "cancelled";

// Etykieta w języku strony, ale forma i kolor z jednego źródła (`lib/status`) —
// ta sama, co na pulpicie, w rozliczeniach i w panelu admina.
function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("symHistory.status");
  const meta = statusMeta(status);
  const known = ["pending", "dispatched", "running", "done", "failed", "cancelled", "error"].includes(status);
  return <span className={meta.cls}>{known ? t(status) : status}</span>;
}

export default function HistoriaSymulacjiPage() {
  const t = useTranslations("symHistory");
  const locale = useLocale();
  const dateLocale = locale === "en" ? "en-GB" : "pl-PL";
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const ACTIVE = ACTIVE_STATUSES;

  async function fetchSubmissions() {
    const res = await fetch("/api/symulacje/historia");
    const data = await res.json();
    if (Array.isArray(data)) setSubmissions(data);
    return data as Submission[];
  }

  async function handleDelete(caseId: string) {
    setDeleting(caseId);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/symulacje/${caseId}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        setDeleteError(d.error ?? t("deleteError"));
        setDeleting(null);
        return;
      }
      setSubmissions((prev) => prev.filter((s) => s.case_id !== caseId));
      setConfirmDelete(null);
    } catch {
      setDeleteError(t("connError"));
    }
    setDeleting(null);
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoggedIn(false);
        setLoading(false);
        return;
      }
      setLoggedIn(true);

      const data = await fetchSubmissions();
      setLoading(false);

      if (data.some((s) => ACTIVE.has(s.status))) {
        intervalRef.current = setInterval(async () => {
          const updated = await fetchSubmissions();
          if (!updated.some((s) => ACTIVE.has(s.status))) {
            if (intervalRef.current) clearInterval(intervalRef.current);
          }
        }, 10_000);
      }
    }
    load();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = submissions.filter((s) => {
    if (filter === "active")    return ACTIVE.has(s.status);
    if (filter === "done")      return s.status === "done";
    if (filter === "failed")    return s.status === "failed" || s.status === "error";
    if (filter === "cancelled") return s.status === "cancelled";
    return true;
  });

  const TABS: Array<{ id: FilterTab; label: string; count: number }> = (
    [
      { id: "all",       label: t("tabAll"),       count: submissions.length },
      { id: "active",    label: t("tabActive"),    count: submissions.filter((s) => ACTIVE.has(s.status)).length },
      { id: "done",      label: t("tabDone"),      count: submissions.filter((s) => s.status === "done").length },
      { id: "failed",    label: t("tabFailed"),    count: submissions.filter((s) => s.status === "failed" || s.status === "error").length },
      { id: "cancelled", label: t("tabCancelled"), count: submissions.filter((s) => s.status === "cancelled").length },
    ] as Array<{ id: FilterTab; label: string; count: number }>
  ).filter((tab) => tab.id === "all" || tab.count > 0);

  return (
    <Shell width="md">
        <div className="space-y-8">

          <PageHead
            kicker="FDSRUN // ARCHIWUM ZLECEŃ"
            title={t("title")}
            lead={t("subtitle")}
            back={{ href: "/symulacje", label: t("back") }}
            badge={
              submissions.some((s) => ACTIVE.has(s.status)) ? (
                <Chip tone="warn" dot pulse>{t("live")}</Chip>
              ) : undefined
            }
          />

          {/* Szybki dostęp po numerze zlecenia */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const val = search.trim().toUpperCase();
              if (val) window.location.href = `/symulacje/${val}`;
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className={`${inputSmCls} flex-1 font-mono`}
            />
            <Btn type="submit" size="sm" disabled={!search.trim()} className="shrink-0 px-4">
              {t("open")}
            </Btn>
          </form>

          {loading ? (
            <p className="text-fr-sm text-muted">{t("loading")}</p>
          ) : loggedIn === false ? (
            <EmptyState
              text={t("loginPrompt")}
              cta={{ href: "/signin?next=/symulacje/historia", label: t("loginCta") }}
            />
          ) : submissions.length === 0 ? (
            <EmptyState text={t("empty")} cta={{ href: "/symulacje/nowa", label: t("emptyCta") }} />
          ) : (
            <>
            {deleteError && <p className="text-fr-sm text-primary">{deleteError}</p>}

            {/* Filtr: aktywne vs zakończone */}
            <FilterTabs tabs={TABS} active={filter} onPick={(id) => setFilter(id)} label={t("filterLabel")} />

            {filtered.length === 0 ? (
              <p className="py-8 text-center text-fr-sm text-muted">{t("noFilterResults")}</p>
            ) : (
            <div className={`${cardCls} overflow-hidden`}>
              <div className="divide-y divide-hairline-soft">
                {filtered.map((s) => (
                  <div key={s.case_id} className="bg-panel">
                    {confirmDelete === s.case_id ? (
                      <div className="flex items-center gap-3 px-4 py-4">
                        <span className="flex-1 text-fr-sm text-ink">
                          {t.rich("confirmDelete", { code: (c) => <span className="font-mono font-semibold">{c}</span>, id: s.case_id })}
                          <span className="mt-0.5 block text-fr-sm text-muted">
                            {ACTIVE.has(s.status) ? t("confirmActive") : t("confirmDone")}
                          </span>
                        </span>
                        <Btn
                          variant="primary"
                          size="sm"
                          onClick={() => handleDelete(s.case_id)}
                          disabled={deleting === s.case_id}
                        >
                          {deleting === s.case_id ? t("deleting") : t("delete")}
                        </Btn>
                        <Btn
                          variant="secondary"
                          size="sm"
                          onClick={() => { setConfirmDelete(null); setDeleteError(null); }}
                          disabled={deleting === s.case_id}
                        >
                          {t("cancel")}
                        </Btn>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 px-4 py-4 group">
                        <Link href={`/symulacje/${s.case_id}`} className="flex items-center gap-4 flex-1 min-w-0">
                          <StatusBadge status={s.status} />

                          <div className="min-w-0 flex-1">
                            <p className="mb-0.5 truncate text-fr-body font-medium text-ink">
                              {s.file_name}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-fr-sm text-muted">
                              <span>{s.case_id}</span>
                              {s.server_type && <span className="uppercase">{s.server_type}</span>}
                              <span>
                                {t("meshes", { count: s.mesh_count })} · {fmtCells(s.total_cells)} {t("cellsWord")}
                              </span>
                              <span>{t("est", { time: fmtHours(s.wall_hours) })}</span>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="fr-num font-mono text-fr-sm text-ink">
                              {s.price.toLocaleString(dateLocale)} zł
                            </p>
                            <p className="font-mono text-fr-sm text-muted">
                              {new Date(s.created_at).toLocaleDateString(dateLocale, {
                                day: "numeric", month: "short", year: "numeric",
                              })}
                            </p>
                          </div>

                          <svg className="h-4 w-4 shrink-0 text-faint transition-colors group-hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>

                        <button
                          onClick={(e) => { e.preventDefault(); setConfirmDelete(s.case_id); setDeleteError(null); }}
                          title={t("deleteTitle")}
                          className="shrink-0 rounded-tile p-1.5 text-faint transition-colors hover:bg-primary/10 hover:text-primary"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            )}
            </>
          )}

        </div>
    </Shell>
  );
}
