// Nadawca maili transakcyjnych. Rebranding na FDSRun włącza się DOPIERO po
// ustawieniu MAIL_FROM w env — i dopiero gdy domena fdsrun.com jest zweryfikowana
// w Resend (rekordy SPF/DKIM). Domyślnie zostaje sprawdzony, działający nadawca
// fp-solutions.pl, żeby przełączenie domeny nie zablokowało wysyłki maili.
//
// Docelowo w Vercel: MAIL_FROM="FDSRun <noreply@fdsrun.com>"
export const MAIL_FROM =
  process.env.MAIL_FROM ?? "FP Solutions <noreply@fp-solutions.pl>";
