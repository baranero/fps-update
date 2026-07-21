#!/usr/bin/env python3
# Diagnostyka pliku przekroju FDS (.sf) — uruchom na POBRANYM pliku wynikowym:
#
#   python3 scripts/probe_sf.py sciezka/do/CHID_1.sf
#
# Jeśli w tym samym katalogu leży plik .smv, geometria (metry) zostanie odczytana.
# Skrypt drukuje strukturę pliku i próbuje odtworzyć ostatnią klatkę TĄ SAMĄ logiką,
# co runner na maszynie liczącej — dzięki temu widać, czy problem to format pliku,
# czy infrastruktura (strumień / migracja / wdrożenie).

import sys, os, glob, struct, json, base64


def read_record(f):
    head = f.read(4)
    if len(head) < 4:
        return None
    (n,) = struct.unpack("<i", head)
    if n < 0 or n > 400000000:
        return None
    body = f.read(n)
    if len(body) < n:
        return None
    tail = f.read(4)
    if len(tail) < 4:
        return None
    (m,) = struct.unpack("<i", tail)
    if m != n:
        return None
    return body


def clean_str(b):
    return b.decode("latin-1", "ignore").replace(chr(0), " ").strip()


def probe(path):
    # Odczytaj do 6 kolejnych markerów rekordów Fortran (4-bajtowe, little-endian).
    # Poprawny .sf: recs = [30, 30, 30, 24, 4, npts*4, 4, npts*4, ...]
    try:
        f = open(path, "rb")
    except Exception as e:
        return "open-failed: " + str(e)
    try:
        sz = os.fstat(f.fileno()).st_size
        marks = []
        for _ in range(8):
            head = f.read(4)
            if len(head) < 4:
                break
            (n,) = struct.unpack("<i", head)
            marks.append(n)
            if n < 0 or n > 400000000:
                marks.append("<-podejrzany marker (zla endianowosc / rozmiar markera?)")
                break
            f.seek(n, 1)
            tail = f.read(4)
            if len(tail) < 4:
                break
        return "size=" + str(sz) + "  recs=" + str(marks)
    finally:
        f.close()


def read_header(path):
    f = open(path, "rb")
    try:
        q = read_record(f); sh = read_record(f); un = read_record(f); idx = read_record(f)
        if q is None or sh is None or un is None or idx is None or len(idx) < 24:
            return None
        i1, i2, j1, j2, k1, k2 = struct.unpack("<6i", idx[:24])
        nx = i2 - i1 + 1; ny = j2 - j1 + 1; nz = k2 - k1 + 1
        if nx < 1 or ny < 1 or nz < 1:
            return None
        return {"q": clean_str(q), "short": clean_str(sh), "unit": clean_str(un),
                "i1": i1, "i2": i2, "j1": j1, "j2": j2, "k1": k1, "k2": k2,
                "nx": nx, "ny": ny, "nz": nz, "npts": nx * ny * nz, "start": f.tell()}
    finally:
        f.close()


def read_last_frame(path, meta):
    npts = meta["npts"]
    frame_bytes = 12 + 8 + npts * 4
    size = os.path.getsize(path)
    avail = size - meta["start"]
    if avail < frame_bytes:
        return None, "avail=%d < frame_bytes=%d" % (avail, frame_bytes)
    nframes = avail // frame_bytes
    f = open(path, "rb")
    try:
        idx = nframes
        while idx >= 1:
            f.seek(meta["start"] + (idx - 1) * frame_bytes)
            trec = read_record(f)
            drec = read_record(f)
            if trec is not None and drec is not None and len(trec) >= 4 and len(drec) >= npts * 4:
                (t,) = struct.unpack("<f", trec[:4])
                vals = struct.unpack("<" + str(npts) + "f", drec[:npts * 4])
                return {"t": t, "vals": vals, "nframes": nframes}, None
            idx -= 1
        return None, "zaden z %d rekordow klatki nie ma spojnych markerow" % nframes
    finally:
        f.close()


def main():
    if len(sys.argv) < 2:
        print("Uzycie: python3 scripts/probe_sf.py sciezka/do/pliku.sf")
        return
    path = sys.argv[1]
    if not os.path.isfile(path):
        print("Nie ma pliku:", path)
        return

    print("== PLIK ==", path)
    print("struktura:", probe(path))

    meta = read_header(path)
    if meta is None:
        print("BLAD: nie udalo sie odczytac naglowka (3x char + 6xint32).")
        print("      -> prawdopodobnie inny format markerow lub endianowosc.")
        return
    print("naglowek OK:", {k: meta[k] for k in ("q", "short", "unit", "i1", "i2", "j1", "j2", "k1", "k2", "npts")})
    deg = [n for n in ("nx", "ny", "nz") if meta[n] == 1]
    print("wymiar zdegenerowany (plaszczyzna):", deg or "BRAK — to nie jest plaski przekroj (slice 3D?)")

    frame, err = read_last_frame(path, meta)
    if frame is None:
        print("BLAD: brak kompletnej klatki:", err)
        return
    vals = frame["vals"]
    fin = [v for v in vals if v == v and v not in (float("inf"), float("-inf"))]
    vmin = min(fin) if fin else None
    vmax = max(fin) if fin else None
    print("klatek w pliku:", frame["nframes"], "| ostatni t =", round(frame["t"], 3), "s")
    print("wartosci: vmin=", vmin, " vmax=", vmax, " (skonczonych:", len(fin), "/", len(vals), ")")

    smv = glob.glob(os.path.join(os.path.dirname(os.path.abspath(path)), "*.smv"))
    print("plik .smv obok:", os.path.basename(smv[0]) if smv else "BRAK (geometria bedzie w komorkach, nie w metrach)")
    print()
    print("WNIOSEK: parser potrafi odczytac ten plik. Jesli podglad i tak byl pusty,")
    print("         problem lezy po stronie strumienia/migracji/wdrozenia, nie formatu.")


if __name__ == "__main__":
    main()
