"use client";
import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

// Historia raportów przeniesiona do /symulacje/raporty. Raporty dotyczą
// kalkulatorów, ale są przypisane do konta — a konto istnieje wyłącznie
// na fdsrun.com, więc strona musi żyć po stronie chmury.
export default function RaportyRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/symulacje/raporty"); }, [router]);
  return null;
}
