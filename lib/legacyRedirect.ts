import { permanentRedirect } from "next/navigation";
import { routing } from "@/i18n/routing";

/**
 * Strona-zapas dla starego adresu konta pod /narzedzia/*.
 *
 * Właściwe 301 wykonuje middleware na podstawie mapy `legacyTarget()`
 * w lib/cloud.ts — żądanie w normalnym biegu nigdy tu nie dociera. Te pliki
 * zostają jako druga linia: gdyby żądanie ominęło middleware (zmiana `matcher`,
 * wywołanie wewnętrzne), adres nadal odpowie przekierowaniem, a nie pustą stroną.
 *
 * Wcześniej każdy z nich był komponentem KLIENCKIM z `useEffect` →
 * `router.replace(...)`: przeglądarka pobierała bundle, pokazywała pustą klatkę,
 * a robot dostawał 200 na adresie, który ma zniknąć. Teraz to zwykłe 308
 * wprost z serwera.
 */
export function legacyRedirectPage(target: string) {
  return async function LegacyRedirect(props: { params: Promise<{ locale: string }> }) {
    const { locale } = await props.params;
    const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
    permanentRedirect(`${prefix}${target}`);
  };
}
