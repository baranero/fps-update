"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Report = {
  id: string;
  calculator: string;
  format: string | null;
  project_name: string | null;
  share_url: string | null;
  created_at: string;
};

const FORMAT_STYLE: Record<string, string> = {
  PDF:  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  DOCX: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  XLSX: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  CNBOP: "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400",
};

function calculatorHref(calculator: string): string {
  if (calculator.includes("CNBOP")) return "/narzedzia/kalkulatory/cnbop";
  return "/narzedzia/kalkulatory";
}

function InlineEdit({
  reportId,
  initial,
  onUpdated,
  onClose,
}: {
  reportId: string;
  initial: string | null;
  onUpdated: (name: string | null) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const save = async () => {
    setSaving(true);
    const newName = value.trim() || null;
    try {
      await fetch(`/api/raporty/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_name: newName }),
      });
      onUpdated(newName);
    } catch { /* ignore */ }
    setSaving(false);
    onClose();
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={e => setValue(e.target.value)}
      onKeyDown={e => {
        if (e.key === "Enter") save();
        if (e.key === "Escape") { setValue(initial ?? ""); onClose(); }
      }}
      onBlur={save}
      disabled={saving}
      className="w-full rounded border border-primary/40 bg-white dark:bg-[#0B1120] px-2 py-0.5 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
    />
  );
}

export default function RaportyPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/raporty");
      const data = await res.json().catch(() => []);
      setReports(data);
      setLoading(false);
    }
    load();
  }, []);

  const handleNameUpdated = (id: string, name: string | null) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, project_name: name } : r));
  };

  const handleDelete = async (id: string) => {
    setReports(prev => prev.filter(r => r.id !== id));
    await fetch(`/api/raporty/${id}`, { method: "DELETE" });
  };

  return (
    <div className="space-y-8">

      <div className="border-b border-slate-200 dark:border-slate-700 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Historia raportów</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Kliknij projekt, aby wrócić do kalkulatora z danymi.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">Ładowanie…</p>
      ) : reports.length === 0 ? (
        <div className="rounded-md border border-slate-100 dark:border-slate-800 px-6 py-10 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Brak zapisanych raportów.</p>
          <Link href="/narzedzia/kalkulatory" className="text-sm font-medium text-primary hover:underline">
            Przejdź do kalkulatorów →
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {reports.map((r) => (
              <div
                key={r.id}
                className="group relative flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-[#1E232E] hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
              >
                {/* badge */}
                <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${FORMAT_STYLE[r.format ?? "CNBOP"] ?? FORMAT_STYLE.CNBOP}`}>
                  {r.format ?? "CNBOP"}
                </span>

                {/* name + calculator — clickable link or inline edit */}
                <div className="flex-1 min-w-0">
                  {editingId === r.id ? (
                    <InlineEdit
                      reportId={r.id}
                      initial={r.project_name}
                      onUpdated={(name) => handleNameUpdated(r.id, name)}
                      onClose={() => setEditingId(null)}
                    />
                  ) : (
                    <a
                      href={r.share_url ?? calculatorHref(r.calculator)}
                      className="block truncate text-sm font-medium text-slate-800 dark:text-slate-200 hover:text-primary dark:hover:text-primary transition-colors"
                    >
                      {r.project_name ?? <span className="text-slate-400 italic font-normal">Brak nazwy</span>}
                    </a>
                  )}
                  <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                    {r.calculator}
                  </p>
                </div>

                {/* date */}
                <p className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                  {new Date(r.created_at).toLocaleDateString("pl-PL", {
                    day: "numeric", month: "short", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>

                {/* edit name */}
                <button
                  onClick={() => setEditingId(r.id)}
                  className="shrink-0 p-1 rounded text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-all"
                  title="Zmień nazwę"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>

                {/* delete */}
                <button
                  onClick={() => handleDelete(r.id)}
                  className="shrink-0 p-1 rounded text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  title="Usuń"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
