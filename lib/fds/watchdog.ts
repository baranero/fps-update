// ─── Nadzorca zleceń: kiedy uznajemy obliczenia za martwe ────────────────────
//
// Reguła jest jedna: **liczy się postęp, nie czas trwania**. Wolno idąca
// symulacja jest zdrowa i nie wolno jej ubić — źle oszacowany czas to nasz błąd
// wyceny, nie powód, żeby wyrzucić do kosza kilkanaście godzin cudzych obliczeń.
// Zwalniamy maszynę dopiero wtedy, gdy solver stanie w miejscu.
//
// Poprzednia reguła („dłużej niż 3× szacowany wall_hours") kasowała poprawne
// zlecenia, bo mierzyła jakość naszej prognozy, a nie stan obliczeń.
//
// Progi mieszkają tutaj, bo korzysta z nich zarówno cron ubijający maszyny
// (app/api/cron/cleanup/route.ts), jak i strona tłumacząca użytkownikowi, co się
// stało (lib/fds/errors.ts). Dwie kopie tych samych liczb potrafiły się
// rozjechać, a wtedy strona opisywała przerwanie inną regułą niż ta, która je
// faktycznie wywołała.

/** Bez postępu przez tyle godzin uznajemy obliczenia za zawieszone. */
export const STALL_HOURS = 3;

/** Tyle czekamy na przejście z „dispatched" w „running" (boot + instalacja FDS). */
export const DISPATCH_TIMEOUT_H = 2;

/** Czas symulacji z ostatniego kroku zapisanego w logu FDS [s]. */
export function lastSimulationTime(log: string | null): number | null {
  if (!log) return null;
  const m = Array.from(log.matchAll(/Simulation Time:\s*([\d.E+-]+)\s*s/g));
  if (!m.length) return null;
  const t = parseFloat(m[m.length - 1][1]);
  return Number.isFinite(t) ? t : null;
}

/**
 * Ślad postępu odczytany z logu. Bierzemy DWA niezależne sygnały:
 *   • czas symulacji — rośnie, gdy solver robi kroki,
 *   • długość logu — rośnie, gdy maszyna w ogóle cokolwiek pisze.
 * Wystarczy, że ruszył się którykolwiek, żeby uznać zlecenie za żywe. Taki
 * asymetryczny warunek jest celowy: fałszywe „żyje" kosztuje nas godziny pracy
 * maszyny, fałszywe „martwe" kosztuje klienta całe obliczenia.
 */
export interface ProgressMark {
  simTime: number | null;
  logBytes: number;
}

export function progressMark(log: string | null): ProgressMark {
  return { simTime: lastSimulationTime(log), logBytes: log?.length ?? 0 };
}

/** Czy od poprzedniego odczytu cokolwiek drgnęło. */
export function hasAdvanced(prev: Partial<ProgressMark> | null, next: ProgressMark): boolean {
  if (!prev) return true; // pierwszy pomiar — nie mamy z czym porównać
  const prevSim = prev.simTime ?? null;
  const prevBytes = prev.logBytes ?? 0;
  if (next.simTime !== null && (prevSim === null || next.simTime > prevSim)) return true;
  return next.logBytes > prevBytes;
}

/** Ile godzin minęło od podanej chwili; null gdy brak punktu odniesienia. */
export function hoursSince(iso: string | null | undefined, now: Date = new Date()): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return (now.getTime() - t) / 3_600_000;
}
