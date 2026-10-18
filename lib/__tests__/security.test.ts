import { describe, expect, it } from "vitest";
import { jobToken, verifyJobToken } from "@/lib/jobToken";
import { resultObjectKey, safeResultRelPath } from "@/lib/hetzner/uploadKeys";
import { escapeHtml } from "@/lib/mail";

const SECRET = "s".repeat(48);

describe("token zlecenia", () => {
  it("jest deterministyczny i różny dla różnych zleceń", () => {
    expect(jobToken("FDS-A", SECRET)).toBe(jobToken("FDS-A", SECRET));
    expect(jobToken("FDS-A", SECRET)).not.toBe(jobToken("FDS-B", SECRET));
    expect(jobToken("FDS-A", SECRET)).not.toBe(jobToken("FDS-A", "inny-sekret"));
  });

  it("nie zdradza sekretu i nie jest nim", () => {
    const t = jobToken("FDS-A", SECRET);
    expect(t).not.toContain(SECRET);
    expect(t).toMatch(/^[0-9a-f]{64}$/);
  });

  it("weryfikuje tylko własny token zlecenia", () => {
    const t = jobToken("FDS-A", SECRET);
    expect(verifyJobToken("FDS-A", t, SECRET)).toBe(true);
    expect(verifyJobToken("FDS-B", t, SECRET)).toBe(false);
    // Sam sekret globalny NIE jest tokenem — maszyna nigdy go nie dostaje.
    expect(verifyJobToken("FDS-A", SECRET, SECRET)).toBe(false);
    expect(verifyJobToken("FDS-A", null, SECRET)).toBe(false);
    expect(verifyJobToken("FDS-A", t, undefined)).toBe(false);
    expect(verifyJobToken("FDS-A", t.slice(0, 63) + "0", SECRET)).toBe(false);
  });

  it("bez sekretu nie wystawia tokenu", () => {
    expect(() => jobToken("FDS-A", undefined)).toThrow();
  });
});

describe("nazwy plików do zapisu w magazynie", () => {
  it("przyjmuje to, co zapisuje FDS i Smokeview", () => {
    for (const ok of [
      "klatka_devc.csv", "klatka_0001_01.sf", "fds_output.log", "_snapshot.json",
      "_preview/manifest.json", "_preview/live/vis_1_t0300.png", "model+v2_1.s3d", "hala(15)_1.bf",
    ]) {
      expect(safeResultRelPath(ok)).toBe(ok);
    }
  });

  it("odrzuca wyjście poza katalog zlecenia i śmieci", () => {
    for (const bad of [
      "../inne/plik.sf", "..", "/etc/passwd", "a//b", ".ukryty", "ze spacją.sf",
      "a/b/c/d/e.sf", "", 42, null, "x".repeat(600),
    ]) {
      expect(safeResultRelPath(bad)).toBeNull();
    }
  });

  it("buduje klucz wyłącznie pod katalogiem zlecenia", () => {
    expect(resultObjectKey("FDS-ABC123-XY", "_preview/live/a.png")).toBe("results/FDS-ABC123-XY/_preview/live/a.png");
    expect(resultObjectKey("FDS-ABC123-XY", "../FDS-INNE/a.sf")).toBeNull();
    expect(resultObjectKey("../", "a.sf")).toBeNull();
  });
});

describe("escapeHtml", () => {
  it("unieszkodliwia znaczniki i cudzysłowy", () => {
    expect(escapeHtml(`<script>alert("x")</script> & 'y'`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;"
    );
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml("Jan Kowalski")).toBe("Jan Kowalski");
  });
});
