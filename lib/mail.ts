// Nadawca maili transakcyjnych. Rebranding na FDSRun włącza się DOPIERO po
// ustawieniu MAIL_FROM w env — i dopiero gdy domena fdsrun.com jest zweryfikowana
// w Resend (rekordy SPF/DKIM). Domyślnie zostaje sprawdzony, działający nadawca
// fp-solutions.pl, żeby przełączenie domeny nie zablokowało wysyłki maili.
//
// Docelowo w Vercel: MAIL_FROM="FDSRun <noreply@fdsrun.com>"
export const MAIL_FROM =
  process.env.MAIL_FROM ?? "FP Solutions <noreply@fp-solutions.pl>";

// ── Język maili ───────────────────────────────────────────────────────────────
//
// Maile do KLIENTA idą w języku, w którym złożył zlecenie — zapisujemy go przy
// zleceniu (kolumna `locale` w fds_submissions), bo trasa /complete wywoływana
// jest przez maszynę liczącą, gdzie nie ma ani sesji, ani nagłówków przeglądarki.
// Maile do ADMINA zostają po polsku — czyta je wyłącznie właściciel serwisu.
//
// Treści trzymamy tutaj, a nie w messages/*.json: trasy API działają poza
// kontekstem next-intl, a ładowanie tam całego pliku tłumaczeń (~100 kB) tylko
// po kilkanaście zdań byłoby marnotrawstwem.

export type MailLocale = "pl" | "en";

export function mailLocale(value: unknown): MailLocale {
  return value === "en" ? "en" : "pl";
}

/** Adres strony zlecenia w języku klienta (PL bez prefiksu, EN pod /en). */
export function caseUrl(appUrl: string, caseId: string, locale: MailLocale): string {
  return `${appUrl}${locale === "en" ? "/en" : ""}/symulacje/${caseId}`;
}

export function formatMoney(value: number, locale: MailLocale): string {
  return locale === "en"
    ? `${value.toLocaleString("en-GB")} PLN`
    : `${value.toLocaleString("pl-PL")} zł`;
}

export function formatHours(hours: number, locale: MailLocale): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  return `${hours.toFixed(1)} h`;
}

interface MailCopy {
  brandSub: string;
  hi: (name: string) => string;
  questions: string;
  // potwierdzenie przyjęcia zlecenia
  submitSubject: (caseId: string) => string;
  submitIntro: string;
  submitCta: string;
  // zakończenie obliczeń
  doneSubject: (caseId: string) => string;
  doneBadge: string;
  doneIntro: string;
  doneCta: string;
  // błąd obliczeń
  failSubject: (caseId: string) => string;
  failBadge: string;
  failIntro: string;
  failCta: string;
  // wspólne etykiety tabelki
  caseNo: string;
  file: string;
  server: string;
  estTime: string;
  runTime: string;
  priceNet: string;
}

const COPY: Record<MailLocale, MailCopy> = {
  pl: {
    brandSub: "Symulacje numeryczne CFD / FDS",
    hi: (name) => `Cześć <strong>${name}</strong>,`,
    questions: "Pytania:",
    submitSubject: (caseId) => `Potwierdzenie zlecenia symulacji FDS — ${caseId}`,
    submitIntro:
      "Twoje zlecenie zostało przyjęte i trafiło do kolejki. Postęp obliczeń możesz śledzić pod poniższym linkiem — strona odświeża się automatycznie.",
    submitCta: "Śledź status zlecenia →",
    doneSubject: (caseId) => `Obliczenia FDS zakończone — ${caseId}`,
    doneBadge: "✓ Obliczenia zakończone pomyślnie",
    doneIntro:
      "Obliczenia numeryczne FDS dla Twojego projektu zostały zakończone. Wyniki są dostępne do pobrania w panelu — pliki będą dostępne przez 60 dni.",
    doneCta: "Pobierz wyniki →",
    failSubject: (caseId) => `Problem z obliczeniami FDS — ${caseId}`,
    failBadge: "Obliczenia zakończone błędem",
    failIntro:
      "Podczas obliczeń wystąpił błąd. Sprawdziliśmy log — szczegóły znajdziesz w panelu zlecenia. Za nieudane obliczenia nie pobieramy opłaty.",
    failCta: "Zobacz szczegóły →",
    caseNo: "Numer zlecenia",
    file: "Plik wejściowy",
    server: "Serwer",
    estTime: "Szacowany czas obliczeń",
    runTime: "Czas obliczeń",
    priceNet: "Cena netto",
  },
  en: {
    brandSub: "CFD / FDS numerical simulations",
    hi: (name) => `Hi <strong>${name}</strong>,`,
    questions: "Questions:",
    submitSubject: (caseId) => `FDS simulation job confirmed — ${caseId}`,
    submitIntro:
      "Your job has been accepted and queued. You can follow the run at the link below — the page refreshes automatically.",
    submitCta: "Track the job status →",
    doneSubject: (caseId) => `FDS computation finished — ${caseId}`,
    doneBadge: "✓ Computation finished successfully",
    doneIntro:
      "The FDS computation for your project has finished. The results are ready to download in your account — files stay available for 60 days.",
    doneCta: "Download the results →",
    failSubject: (caseId) => `Problem with your FDS computation — ${caseId}`,
    failBadge: "The computation ended with an error",
    failIntro:
      "The run hit an error. We checked the log — the details are in your job page. There is no charge for a failed computation.",
    failCta: "See the details →",
    caseNo: "Job number",
    file: "Input file",
    server: "Server",
    estTime: "Estimated compute time",
    runTime: "Compute time",
    priceNet: "Net price",
  },
};

export function mailCopy(locale: MailLocale): MailCopy {
  return COPY[locale];
}
