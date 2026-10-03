import { permanentRedirect } from "next/navigation";
import { routing } from "@/i18n/routing";

// Stary adres szczegółu zlecenia — dziś /symulacje/<caseId>.
// Numer zlecenia niesie e-mail wysłany przed przeprowadzką, więc adres musi żyć.
export default async function LegacyCaseRedirect(props: {
  params: Promise<{ locale: string; caseId: string }>;
}) {
  const { locale, caseId } = await props.params;
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  permanentRedirect(`${prefix}/symulacje/${encodeURIComponent(caseId)}`);
}
