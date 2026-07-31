"use client";

import { useEffect, useRef, useState } from "react";
import { marketingUrl } from "@/lib/cloud";
import { chipCls, type Tone } from "@/lib/tone";
import { PageHead, Shell, cardCls } from "@/components/Cloud/ui";

type Report = {
  id: string;
  calculator: string;
  format: string | null;
  project_name: string | null;
  share_url: string | null;
  created_at: string;
};

// Format pliku to metadana, nie stan alarmowy — dlatego chip idzie tonem
// systemu (czerwień marki / stal / zieleń), a nie surową paletą Tailwinda.
const FORMAT_TONE: Record<string, Tone> = {
  PDF: "primary",
  DOCX: "signal",
  XLSX: "ok",
  CNBOP: "muted",
};

function calculatorHref(calculator: string): string {
  return marketingUrl(
    calculator.includes("CNBOP")
      ? "/narzedzia/kalkulatory/cnbop"
      : "/narzedzia/kalkulatory"
  );
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
      className="w-full rounded-tile border border-primary/40 bg-canvas px-2 py-0.5 text-fr-body font-medium text-ink outline-none focus:ring-1 focus:ring-primary"
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
    <Shell>
      <div className="space-y-8">

      <PageHead
        kicker="FDSRUN // RAPORTY PDF"
        title="Historia raportów"
        lead="Kliknij projekt, aby wrócić do kalkulatora z danymi."
        back={{ href: "/symulacje", label: "Pulpit" }}
      />

      {loading ? (
        <p className="text-fr-sm text-muted">Ładowanie…</p>
      ) : reports.length === 0 ? (
        // Kalkulatory żyją na fp-solutions.pl, więc to zwykły <a> — `EmptyState`
        // przyjmuje wyłącznie ścieżki wewnętrzne routera chmury.
        <div className="rounded-card border border-dashed border-hairline px-6 py-10 text-center">
          <p className="text-fr-sm text-muted">Brak zapisanych raportów.</p>
          <a
            href={marketingUrl("/narzedzia/kalkulatory")}
            className="mt-3 inline-flex items-center gap-1.5 font-mono text-fr-label uppercase text-primary transition-opacity hover:opacity-80"
          >
            Przejdź do kalkulatorów <span aria-hidden>↗</span>
          </a>
        </div>
      ) : (
        <div className={`${cardCls} overflow-hidden`}>
          <div className="divide-y divide-hairline-soft">
            {reports.map((r) => (
              <div
                key={r.id}
                className="group relative flex items-center gap-3 bg-panel px-4 py-3.5 transition-colors hover:bg-panel-deep"
              >
                {/* badge */}
                <span className={chipCls(FORMAT_TONE[r.format ?? "CNBOP"] ?? "muted")}>
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
                      className="block truncate text-fr-body font-medium text-ink transition-colors hover:text-primary"
                    >
                      {r.project_name ?? <span className="font-normal italic text-faint">Brak nazwy</span>}
                    </a>
                  )}
                  <p className="mt-0.5 truncate font-mono text-fr-sm text-muted">
                    {r.calculator}
                  </p>
                </div>

                {/* date */}
                <p className="shrink-0 font-mono text-fr-sm text-muted">
                  {new Date(r.created_at).toLocaleDateString("pl-PL", {
                    day: "numeric", month: "short", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>

                {/* edit name */}
                <button
                  onClick={() => setEditingId(r.id)}
                  className="shrink-0 rounded-tile p-1 text-faint opacity-0 transition-all hover:text-ink group-hover:opacity-100"
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
                  className="shrink-0 rounded-tile p-1 text-faint opacity-0 transition-all hover:text-primary group-hover:opacity-100"
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
    </Shell>
  );
}
