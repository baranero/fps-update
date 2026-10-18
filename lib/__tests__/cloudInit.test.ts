import { gunzipSync } from "zlib";
import { describe, expect, it } from "vitest";
import { compactUserData, generateCloudInit, USER_DATA_LIMIT } from "@/lib/hetzner/cloud-init";
import { SMV_PREVIEW_PY } from "@/lib/hetzner/smvPreview";

// Hetzner odrzuca user_data dłuższe niż 32 768 znaków (422 przy tworzeniu
// maszyny) — wtedy NIE RUSZA ŻADNE zlecenie. Tak się stało po dołożeniu
// podglądu Smokeview (40,5 KB), więc limit pilnuje test, a nie produkcja.
// Wartości parametrów celowo długie, jak prawdziwe klucze.
const params = {
  caseId: "FDS-20261003-ABCDEF",
  fileName: "model_klatka_schodowa.fds",
  ncores: 48,
  ompThreads: 1,
  appUrl: "https://fdsrun.com",
  jobToken: "t".repeat(64),
  // Podpisany adres Supabase Storage — długi jak prawdziwy (token JWT w query).
  inputUrl: `https://abcdefghijklmnopqrst.supabase.co/storage/v1/object/sign/fds-files/FDS-20261003-ABCDEF/run/model_klatka_schodowa.fds?token=${"j".repeat(420)}`,
  fdsDownloadUrl: "https://github.com/firemodels/fds/releases/download/FDS-6.10.1/FDS-6.10.1_SMV-6.10.1_lnx.sh",
};

function unpacked(script: string): string[] {
  return [...script.matchAll(/^echo '([A-Za-z0-9+/=]+)' \| base64 -d \| gunzip > "[^"]+"$/gm)].map((m) =>
    gunzipSync(Buffer.from(m[1], "base64")).toString("utf8")
  );
}

describe("generateCloudInit", () => {
  it("mieści się w limicie user_data Hetznera z zapasem", () => {
    for (const snap of [undefined, "123456"]) {
      const prev = process.env.HETZNER_SNAPSHOT_ID;
      if (snap) process.env.HETZNER_SNAPSHOT_ID = snap;
      else delete process.env.HETZNER_SNAPSHOT_ID;
      const s = generateCloudInit(params);
      if (prev === undefined) delete process.env.HETZNER_SNAPSHOT_ID;
      else process.env.HETZNER_SNAPSHOT_ID = prev;
      // Zapas na rozbudowę: alarm już przy 85% limitu.
      expect(s.length).toBeLessThan(USER_DATA_LIMIT * 0.85);
    }
  });

  it("pakuje skrypty Pythona bez strat i zostawia shebang", () => {
    const s = generateCloudInit(params);
    expect(s.startsWith("#!/bin/bash\n")).toBe(true);
    expect(s).not.toContain("<<'PYEOF'");
    const scripts = unpacked(s);
    expect(scripts).toHaveLength(3);
    expect(scripts.some((py) => py.includes("def read_header(path)"))).toBe(true);
    expect(scripts.some((py) => py.includes("/upload-urls"))).toBe(true);
    expect(scripts).toContain(SMV_PREVIEW_PY + "\n");
  });

  it("nie niesie żadnego sekretu poza tokenem zlecenia", () => {
    // Regresja: maszyna dostawała klucz service_role, token Hetznera i klucze
    // magazynu. Ktokolwiek wszedł na maszynę, miał całą bazę i konto chmury.
    const s = generateCloudInit(params);
    for (const forbidden of [
      "SUPABASE_KEY", "service_role", "HETZNER_TOKEN", "api.hetzner.cloud",
      "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "STORAGE_SECRET_KEY", "aws s3", "x-webhook-secret",
    ]) {
      expect(s, forbidden).not.toContain(forbidden);
    }
    expect(s).toContain(`JOB_TOKEN="${params.jobToken}"`);
    expect(s).toContain("x-job-token: $JOB_TOKEN");
    expect(s).toContain("PasswordAuthentication no");
  });
});

describe("compactUserData", () => {
  it("usuwa linie samych komentarzy, ale nie komentarze w spakowanym Pythonie", () => {
    const out = compactUserData(
      ["#!/bin/bash", "# komentarz", "  # wcięty", "echo 1 # na końcu zostaje", `cat > "/x.py" <<'PYEOF'`, "# py", "x = 1", "PYEOF", "echo 2"].join("\n")
    );
    expect(out.split("\n")[0]).toBe("#!/bin/bash");
    expect(out).not.toContain("# komentarz");
    expect(out).not.toContain("# wcięty");
    expect(out).toContain("echo 1 # na końcu zostaje");
    expect(unpacked(out)).toEqual(["# py\nx = 1\n"]);
  });
});
