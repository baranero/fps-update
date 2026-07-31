"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ACTIVE_STATUSES, isFailed, statusChart } from "@/lib/status";
import { useIsDark } from "@/components/Cloud/chartTheme";
import { MonthlyBars, MonthlyVolume, ServerShare, StatusDonut } from "@/components/Cloud/charts";
import { fmtHours, fmtPrice } from "@/lib/format";
import { EmptyState, Kpi, PageHead, SectionLabel, Shell, Skeleton } from "@/components/Cloud/ui";

type Item = {
  case_id: string;
  status: string;
  created_at: string;
  price: number;
  wall_hours: number;
  server_type: string | null;
  total_cells: number;
};

function buildMonthlyData(items: Item[]) {
  const map = new Map<string, { month: string; koszt: number; szt: number; godziny: number }>();

  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pl-PL", { month: "short", year: "2-digit" });
    map.set(key, { month: label.charAt(0).toUpperCase() + label.slice(1), koszt: 0, szt: 0, godziny: 0 });
  }

  for (const item of items) {
    const d = new Date(item.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (map.has(key)) {
      const entry = map.get(key)!;
      entry.szt += 1;
      entry.koszt += item.price;
      entry.godziny += item.wall_hours;
    }
  }

  return Array.from(map.values());
}

function buildStatusData(items: Item[], dark: boolean) {
  const palette   = statusChart(dark);
  const done      = items.filter((s) => s.status === "done").length;
  const active    = items.filter((s) => ACTIVE_STATUSES.has(s.status)).length;
  const failed    = items.filter((s) => isFailed(s.status)).length;
  const cancelled = items.filter((s) => s.status === "cancelled").length;
  return [
    { name: "Zakończone", value: done,      color: palette.done },
    { name: "W toku",     value: active,    color: palette.active },
    { name: "Błędy",      value: failed,    color: palette.failed },
    { name: "Anulowane",  value: cancelled, color: palette.cancelled },
  ].filter((d) => d.value > 0);
}

function buildServerData(items: Item[]) {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = item.server_type ?? "nieznany";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name: name.toUpperCase(), count }))
    .sort((a, b) => b.count - a.count);
}

// Ramka podpowiedzi — jedna dla wszystkich wykresów strony, w tej samej
export default function StatystykiPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const dark = useIsDark();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoggedIn(false); setLoading(false); return; }
      setLoggedIn(true);
      const res = await fetch("/api/rozliczenia");
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
      setLoading(false);
    }
    load();
  }, []);

  const monthly    = buildMonthlyData(items);
  const statuses   = buildStatusData(items, dark);
  const servers    = buildServerData(items);

  const totalCost  = items.filter((s) => s.status === "done").reduce((s, i) => s + i.price, 0);
  const totalHours = items.reduce((s, i) => s + i.wall_hours, 0);
  const countDone  = items.filter((s) => s.status === "done").length;
  const avgCost    = countDone > 0 ? totalCost / countDone : 0;

  const head = (
    <PageHead
      kicker="FDSRUN // ZUŻYCIE"
      title="Statystyki"
      lead="Przegląd aktywności obliczeniowej — ostatnie 12 miesięcy."
      back={{ href: "/symulacje", label: "Pulpit" }}
    />
  );

  if (loading) return (
    <Shell>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} />)}
      </div>
    </Shell>
  );

  if (loggedIn === false) return (
    <Shell>
      <EmptyState text="Zaloguj się, aby zobaczyć statystyki." cta={{ href: "/signin", label: "Zaloguj się" }} />
    </Shell>
  );

  if (items.length === 0) return (
    <Shell>
      <div className="space-y-8">
        {head}
        <EmptyState
          text="Brak danych — wyślij pierwsze zlecenie FDS."
          cta={{ href: "/symulacje/nowa", label: "Wyślij zlecenie" }}
        />
      </div>
    </Shell>
  );

  return (
    <Shell>
    <div className="space-y-10">

      {head}

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label="Symulacje łącznie"    value={String(items.length)}                     sub={`${countDone} zakończone`} />
        <Kpi label="Łączny koszt netto"   value={fmtPrice(totalCost, { decimals: true })}  sub="zakończone" />
        <Kpi label="Łączny czas obliczeń" value={fmtHours(totalHours)}                     sub="wall time" />
        <Kpi label="Śr. koszt / sym."     value={avgCost > 0 ? fmtPrice(avgCost, { decimals: true }) : "—"} sub="zakończone" tone="primary" />
      </div>

      {/* Koszty po miesiącach */}
      <div>
        <SectionLabel className="mb-4 block">Koszty netto po miesiącach (zł)</SectionLabel>
        <MonthlyBars data={monthly} dataKey="koszt" tipLabel="Koszt" format={(v) => fmtPrice(v, { decimals: true })} />
      </div>

      {/* Liczba symulacji + godziny */}
      <div>
        <SectionLabel className="mb-4 block">Symulacje i czas obliczeń po miesiącach</SectionLabel>
        <MonthlyVolume data={monthly} gradientId="stats" countLabel="Symulacje" />
      </div>

      {/* Dolny rząd: donut + serwery */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

        {/* Rozkład statusów */}
        <div>
          <SectionLabel className="mb-4 block">Rozkład statusów</SectionLabel>
          <StatusDonut data={statuses} total={items.length} />
        </div>

        {/* Serwery */}
        <div>
          <SectionLabel className="mb-4 block">Typ serwera obliczeniowego</SectionLabel>
          <ServerShare data={servers} total={items.length} />
        </div>

      </div>

    </div>
    </Shell>
  );
}
