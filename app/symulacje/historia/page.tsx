"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:    { label: "Oczekuje",   cls: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400" },
  dispatched: { label: "W kolejce",  cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  running:    { label: "W trakcie",  cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  done:       { label: "Zakończone", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  failed:     { label: "Błąd",       cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  cancelled:  { label: "Anulowane",  cls: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400" },
  error:      { label: "Błąd",       cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, cls: "bg-slate-100 text-slate-500" };
  return (
    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.cls}`}>
      {s.label}
    </span>
  );
}

function formatHours(h: number) {
  if (h < 1) return `${Math.round(h * 60)} min`;
  return `${h.toFixed(1)} h`;
}

function formatCells(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} tys.`;
  return String(n);
}

export default function HistoriaSymulacjiPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const ACTIVE = new Set(["pending", "dispatched", "running"]);

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
        setDeleteError(d.error ?? "Błąd usuwania.");
        setDeleting(null);
        return;
      }
      setSubmissions((prev) => prev.filter((s) => s.case_id !== caseId));
      setConfirmDelete(null);
    } catch {
      setDeleteError("Błąd połączenia.");
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

  return (
    <section className="relative z-10 bg-slate-50 dark:bg-[#0B1120] min-h-screen py-10">
      <div className="container max-w-3xl">
        <div className="space-y-8">

          <div className="border-b border-slate-200 dark:border-slate-700 pb-5">
            <div className="flex items-center gap-2.5">
              <Link href="/symulacje" className="text-xs text-slate-400 dark:text-slate-500 hover:text-cyan-500 transition-colors mb-1 block">
                ← CFD Cloud
              </Link>
            </div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Historia symulacji</h1>
              {submissions.some((s) => ACTIVE.has(s.status)) && (
                <span className="flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Na żywo
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              Wszystkie zlecenia FDS powiązane z Twoim kontem.
            </p>
          </div>

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
              placeholder="Numer zlecenia (np. FDS-ABC123-XY)"
              className="flex-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] px-3 py-2 text-sm font-mono text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            <button
              type="submit"
              disabled={!search.trim()}
              className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Otwórz
            </button>
          </form>

          {loading ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">Ładowanie…</p>
          ) : loggedIn === false ? (
            <div className="rounded-md border border-slate-100 dark:border-slate-800 px-6 py-10 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                Zaloguj się, aby zobaczyć historię symulacji.
              </p>
              <Link href="/signin?next=/symulacje/historia" className="text-sm font-medium text-cyan-500 hover:underline">
                Zaloguj się →
              </Link>
            </div>
          ) : submissions.length === 0 ? (
            <div className="rounded-md border border-slate-100 dark:border-slate-800 px-6 py-10 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Brak zleconych symulacji.</p>
              <Link href="/symulacje" className="text-sm font-medium text-cyan-500 hover:underline">
                Wyślij pierwsze zlecenie →
              </Link>
            </div>
          ) : (
            <>
            {deleteError && (
              <p className="text-sm text-red-600 dark:text-red-400">{deleteError}</p>
            )}

            <div className="rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {submissions.map((s) => (
                  <div key={s.case_id} className="bg-white dark:bg-[#1E232E]">
                    {confirmDelete === s.case_id ? (
                      <div className="flex items-center gap-3 px-4 py-4">
                        <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">
                          Usunąć <span className="font-mono font-semibold">{s.case_id}</span>?
                          <span className="block text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {["pending", "dispatched", "running"].includes(s.status)
                              ? "Serwer obliczeniowy zostanie zatrzymany, a zlecenie usunięte."
                              : "Plik wejściowy i wyniki zostaną trwale usunięte."}
                          </span>
                        </span>
                        <button
                          onClick={() => handleDelete(s.case_id)}
                          disabled={deleting === s.case_id}
                          className="rounded px-3 py-1.5 text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          {deleting === s.case_id ? "Usuwam…" : "Usuń"}
                        </button>
                        <button
                          onClick={() => { setConfirmDelete(null); setDeleteError(null); }}
                          disabled={deleting === s.case_id}
                          className="rounded px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                        >
                          Anuluj
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 px-4 py-4 group">
                        <Link href={`/symulacje/${s.case_id}`} className="flex items-center gap-4 flex-1 min-w-0">
                          <StatusBadge status={s.status} />

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate mb-0.5">
                              {s.file_name}
                            </p>
                            <div className="flex items-center gap-3 flex-wrap">
                              <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500">{s.case_id}</p>
                              {s.server_type && (
                                <span className="text-[11px] uppercase font-semibold text-slate-400 dark:text-slate-500">
                                  {s.server_type}
                                </span>
                              )}
                              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                {s.mesh_count} {s.mesh_count === 1 ? "siatka" : "siatki"} · {formatCells(s.total_cells)} komórek
                              </span>
                              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                est. {formatHours(s.wall_hours)}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                              {s.price.toLocaleString("pl-PL")} zł
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500">
                              {new Date(s.created_at).toLocaleDateString("pl-PL", {
                                day: "numeric", month: "short", year: "numeric",
                              })}
                            </p>
                          </div>

                          <svg className="h-4 w-4 text-slate-300 group-hover:text-cyan-500 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>

                        <button
                          onClick={(e) => { e.preventDefault(); setConfirmDelete(s.case_id); setDeleteError(null); }}
                          title="Usuń zlecenie"
                          className="shrink-0 rounded p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
            </>
          )}

        </div>
      </div>
    </section>
  );
}
