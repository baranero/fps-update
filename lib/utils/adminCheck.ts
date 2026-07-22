export function isAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  return email === process.env.ADMIN_EMAIL;
}

// Czy dany użytkownik może uruchamiać płatne symulacje w chmurze.
// TYMCZASOWO — zanim wdrożymy płatności online — dostęp ma wyłącznie admin,
// żeby obcy nie odpalali serwerów Hetzner na nasz koszt.
// Gdy ruszą płatności / allowlista, rozszerz warunek tutaj (jedno miejsce).
export function isSimAllowed(email: string | undefined | null): boolean {
  return isAdmin(email);
}
