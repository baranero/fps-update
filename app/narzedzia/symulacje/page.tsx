"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SymulacjeRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/symulacje"); }, [router]);
  return null;
}
