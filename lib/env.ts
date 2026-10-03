// ─── Rejestr zmiennych środowiskowych ────────────────────────────────────────
//
// Jedno miejsce, w którym opisane jest CO musi być ustawione, ŻEBY CO działało.
// Do tej pory ta wiedza była rozsypana po komentarzach w dwudziestu plikach
// i po dokumentach — przy wdrożeniu nie dało się jednym rzutem oka sprawdzić,
// czego brakuje. Z tego rejestru korzysta `npm run preflight`.
//
// Moduł jest CZYSTY: opisuje zmienne, ale ich nie czyta na poziomie modułu
// i niczego nie wyrzuca. Import nie może wywrócić builda, którego jedynym
// zadaniem jest powiedzieć, że konfiguracji brakuje.

/** Obszar działania serwisu. Brak zmiennych w obszarze = ten obszar nie działa. */
export type Capability = "core" | "mail" | "compute" | "payments" | "ops";

export interface EnvVar {
  name: string;
  capability: Capability;
  /** Czy bez niej obszar w ogóle nie ruszy, czy tylko traci część działania. */
  required: boolean;
  /** Po co jest — zdanie, które ma sens dla kogoś, kto wraca do tego po pół roku. */
  purpose: string;
  /** Wartość domyślna wbudowana w kod, jeśli jakaś jest. */
  fallback?: string;
}

export const ENV_VARS: readonly EnvVar[] = [
  // ── Rdzeń: bez tego nie wstaje nic ──
  { name: "NEXT_PUBLIC_SUPABASE_URL", capability: "core", required: true,
    purpose: "Adres projektu Supabase — konta, profile i zlecenia." },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", capability: "core", required: true,
    purpose: "Klucz publiczny Supabase dla przeglądarki (chroniony przez RLS)." },
  { name: "SUPABASE_SERVICE_ROLE_KEY", capability: "core", required: true,
    purpose: "Klucz serwerowy z pominięciem RLS — trasy API i panel admina. NIGDY do przeglądarki." },
  { name: "NEXT_PUBLIC_APP_URL", capability: "core", required: true,
    purpose: "Adres serwisu chmurowego — odnośniki w mailach i powroty z płatności.",
    fallback: "https://fdsrun.com" },
  { name: "NEXT_PUBLIC_MARKETING_URL", capability: "core", required: false,
    purpose: "Adres witryny usługowej — odnośniki krzyżowe z chmury.",
    fallback: "https://fp-solutions.pl" },
  { name: "NEXT_PUBLIC_SITE_MODE", capability: "core", required: false,
    purpose: "Który produkt serwuje TEN projekt Vercel: „cloud” albo „marketing”. Puste = dev (rozpoznanie po ścieżce)." },

  // ── Poczta: potwierdzenia zleceń, wyniki, prośby o dostęp ──
  { name: "RESEND_API_KEY", capability: "mail", required: true,
    purpose: "Wysyłka maili transakcyjnych. Bez niej zlecenie przejdzie, ale klient nie dostanie potwierdzenia." },
  { name: "ADMIN_EMAIL", capability: "mail", required: true,
    purpose: "Konto właściciela: rozpoznanie admina ORAZ adres powiadomień o zleceniach i prośbach o dostęp." },
  { name: "MAIL_FROM", capability: "mail", required: false,
    purpose: "Nadawca maili. Zmień dopiero, gdy domena jest zweryfikowana w Resend (SPF/DKIM).",
    fallback: "FP Solutions <noreply@fp-solutions.pl>" },

  // ── Obliczenia: maszyny i magazyn wyników ──
  { name: "HETZNER_API_TOKEN", capability: "compute", required: true,
    purpose: "Zakładanie i kasowanie maszyn liczących." },
  { name: "HETZNER_SNAPSHOT_ID", capability: "compute", required: true,
    purpose: "Obraz maszyny z gotowym FDS — bez niego każdy bieg instaluje solver od zera." },
  { name: "WEBHOOK_SECRET", capability: "compute", required: true,
    purpose: "Podpis raportów z maszyny liczącej. Bez niego /complete odrzuca wszystko — zlecenia wiszą w „running”." },
  { name: "HETZNER_STORAGE_ACCESS_KEY", capability: "compute", required: true,
    purpose: "Magazyn wyników (S3) — klucz dostępu." },
  { name: "HETZNER_STORAGE_SECRET_KEY", capability: "compute", required: true,
    purpose: "Magazyn wyników (S3) — klucz tajny." },
  { name: "HETZNER_STORAGE_BUCKET", capability: "compute", required: true,
    purpose: "Nazwa kubełka z wynikami." },
  { name: "HETZNER_STORAGE_ENDPOINT", capability: "compute", required: true,
    purpose: "Adres magazynu obiektów." },
  { name: "HETZNER_STORAGE_REGION", capability: "compute", required: false,
    purpose: "Region magazynu." },
  { name: "HETZNER_LOCATION", capability: "compute", required: false,
    purpose: "Preferowana lokalizacja maszyn; bez niej planer wybiera sam wg dostępności." },
  { name: "FDS_DOWNLOAD_URL", capability: "compute", required: false,
    purpose: "Zapas: skąd pobrać solver, gdy obraz maszyny go nie ma." },
  { name: "HETZNER_STORAGE_PRICE_PER_TB_EUR", capability: "compute", required: false,
    purpose: "Stawka magazynu do rachunku marży w panelu admina." },

  // ── Płatności ──
  { name: "STRIPE_SECRET_KEY", capability: "payments", required: true,
    purpose: "Tworzenie płatności. Bez niej /checkout oddaje 503 z czytelnym komunikatem." },
  { name: "STRIPE_WEBHOOK_SECRET", capability: "payments", required: true,
    purpose: "Weryfikacja podpisu Stripe. Bez niej NIE WOLNO ufać zdarzeniom — webhook je odrzuca." },

  // ── Utrzymanie ──
  { name: "CRON_SECRET", capability: "ops", required: true,
    purpose: "Autoryzacja crona sprzątającego: kasowanie starych wyników i ratowanie zawieszonych zleceń." },
] as const;

