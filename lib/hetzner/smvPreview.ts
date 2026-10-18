// ─── Podgląd Smokeview na maszynie liczącej ──────────────────────────────────
//
// Skrypt Pythona (tylko stdlib) zapisywany przez cloud-init obok modelu. Robi
// dwie rzeczy, między którymi powłoka uruchamia Smokeview bez ekranu (Xvfb):
//
//   plan    — czyta CHID.smv, wybiera ujęcia (przekroje SLCF + dym 3D) i pisze
//             skrypt CHID.ssf dla `smokeview -runscript CHID`;
//   collect — przenosi wyrenderowane obrazy do `_preview/<tryb>/`, dopisuje je
//             do `_preview/manifest.json` i wypisuje ścieżki do wysłania.
//
// Tryby: `live` (bieżąca chwila, co kilka minut w trakcie biegu) i `report`
// (seria ujęć co stały krok czasu symulacji po zakończeniu — ryciny do raportu,
// jak „zasięg widzialności w przekroju, t = 120 s, 240 s, …").
//
// Ograniczenia zapisu: tekst ląduje w szablonie JS i w heredocu basha, więc
// w Pythonie NIE MA odwrotnych ukośników, backticków ani sekwencji dolar-klamra.
// Znaki specjalne idą przez chr().

export const SMV_PREVIEW_PY = String.raw`
import sys, os, glob, json, time, shutil

MAX_SLICES = 4
LIVE_HISTORY = 240
PREF = ["SOOT VISIBILITY", "VISIBILITY", "TEMPERATURE", "SOOT DENSITY", "VELOCITY", "HRRPUV"]
DIR_ORDER = {2: 0, 1: 1, 3: 2}
VIEW_CMD = {1: "VIEWXMIN", 2: "VIEWYMIN", 3: "VIEWZMAX"}
PLANE = {1: "x", 2: "y", 3: "z"}
NL = chr(10)


def read_lines(path):
    try:
        fh = open(path, "r", errors="ignore")
        s = fh.read()
        fh.close()
        return [l.rstrip(chr(13)) for l in s.split(NL)]
    except Exception:
        return []


def fmt(x):
    s = "%.2f" % x
    s = s.rstrip("0").rstrip(".")
    return s if s else "0"


def safe(s):
    out = ""
    for c in s:
        out += c if (c.isalnum() or c in "_-") else "_"
    return out


def find_smv(work):
    files = sorted(glob.glob(os.path.join(work, "*.smv")))
    return files[0] if files else None


def parse_smv(path):
    L = read_lines(path)
    n = len(L)
    meshes = []
    cur = None
    slices = []
    smoke = []
    i = 0
    while i < n:
        key = L[i].strip()
        head = key.split()[0] if key else ""
        if head == "GRID":
            cur = {}
            parts = L[i + 1].split() if i + 1 < n else []
            if len(parts) >= 3:
                try:
                    cur["n"] = [int(parts[0]), int(parts[1]), int(parts[2])]
                except Exception:
                    pass
            meshes.append(cur)
            i += 2
            continue
        if head == "PDIM" and cur is not None:
            parts = L[i + 1].split() if i + 1 < n else []
            if len(parts) >= 6:
                try:
                    cur["b"] = [float(p) for p in parts[:6]]
                except Exception:
                    pass
            i += 2
            continue
        if head in ("SLCF", "SLCC"):
            toks = key.replace("&", " & ").split()
            mesh = 1
            try:
                mesh = int(toks[1])
            except Exception:
                pass
            # Zakres indeksów i1 i2 j1 j2 k1 k2 stoi po „&”; między nimi bywa ID
            # przekroju, więc słowa pomijamy. Bez „&” — ostatnie 6 liczb linii.
            def ints(ts):
                out = []
                for t in ts:
                    try:
                        out.append(int(t))
                    except Exception:
                        pass
                return out
            idx = ints(toks[toks.index("&") + 1:]) if "&" in toks else []
            if len(idx) < 6:
                idx = ints(toks[2:])[-6:]
            if i + 4 < n and len(idx) >= 6:
                slices.append({"mesh": mesh - 1, "idx": idx[:6], "label": L[i + 2].strip(),
                               "short": L[i + 3].strip(), "unit": L[i + 4].strip()})
        if head in ("SMOKE3D", "SMOKF3D"):
            if i + 2 < n:
                lab = L[i + 2].strip()
                if lab and lab not in smoke:
                    smoke.append(lab)
        i += 1
    return meshes, slices, smoke


def plane_pos(sl, meshes):
    i1, i2, j1, j2, k1, k2 = sl["idx"]
    if i1 == i2:
        d, ind, ax = 1, i1, 0
    elif j1 == j2:
        d, ind, ax = 2, j1, 1
    elif k1 == k2:
        d, ind, ax = 3, k1, 2
    else:
        return None
    m = meshes[sl["mesh"]] if 0 <= sl["mesh"] < len(meshes) else None
    if not m or "b" not in m or "n" not in m:
        return None
    lo = m["b"][2 * ax]
    hi = m["b"][2 * ax + 1]
    cnt = m["n"][ax]
    pos = lo + (hi - lo) * ind / float(cnt) if cnt else lo
    return d, round(pos, 3)


def rank(label):
    u = label.upper()
    for k, p in enumerate(PREF):
        if u == p:
            return k
    for k, p in enumerate(PREF):
        if p in u:
            return k
    return len(PREF)


def choose_views(meshes, slices, smoke):
    seen = {}
    for sl in slices:
        pp = plane_pos(sl, meshes)
        if pp is None:
            continue
        d, pos = pp
        key = (sl["label"].upper(), d, pos)
        if key in seen:
            continue
        seen[key] = {"kind": "slice", "label": sl["label"], "short": sl["short"], "unit": sl["unit"],
                     "dir": d, "plane": PLANE[d], "pos": pos}
    views = sorted(seen.values(), key=lambda v: (rank(v["label"]), DIR_ORDER[v["dir"]], v["pos"]))
    # Najwyżej dwa przekroje tej samej wielkości — lepiej widzialność I temperatura
    # niż cztery płaszczyzny jednej wielkości.
    picked = []
    per_q = {}
    for v in views:
        q = v["label"].upper()
        if per_q.get(q, 0) >= 2:
            continue
        per_q[q] = per_q.get(q, 0) + 1
        picked.append(v)
        if len(picked) >= MAX_SLICES:
            break
    for v in picked:
        v["id"] = safe("%s_%s%s" % (v["short"] or v["label"], v["plane"], fmt(v["pos"]).replace(".", "p")))
    if any(s.upper() == "SOOT DENSITY" for s in smoke):
        picked.append({"kind": "smoke3d", "label": "SOOT DENSITY", "id": "smoke3d"})
    return picked


def report_times(tlast):
    step = 3600
    for s in (5, 10, 15, 20, 30, 60, 120, 180, 300, 600, 900, 1800, 3600):
        if tlast / s <= 24:
            step = s
            break
    ts = []
    k = 1
    while k * step <= tlast + 0.000001:
        ts.append(float(k * step))
        k += 1
    if not ts or abs(ts[-1] - tlast) > step * 0.25:
        ts.append(round(tlast, 1))
    return step, ts


def frame_name(v, t):
    return "%s_t%s" % (v["id"], fmt(t).replace(".", "p"))


def manifest_path(work):
    return os.path.join(work, "_preview", "manifest.json")


def load_manifest(work):
    try:
        fh = open(manifest_path(work), "r")
        m = json.load(fh)
        fh.close()
        if isinstance(m, dict):
            return m
    except Exception:
        pass
    return {"version": 1, "views": [], "live": [], "report": None}


def save_manifest(work, m):
    os.makedirs(os.path.join(work, "_preview"), exist_ok=True)
    m["updatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    fh = open(manifest_path(work), "w")
    json.dump(m, fh)
    fh.close()


def script(views, times, renderdir):
    out = ["RENDERDIR", " " + renderdir]
    for v in views:
        out.append("UNLOADALL")
        if v["kind"] == "slice":
            out += ["LOADSLICE", " " + v["label"], " %d %s" % (v["dir"], fmt(v["pos"]))]
            out.append(VIEW_CMD[v["dir"]])
        else:
            out += ["LOAD3DSMOKE", " " + v["label"], "VIEWYMIN"]
        for t in times:
            out += ["SETTIMEVAL", " " + fmt(t), "RENDERONCE", " " + frame_name(v, t)]
    out.append("UNLOADALL")
    return NL.join(out) + NL


def plan(work, kind, tlast):
    smv = find_smv(work)
    if not smv:
        sys.stderr.write("brak pliku .smv" + NL)
        return 3
    chid = os.path.basename(smv)[:-4]
    meshes, slices, smoke = parse_smv(smv)
    views = choose_views(meshes, slices, smoke)
    if not views:
        sys.stderr.write("brak przekrojow SLCF ani dymu 3D w .smv" + NL)
        return 3
    m = load_manifest(work)
    if kind == "live":
        if m.get("live") and m["live"][-1].get("t", -1) >= tlast - 0.5:
            return 3
        step, times = None, [tlast]
    else:
        step, times = report_times(tlast)
    rdir = os.path.join(work, "_pv_render")
    shutil.rmtree(rdir, ignore_errors=True)
    os.makedirs(rdir, exist_ok=True)
    fh = open(os.path.join(work, chid + ".ssf"), "w")
    fh.write(script(views, times, rdir))
    fh.close()
    ini = os.path.join(work, chid + ".ini")
    if not os.path.exists(ini):
        fh = open(ini, "w")
        fh.write(NL.join(["WINDOWWIDTH", " 1280", "WINDOWHEIGHT", " 720", ""]))
        fh.close()
    fh = open(os.path.join(rdir, "plan.json"), "w")
    json.dump({"kind": kind, "t": tlast, "step": step, "times": times, "views": views}, fh)
    fh.close()
    sys.stdout.write(chid + NL)
    return 0


def collect(work):
    rdir = os.path.join(work, "_pv_render")
    try:
        fh = open(os.path.join(rdir, "plan.json"), "r")
        p = json.load(fh)
        fh.close()
    except Exception:
        return 3
    kind = p["kind"]
    rel_dir = "_preview/" + kind
    os.makedirs(os.path.join(work, rel_dir), exist_ok=True)
    produced = []
    entries = {}
    for v in p["views"]:
        for t in p["times"]:
            base = frame_name(v, t)
            cands = sorted(glob.glob(os.path.join(rdir, base + "*")))
            cands = [c for c in cands if c.lower().endswith((".png", ".jpg", ".jpeg"))]
            if not cands:
                continue
            ext = os.path.splitext(cands[0])[1].lower()
            rel = rel_dir + "/" + base + ext
            shutil.move(cands[0], os.path.join(work, rel))
            entries.setdefault(t, {})[v["id"]] = rel
            produced.append(rel)
    if not produced:
        sys.stderr.write("Smokeview nie zapisal zadnego obrazu" + NL)
        return 4
    m = load_manifest(work)
    known = dict((x["id"], x) for x in m.get("views", []))
    for v in p["views"]:
        known[v["id"]] = dict((k, v[k]) for k in v if k != "dir")
    m["views"] = list(known.values())
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    if kind == "live":
        files = entries.get(p["t"], {})
        if files:
            m.setdefault("live", []).append({"t": round(p["t"], 2), "at": now, "files": files})
            m["live"] = m["live"][-LIVE_HISTORY:]
    else:
        m["report"] = {"step": p["step"], "at": now,
                       "frames": [{"t": t, "files": entries[t]} for t in p["times"] if t in entries]}
    save_manifest(work, m)
    for rel in produced:
        sys.stdout.write(rel + NL)
    return 0


def main():
    if len(sys.argv) < 3:
        return 2
    mode, work = sys.argv[1], sys.argv[2]
    if mode == "plan":
        kind = sys.argv[3] if len(sys.argv) > 3 else "live"
        try:
            tlast = float(sys.argv[4])
        except Exception:
            return 3
        if tlast <= 0:
            return 3
        return plan(work, kind, tlast)
    if mode == "collect":
        return collect(work)
    return 2


sys.exit(main())
`;
