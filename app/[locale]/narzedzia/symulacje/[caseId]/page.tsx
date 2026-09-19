"use client";
import { useEffect, use } from "react";
import { useRouter } from "@/i18n/navigation";

export default function CaseIdRedirect(props: { params: Promise<{ caseId: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  useEffect(() => { router.replace(`/symulacje/${params.caseId}`); }, [router, params.caseId]);
  return null;
}