/** Co przestaje działać, gdy w obszarze brakuje zmiennej wymaganej. */
export const CAPABILITY_IMPACT: Record<Capability, { label: string; missing: string }> = {
  core:     { label: "Rdzeń (konta, baza, adresy)", missing: "Serwis nie wstanie." },
  mail:     { label: "Poczta transakcyjna",         missing: "Klient nie dostanie ani potwierdzenia, ani wyników; prośby o dostęp nie dotrą do właściciela." },
  compute:  { label: "Obliczenia w chmurze",        missing: "Zlecenia nie ruszą albo zawisną bez raportu z maszyny." },
  payments: { label: "Płatności online",            missing: "Klient nie zapłaci w serwisie — zostaje faktura wystawiana ręcznie." },
  ops:      { label: "Utrzymanie (cron)",           missing: "Stare wyniki zostaną w magazynie, a zawieszone zlecenia nikt nie zamknie." },
};

export interface EnvReport {
  capability: Capability;
  ready: boolean;
  missingRequired: string[];
  missingOptional: string[];
}

/**
 * Stan konfiguracji na podstawie PODANEGO zbioru zmiennych.
 *
 * Środowisko wstrzykujemy parametrem zamiast czytać `process.env` w środku —
 * dzięki temu funkcja jest czysta i testowalna, a raport da się policzyć także
 * dla cudzego wdrożenia (np. z listy zmiennych skopiowanej z Vercela).
 */
export function checkEnv(env: Record<string, string | undefined>): EnvReport[] {
  const capabilities = [...new Set(ENV_VARS.map((v) => v.capability))];
  return capabilities.map((capability) => {
    const vars = ENV_VARS.filter((v) => v.capability === capability);
    const isSet = (v: EnvVar) => {
      const raw = env[v.name];
      return typeof raw === "string" && raw.trim() !== "";
    };
    const missingRequired = vars.filter((v) => v.required && !isSet(v)).map((v) => v.name);
    const missingOptional = vars.filter((v) => !v.required && !isSet(v)).map((v) => v.name);
    return { capability, ready: missingRequired.length === 0, missingRequired, missingOptional };
  });
}
