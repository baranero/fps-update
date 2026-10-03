"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ANONYMOUS_ACCESS, type AccessState } from "@/lib/access";

// Uprawnienia konta — JEDEN odczyt na wejście do przestrzeni /symulacje.
//
// Wcześniej belka, pulpit i kreator sprawdzały to każde po swojemu, porównując
// e-mail użytkownika z NEXT_PUBLIC_ADMIN_EMAIL. Trzy kopie tej samej reguły,
// adres właściciela w bundlu przeglądarki i — po dołożeniu stanu `sim_access`
// — brak miejsca, w którym dałoby się go trzymać. Teraz pyta o to serwer
// (`GET /api/dostep`), a wynik jest w kontekście layoutu chmury.

type AccessContext = {
  /** null dopóki trwa pierwszy odczyt — UI pokazuje wtedy szkielet, nie „brak dostępu". */
  state: AccessState | null;
  /** Ponowny odczyt — po prośbie o dostęp albo po zalogowaniu. */
  refresh: () => Promise<AccessState | null>;
};

const Ctx = createContext<AccessContext>({ state: ANONYMOUS_ACCESS, refresh: async () => null });

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AccessState | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/dostep", { cache: "no-store" });
      if (!res.ok) {
        setState(ANONYMOUS_ACCESS);
        return ANONYMOUS_ACCESS;
      }
      const next = (await res.json()) as AccessState;
      setState(next);
      return next;
    } catch {
      // Sieć padła — traktujemy jak brak uprawnień. UI pokaże ofertę zamiast
      // przycisku, którego kliknięcie i tak skończyłoby się odmową z serwera.
      setState(ANONYMOUS_ACCESS);
      return ANONYMOUS_ACCESS;
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return <Ctx.Provider value={{ state, refresh }}>{children}</Ctx.Provider>;
}

export function useAccess(): AccessContext {
  return useContext(Ctx);
}
