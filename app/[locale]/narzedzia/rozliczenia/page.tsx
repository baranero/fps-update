"use client";
import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

export default function RozliczeniaRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/symulacje/rozliczenia"); }, [router]);
  return null;
}
