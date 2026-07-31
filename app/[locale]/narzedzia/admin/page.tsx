"use client";
import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

// Panel administratora przeniesiony do przestrzeni chmury (/symulacje/admin) —
// należy wyłącznie do fdsrun.com i nie ma nic wspólnego z narzędziami
// projektanta na fp-solutions.pl. Stub trzyma stare zakładki przy życiu,
// tak samo jak dla /narzedzia/symulacje i /narzedzia/statystyki.
export default function AdminRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/symulacje/admin"); }, [router]);
  return null;
}
