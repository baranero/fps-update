"use client";
import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

// Profil konta przeniesiony do przestrzeni chmury (/symulacje/profil) — dane do
// faktury, statystyki zleceń FDS i usuwanie konta należą do fdsrun.com, nie do
// publicznych narzędzi projektanta. Stub trzyma stare zakładki i linki z maili.
export default function ProfilRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/symulacje/profil"); }, [router]);
  return null;
}
