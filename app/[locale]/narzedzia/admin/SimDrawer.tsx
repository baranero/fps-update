"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { ADMIN_STATUS_KEYS, statusMeta } from "@/lib/status";
import { fmtDateTime } from "@/lib/format";

export type Sim = {
  case_id: string; email: string; name: string; file_name: string;
  status: string; created_at: string; completed_at: string | null;
  price: number | null; server_type: string | null; wall_hours: number | null;
  total_cells: number | null;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      <div className="text-sm text-slate-700 dark:text-slate-200">{children}</div>
    </div>
  );
}

export default function SimDrawer({
  sim,
  onClose,
  onSaved,
}: {
  sim: Sim;
  onClose: () => void;
  onSaved: (patch: Partial<Sim>) => void;
}) {
  const [status, setStatus] = useState(sim.status);
  const [price, setPrice] = useState(sim.price == null ? "" : String(sim.price));
  const [server, setServer] = useState(sim.server_type ?? "");
  const [hours, setHours] = useState(sim.wall_hours == null ? "" : String(sim.wall_hours));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const dirty =
    status !== sim.status ||
    price !== (sim.price == null ? "" : String(sim.price)) ||
    server !== (sim.server_type ?? "") ||
    hours !== (sim.wall_hours == null ? "" : String(sim.wall_hours));

  const save = async () => {
    setSaving(true);
    const body: Record<string, unknown> = {};
    const patch: Partial<Sim> = {};
    if (status !== sim.status) { body.status = status; patch.status = status; }
    const priceNum = parseFloat(price.replace(",", "."));
    if (price !== (sim.price == null ? "" : String(sim.price)) && !isNaN(priceNum)) { body.price = priceNum; patch.price = priceNum; }
    if (server !== (sim.server_type ?? "")) { body.server_type = server || null; patch.server_type = server || null; }
    const hoursNum = parseFloat(hours.replace(",", "."));
    if (hours !== (sim.wall_hours == null ? "" : String(sim.wall_hours)) && !isNaN(hoursNum)) { body.wall_hours = hoursNum; patch.wall_hours = hoursNum; }

    const res = await fetch(`/api/admin/symulacje/${sim.case_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      onSaved(patch);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    }
  };

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={`Zlecenie ${sim.case_id}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]" onClick={onClose} />

      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-[#141922] border-l border-slate-200 dark:border-slate-700 shadow-2xl overflow-y-auto animate-[slideIn_.2s_ease-out]">
        <style>{`@keyframes slideIn{from{transform:translateX(24px);opacity:.4}to{transform:translateX(0);opacity:1}}`}</style>

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-[#141922] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Zlecenie</p>
            <p className="font-mono text-sm font-semibold text-slate-900 dark:text-white truncate">{sim.case_id}</p>
          </div>
          <button onClick={onClose} aria-label="Zamknij" className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5 space-y-6">

          {/* Read-only info */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Klient"><span className="truncate block">{sim.email}</span></Field>
            <Field label="Nazwa">{sim.name || "—"}</Field>
            <Field label="Plik"><span className="font-mono text-xs break-all">{sim.file_name}</span></Field>
            <Field label="Komórki">{sim.total_cells != null ? sim.total_cells.toLocaleString("pl-PL") : "—"}</Field>
            <Field label="Utworzono">{fmtDateTime(sim.created_at)}</Field>
            <Field label="Ukończono">{fmtDateTime(sim.completed_at)}</Field>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800" />

          {/* Editable */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Edycja</p>

            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#0B1120] px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {ADMIN_STATUS_KEYS.map((k) => <option key={k} value={k}>{statusMeta(k).label}</option>)}
              </select>
              {status === "cancelled" && sim.status !== "cancelled" && (
                <span className="mt-1 block text-[11px] text-amber-600 dark:text-amber-400">Zapis anuluje zlecenie i zatrzyma serwer Hetzner (jeśli aktywny).</span>
              )}
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Cena (zł)</span>
                <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal"
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#0B1120] px-3 py-2 text-sm tabular-nums text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary" />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Czas (h)</span>
                <input value={hours} onChange={(e) => setHours(e.target.value)} inputMode="decimal"
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#0B1120] px-3 py-2 text-sm tabular-nums text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary" />
              </label>
            </div>

            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Typ serwera</span>
              <input value={server} onChange={(e) => setServer(e.target.value)} placeholder="np. cpx41"
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#0B1120] px-3 py-2 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary" />
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={save}
              disabled={!dirty || saving}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {saving ? "Zapisywanie…" : saved ? "Zapisano ✓" : "Zapisz zmiany"}
            </button>
            <Link
              href={`/narzedzia/symulacje/${sim.case_id}`}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Otwórz
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
