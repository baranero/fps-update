// ─── Dostęp do uruchamiania symulacji ────────────────────────────────────────
//
// Moduł izomorficzny: żadnego env ani fetcha na poziomie modułu, więc te same
// reguły obowiązują w przeglądarce (co pokazać) i na serwerze (co przepuścić).
// Źródłem prawdy jest zawsze serwer — klient używa tego wyłącznie do UI.

/** Stan dostępu konta. Odpowiada kolumnie `profiles.sim_access`. */
export type SimAccess = "none" | "requested" | "granted" | "blocked";

export const SIM_ACCESS_VALUES: readonly SimAccess[] = ["none", "requested", "granted", "blocked"];

export function isSimAccess(v: unknown): v is SimAccess {
  return typeof v === "string" && (SIM_ACCESS_VALUES as readonly string[]).includes(v);
}

/** Bezpieczne odczytanie wartości z bazy — nieznana/pusta znaczy „brak dostępu". */
export function toSimAccess(v: unknown): SimAccess {
  return isSimAccess(v) ? v : "none";
}

/**
 * Czy konto może uruchomić płatne obliczenia.
 *
 * Admin zawsze — inaczej właściciel nie mógłby przetestować własnego serwisu.
 * Reszta wyłącznie po świadomej zgodzie właściciela, bo maszyna startuje przed
 * płatnością (rozliczenie jest po obliczeniach, wg realnego zużycia).
 */
export function canRunSimulations(opts: { isAdmin: boolean; access: SimAccess }): boolean {
  return opts.isAdmin || opts.access === "granted";
}

/** Czy konto może (jeszcze) poprosić o dostęp. Odmowa jest ostateczna. */
export function canRequestAccess(access: SimAccess): boolean {
  return access === "none";
}

/** Maksymalna długość uzasadnienia prośby — tyle zapisujemy, resztę ucinamy. */
export const ACCESS_NOTE_MAX = 500;

/** Pełny obraz uprawnień konta — kształt odpowiedzi `GET /api/dostep`. */
export interface AccessState {
  /** Czy użytkownik jest zalogowany. */
  signedIn: boolean;
  isAdmin: boolean;
  access: SimAccess;
  /** Wynik `canRunSimulations` — policzony na serwerze, żeby klient nie zgadywał. */
  canRun: boolean;
  /** Czy przycisk „poproś o dostęp" ma sens. */
  canRequest: boolean;
}

/** Stan dla gościa bez sesji — jeden kształt odpowiedzi dla całego UI. */
export const ANONYMOUS_ACCESS: AccessState = {
  signedIn: false,
  isAdmin: false,
  access: "none",
  canRun: false,
  canRequest: false,
};

/** Składa pełny stan z dwóch faktów serwerowych. Używane po obu stronach. */
export function accessState(opts: { isAdmin: boolean; access: SimAccess }): AccessState {
  return {
    signedIn: true,
    isAdmin: opts.isAdmin,
    access: opts.access,
    canRun: canRunSimulations(opts),
    canRequest: !opts.isAdmin && canRequestAccess(opts.access),
  };
}
