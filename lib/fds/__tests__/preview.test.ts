import { describe, expect, it } from "vitest";
import { parsePreviewManifest, viewCaption } from "../preview";

const good = {
  version: 1,
  views: [
    { id: "VIS_C_x2p62", kind: "slice", label: "SOOT VISIBILITY", short: "VIS_C", unit: "m", plane: "x", pos: 2.625 },
    { id: "smoke3d", kind: "smoke3d", label: "SOOT DENSITY" },
  ],
  live: [
    { t: 240, at: "2026-10-03T10:05:00Z", files: { VIS_C_x2p62: "_preview/live/a.png" } },
    { t: 120, at: "2026-10-03T10:00:00Z", files: { VIS_C_x2p62: "_preview/live/b.png", smoke3d: "_preview/live/c.png" } },
  ],
  report: null,
};

describe("parsePreviewManifest", () => {
  it("odczytuje poprawny manifest i sortuje klatki po czasie", () => {
    const m = parsePreviewManifest(JSON.stringify(good))!;
    expect(m.views).toHaveLength(2);
    expect(m.live.map((f) => f.t)).toEqual([120, 240]);
    expect(m.report).toBeNull();
  });

  it("odrzuca śmieci i pusty manifest", () => {
    expect(parsePreviewManifest(null)).toBeNull();
    expect(parsePreviewManifest("{nie json")).toBeNull();
    expect(parsePreviewManifest(JSON.stringify({ views: [], live: [] }))).toBeNull();
    expect(parsePreviewManifest(JSON.stringify({ ...good, live: [] }))).toBeNull();
  });

  it("pomija klatki bez czasu i pliki o złym typie", () => {
    const m = parsePreviewManifest(JSON.stringify({
      ...good,
      live: [{ t: "x", files: { a: "p" } }, { t: 10, files: { a: 5, b: "_preview/live/b.png" } }],
    }))!;
    expect(m.live).toEqual([{ t: 10, at: undefined, files: { b: "_preview/live/b.png" } }]);
  });

  it("zachowuje serię raportową", () => {
    const m = parsePreviewManifest(JSON.stringify({
      ...good,
      live: [],
      report: { step: 120, frames: [{ t: 240, files: { smoke3d: "_preview/report/s.png" } }, { t: 120, files: { smoke3d: "_preview/report/r.png" } }] },
    }))!;
    expect(m.report?.step).toBe(120);
    expect(m.report?.frames.map((f) => f.t)).toEqual([120, 240]);
  });
});

describe("viewCaption", () => {
  it("opisuje przekrój i dym 3D", () => {
    const m = parsePreviewManifest(JSON.stringify(good))!;
    expect(viewCaption(m.views[0], "Dym 3D")).toBe("SOOT VISIBILITY · x = 2,63 m");
    expect(viewCaption(m.views[1], "Dym 3D")).toBe("Dym 3D");
  });
});
