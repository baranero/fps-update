export function isAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  return email === process.env.ADMIN_EMAIL;
}
