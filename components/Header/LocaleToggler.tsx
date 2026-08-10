"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useTransition } from "react";

// Przełącznik języka serwisu chmurowego (PL ↔ EN). Adres jest jedynym źródłem
// prawdy o języku — nie ma wykrywania po Accept-Language ani cookie, więc dany
// URL zawsze pokazuje ten sam język (patrz i18n/routing.ts).
//
// `usePathname` z i18n/navigation zwraca ścieżkę BEZ prefiksu języka, dzięki
// czemu przełączenie zachowuje bieżącą stronę. Parametry zapytania dobieramy z
// window w handlerze — celowo bez `useSearchParams`, bo ten hook w komponencie
// belki wyłączyłby statyczne renderowanie wszystkich stron.
export default function LocaleToggler() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const switchTo = (next: string) => {
    if (next === locale || pending) return;
    const search = typeof window === "undefined" ? "" : window.location.search;
    startTransition(() => {
      router.replace(`${pathname}${search}`, { locale: next as (typeof routing.locales)[number] });
    });
  };

  return (
    <div
      className="flex items-center rounded-tile border border-hairline p-0.5"
      role="group"
      aria-label="Language"
    >
      {routing.locales.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            onClick={() => switchTo(code)}
            aria-current={active ? "true" : undefined}
            disabled={pending}
            className={`rounded-chip px-2 py-1 font-mono text-fr-micro uppercase transition-colors ${
              active ? "bg-primary text-white" : "text-muted hover:text-ink"
            } ${pending ? "opacity-60" : ""}`}
          >
            {code}
          </button>
        );
      })}
    </div>
  );
}
