"use client";
import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

export default function SymulacjeRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/symulacje"); }, [router]);
  return null;
}
