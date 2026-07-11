"use client";
import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

export default function CaseIdRedirect({ params }: { params: { caseId: string } }) {
  const router = useRouter();
  useEffect(() => { router.replace(`/symulacje/${params.caseId}`); }, [router, params.caseId]);
  return null;
}
