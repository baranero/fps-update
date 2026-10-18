export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireCaseAccess } from "@/lib/utils/caseAccess";
import { rateLimit, LIMITS } from "@/lib/utils/rateLimit";
import { getResultText, signedResultUrl, PREVIEW_MANIFEST } from "@/lib/hetzner/storage";
import { parsePreviewManifest, type PreviewManifest } from "@/lib/fds/preview";

// Ujęcia Smokeview renderowane na maszynie liczącej (patrz render_preview
// w lib/hetzner/cloud-init.ts). Czytamy JEDEN mały obiekt — manifest — zamiast
// LIST po katalogu, więc ten endpoint można odpytywać w trakcie biegu.
// Podpisy liczone są lokalnie (HMAC), bez ruchu do magazynu.
export async function GET(req: NextRequest, props: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await props.params;
  const limited = rateLimit(req, { scope: "case-preview", ...LIMITS.caseRead });
  if (limited) return limited;

  const access = await requireCaseAccess<{ status: string }>(caseId, "status");
  if (!access.ok) return access.response;

  const raw = await getResultText(`results/${caseId}/${PREVIEW_MANIFEST}`);
  const manifest = parsePreviewManifest(raw);
  if (!manifest) {
    return NextResponse.json({ status: access.submission.status, manifest: null });
  }

  // Ścieżki z manifestu są względne i pochodzą z naszej maszyny — mimo to
  // przepuszczamy wyłącznie te z katalogu _preview/, bez „..”.
  const sign = async (rel: string) =>
    rel.startsWith("_preview/") && !rel.includes("..")
      ? signedResultUrl(`results/${caseId}/${rel}`, 3600)
      : null;

  const signFiles = async (files: Record<string, string>) => {
    const out: Record<string, string> = {};
    for (const [view, rel] of Object.entries(files)) {
      const url = await sign(rel);
      if (url) out[view] = url;
    }
    return out;
  };

  const signed: PreviewManifest = {
    ...manifest,
    live: await Promise.all(manifest.live.map(async (f) => ({ ...f, files: await signFiles(f.files) }))),
    report: manifest.report
      ? {
          ...manifest.report,
          frames: await Promise.all(
            manifest.report.frames.map(async (f) => ({ ...f, files: await signFiles(f.files) }))
          ),
        }
      : null,
  };

  return NextResponse.json(
    { status: access.submission.status, manifest: signed },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
