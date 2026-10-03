// Właściciel serwisu — jedno konto, rozpoznawane po adresie z ADMIN_EMAIL.
// Zmienna jest SERWEROWA (bez NEXT_PUBLIC_): adres właściciela nie ma po co
// trafiać do bundla przeglądarki. Strony pytają o uprawnienia `GET /api/dostep`.
export function isAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  return email === process.env.ADMIN_EMAIL;
}

// Kto może uruchamiać płatne symulacje — patrz lib/access.ts (reguła)
// i lib/utils/simAccess.ts (odczyt stanu z bazy). Wcześniej bramka była tutaj
// i przepuszczała wyłącznie admina, bo nie było gdzie zapisać zgody właściciela.
