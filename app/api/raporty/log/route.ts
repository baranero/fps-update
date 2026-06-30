export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { calculator, format, project_name, share_url } = body as {
    calculator?: string;
    format?: string | null;
    project_name?: string | null;
    share_url?: string | null;
  };

  if (!calculator) {
    return NextResponse.json({ error: "Missing calculator" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("reports").insert({
    user_id: user.id,
    calculator,
    format: format ?? "CNBOP",
    project_name: project_name ?? null,
    share_url: share_url ?? null,
  });

  if (error) {
    console.error("Report log error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
