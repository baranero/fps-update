"use client";
import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

export default function StatystykiRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/symulacje/statystyki"); }, [router]);
  return null;
}
