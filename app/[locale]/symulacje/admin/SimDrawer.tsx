"use client";

import { useEffect, useState } from "react";
import { ADMIN_STATUS_KEYS, statusMeta } from "@/lib/status";
import { useTranslations } from "next-intl";
import { useFormat } from "@/lib/format";
import { Btn, BtnLink, SectionLabel, cardCls, iconBtnCls, inputSmCls, labelCls } from "@/components/Cloud/ui";

export type Sim = {
  case_id: string; email: string; name: string; file_name: string;
  status: string; created_at: string; completed_at: string | null;
  price: number | null; server_type: string | null; wall_hours: number | null;
  total_cells: number | null;
  hetzner_cost_eur?: number | null; hetzner_runtime_h?: number | null;
};

// Rozliczenie zlecenia: cena dla klienta vs. realny koszt przebiegu (serwer + storage).
type Cost = {
  price: number | null;
  eurPln: number;
  runtimeH: number | null;
  hourlyNet: number | null;
  serverEur: number | null;
  storageGb: number | null;
  storageEur: number | null;
  costEur: number | null;
  costPln: number | null;
  marginPln: number | null;
  markup: number | null;
  marginPct: number | null;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 font-mono text-fr-micro uppercase text-muted">{label}</p>
      <div className="text-fr-sm text-ink">{children}</div>
    </div>
  );
}

export default function SimDrawer({
  sim,
  onClose,
  onSaved,
  onDeleted,
}: {
  sim: Sim;
  onClose: () => void;
  onSaved: (patch: Partial<Sim>) => void;
  onDeleted?: (caseId: string) => void;
}) {
  const t = useTranslations("admin.drawer");
  const ta = useTranslations("admin");
  const ts = useTranslations("status");
  const f = useFormat();
  const [status, setStatus] = useState(sim.status);
  const [price, setPrice] = useState(sim.price == null ? "" : String(sim.price));
  const [server, setServer] = useState(sim.server_type ?? "");
  const [hours, setHours] = useState(sim.wall_hours == null ? "" : String(sim.wall_hours));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cost, setCost] = useState<Cost | null>(null);
  const [costLoading, setCostLoading] = useState(true);

  // Rozliczenie liczone po otwarciu szuflady (storage wymaga LIST po magazynie,
  // więc nie ma tego w danych listy).
  useEffect(() => {
    let cancelled = false;
    setCostLoading(true);
    fetch(`/api/admin/symulacje/${sim.case_id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d && !d.error) setCost(d as Cost); })
      .catch(() => { /* brak rozliczenia — pokażemy myślnik */ })
      .finally(() => { if (!cancelled) setCostLoading(false); });
    return () => { cancelled = true; };
  }, [sim.case_id]);

  const del = async () => {
    if (!window.confirm(ta("deleteConfirm", { caseId: sim.case_id }))) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/symulacje/${sim.case_id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      onDeleted?.(sim.case_id);
      onClose();
    } else {
      window.alert(ta("deleteFailed"));
    }
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  // Marżę liczymy z BIEŻĄCEJ ceny (a nie z odpowiedzi API), żeby po edycji ceny
  // w szufladzie liczby nadal się zgadzały bez ponownego pobierania rozliczenia.
  const costPln = cost?.costPln ?? null;
  const marginPln = sim.price != null && costPln != null ? sim.price - costPln : null;
  const markup = sim.price != null && costPln ? sim.price / costPln : null;
  const marginPct =
    sim.price != null && marginPln != null && sim.price !== 0 ? (marginPln / sim.price) * 100 : null;

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
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={t("jobAria", { caseId: sim.case_id })}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-canvas/70 backdrop-blur-[1px]" onClick={onClose} />

      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md animate-[slideIn_.2s_ease-out] overflow-y-auto border-l border-hairline bg-panel shadow-fr-panel">
        <style>{`@keyframes slideIn{from{transform:translateX(24px);opacity:.4}to{transform:translateX(0);opacity:1}}`}</style>

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-hairline bg-panel px-5 py-4">
          <div className="min-w-0">
            <p className="font-mono text-fr-micro uppercase text-muted">{t("job")}</p>
            <p className="truncate font-mono text-fr-body text-ink">{sim.case_id}</p>
          </div>
          <button onClick={onClose} aria-label={t("close")} className={iconBtnCls()}>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5 space-y-6">

          {/* Read-only info */}
          <div className="grid grid-cols-2 gap-4">
            <Field label={t("client")}><span className="truncate block">{sim.email}</span></Field>
            <Field label={t("name")}>{sim.name || "—"}</Field>
            <Field label={t("file")}><span className="break-all font-mono text-fr-sm">{sim.file_name}</span></Field>
            <Field label={t("cells")}>{f.fmtInt(sim.total_cells)}</Field>
            <Field label={t("created")}>{f.fmtDateTime(sim.created_at)}</Field>
            <Field label={t("completed")}>{f.fmtDateTime(sim.completed_at)}</Field>
          </div>

          {/* Rozliczenie — ile płaci klient vs. ile realnie kosztuje nas przebieg */}
          <div className={`${cardCls} overflow-hidden`}>
            <div className="border-b border-hairline bg-panel-deep px-4 py-2.5">
              <SectionLabel>{t("billing")}</SectionLabel>
            </div>
            <div className="space-y-3 p-4">

              <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-fr-micro uppercase text-muted">{t("clientPrice")}</span>
                <span className="fr-num font-heading text-fr-h3 text-ink">{f.fmtPrice(sim.price)}</span>
              </div>

              <div className="space-y-1.5 rounded-panel border border-hairline-soft bg-panel-deep px-3 py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-fr-micro uppercase text-muted">{t("ownCost")}</span>
                  <span className="fr-num font-mono text-fr-body text-warn">
                    {costPln != null ? f.fmtPrice(costPln, { decimals: true }) : costLoading ? "…" : "—"}
                    {cost?.costEur != null && (
                      <span className="ml-1 text-fr-sm font-normal text-faint">({f.fmtEur(cost.costEur)})</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between font-mono text-fr-sm text-muted">
                  <span>{t("server")}{cost?.runtimeH != null ? ` · ${f.fmtHours(cost.runtimeH)}` : ""}</span>
                  <span className="fr-num">{f.fmtEur(cost?.serverEur)}</span>
                </div>
                <div className="flex items-center justify-between font-mono text-fr-sm text-muted">
                  <span>{t("storage")}{cost?.storageGb != null ? ` · ${cost.storageGb.toFixed(2)} GB` : ""}</span>
                  <span className="fr-num">{f.fmtEur(cost?.storageEur)}</span>
                </div>
              </div>

              <div className="flex items-baseline justify-between gap-3 border-t border-hairline-soft pt-3">
                <span className="font-mono text-fr-micro uppercase text-muted">{t("margin")}</span>
                <span className="text-right">
                  <span className={`fr-num font-heading text-fr-h3 ${
                    marginPln == null ? "text-faint" : marginPln >= 0 ? "text-ok" : "text-primary"
                  }`}>
                    {marginPln != null ? f.fmtPrice(marginPln, { decimals: true }) : costLoading ? "…" : "—"}
                  </span>
                  {(markup != null || marginPct != null) && (
                    <span className="fr-num block font-mono text-fr-sm text-faint">
                      {markup != null ? t("markup", { x: markup.toFixed(1) }) : ""}
                      {markup != null && marginPct != null ? " · " : ""}
                      {marginPct != null ? t("ofPrice", { pct: marginPct.toFixed(0) }) : ""}
                    </span>
                  )}
                </span>
              </div>

              <p className="text-fr-sm text-faint">
                {t("costNote")}
                {cost?.eurPln != null ? t("fxNote", { rate: cost.eurPln }) : ""}
              </p>
            </div>
          </div>

          {/* Pobranie oryginalnego pliku wsadowego .fds */}
          <a
            href={`/api/admin/symulacje/${sim.case_id}/download-fds`}
            download
            className="flex items-center justify-center gap-2 rounded-panel border border-hairline bg-panel px-4 py-2.5 text-fr-body font-semibold text-ink transition-colors hover:border-primary/40 hover:text-primary"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {ta("downloadFds")}
          </a>

          <div className="border-t border-hairline-soft" />

          {/* Editable */}
          <div className="space-y-4">
            <SectionLabel>{t("edit")}</SectionLabel>

            <label className="block">
              <span className={labelCls}>{ta("cols.status")}</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputSmCls}>
                {ADMIN_STATUS_KEYS.map((k) => <option key={k} value={k}>{ts(statusMeta(k).key)}</option>)}
              </select>
              {status === "cancelled" && sim.status !== "cancelled" && (
                <span className="mt-1.5 block text-fr-sm text-warn">{t("cancelWarning")}</span>
              )}
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={labelCls}>{t("price")}</span>
                <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal"
                  className={`${inputSmCls} fr-num font-mono`} />
              </label>
              <label className="block">
                <span className={labelCls}>{t("hours")}</span>
                <input value={hours} onChange={(e) => setHours(e.target.value)} inputMode="decimal"
                  className={`${inputSmCls} fr-num font-mono`} />
              </label>
            </div>

            <label className="block">
              <span className={labelCls}>{t("serverType")}</span>
              <input value={server} onChange={(e) => setServer(e.target.value)} placeholder="np. cpx41"
                className={`${inputSmCls} font-mono`} />
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Btn onClick={save} disabled={!dirty || saving} className="flex-1">
              {saving ? t("saving") : saved ? t("saved") : t("save")}
            </Btn>
            <BtnLink href={`/symulacje/${sim.case_id}`} variant="secondary">
              {t("open")}
            </BtnLink>
          </div>

          {/* Strefa niebezpieczna — trwałe usunięcie */}
          <div className="border-t border-primary/30 pt-4">
            <Btn variant="danger" onClick={del} disabled={deleting} className="w-full">
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {deleting ? t("deleting") : t("delete")}
            </Btn>
          </div>

        </div>
      </div>
    </div>
  );
}
