export interface CloudInitParams {
  caseId: string;
  fileName: string;
  /** Liczba procesów MPI z planu — może być MNIEJSZA niż liczba siatek.
   *  FDS rozdziela wtedy siatki między procesy sam (o ile plik nie ustawia
   *  MPI_PROCESS), co pozwala policzyć duży model na mniejszej maszynie. */
  ncores: number;
  ompThreads: number;    // = OMP_NUM_THREADS (wątki OpenMP na proces)
  appUrl: string;
  /**
   * Token TEGO zlecenia (lib/jobToken.ts) — jedyny sekret, jaki maszyna zna.
   * Uprawnia wyłącznie do raportowania o tym zleceniu i proszenia o podpisane
   * adresy zapisu pod jego katalogiem w magazynie. Maszyna NIE dostaje klucza
   * service_role, tokenu Hetznera ani kluczy magazynu.
   */
  jobToken: string;
  /** Podpisany, krótkotrwały adres pliku wejściowego (Supabase Storage). */
  inputUrl: string;
  fdsDownloadUrl: string;
}

import { gzipSync } from "zlib";
import { SMV_PREVIEW_PY } from "./smvPreview";

/**
 * Limit Hetznera na `user_data` (znaki). Przekroczenie = 422 przy tworzeniu
 * maszyny, czyli KAŻDE uruchomienie kończy się błędem — pilnuje tego test.
 */
export const USER_DATA_LIMIT = 32768;

/**
 * Odchudza skrypt przed wysłaniem jako user_data:
 *  - heredoki z Pythonem (`cat > PLIK <<'PYEOF' … PYEOF`) jadą jako gzip+base64
 *    rozpakowywany na maszynie — sam tekst skryptów to ponad połowa objętości,
 *  - linie zawierające wyłącznie komentarz basha wypadają (zostają w źródle TS,
 *    maszynie do niczego nie służą, a polskie znaki liczą się podwójnie).
 * Shebang zostaje. Treść heredoków jest już spakowana, więc ich `#` nie ruszamy.
 */
export function compactUserData(script: string): string {
  const packed = script.replace(
    /^cat > ("[^"\n]+") <<'PYEOF'\n([\s\S]*?)\nPYEOF$/gm,
    (_m, path: string, body: string) =>
      `echo '${gzipSync(Buffer.from(body + "\n", "utf8"), { level: 9 }).toString("base64")}' | base64 -d | gunzip > ${path}`
  );
  return packed
    .split("\n")
    .filter((line, i) => i === 0 || !/^\s*#/.test(line))
    .join("\n");
}

/** Co ile sekund zegara maszyna renderuje podgląd Smokeview w trakcie biegu. */
export const SMV_LIVE_INTERVAL_S = 300;

export function generateCloudInit(p: CloudInitParams): string {
  return compactUserData(cloudInitScript(p));
}

function cloudInitScript(p: CloudInitParams): string {
  const useSnapshot = !!process.env.HETZNER_SNAPSHOT_ID;
  const fdsBin = "/opt/fds6/bin/fds";

  return `#!/bin/bash
set -euo pipefail
exec > >(tee /var/log/fds-runner.log) 2>&1

CASE_ID="${p.caseId}"
FILE_NAME="${p.fileName}"
NCORES="${p.ncores}"
OMP_THREADS="${p.ompThreads}"
APP_URL="${p.appUrl}"
JOB_TOKEN="${p.jobToken}"
INPUT_URL="${p.inputUrl}"
WORKDIR="/opt/fds_job"
STOP_HANDLED=0
UPLOAD_ERR=/tmp/upload_err.log

log() { echo "[$(date '+%H:%M:%S')] $1"; }

# ── Maszyna nie przyjmuje połączeń ───────────────────────────────────────────
# Firewall Hetznera odcina cały ruch przychodzący (lib/hetzner/client.ts).
# Tu druga warstwa: bez logowania hasłem i bez hasła roota, gdyby ktoś kiedyś
# otworzył port w panelu do diagnostyki — wtedy wchodzi się wyłącznie kluczem.
passwd -l root 2>/dev/null || true
if [ -f /etc/ssh/sshd_config ]; then
  sed -i -e 's/^#\\?PasswordAuthentication .*/PasswordAuthentication no/' \\
         -e 's/^#\\?PermitRootLogin .*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
  systemctl reload ssh 2>/dev/null || systemctl reload sshd 2>/dev/null || true
fi

notify() {
  curl -sfL -X POST "$APP_URL/api/symulacje/$CASE_ID/complete" \\
    -H "Content-Type: application/json" \\
    -H "x-job-token: $JOB_TOKEN" \\
    -d "$1" -o /dev/null || true
}

# Zgłoszenie KOŃCOWE — po nim serwis kasuje maszynę. Gdy serwis chwilowo nie
# odpowiada, ponawiamy przez kilkanaście minut; jeśli i to zawiedzie, zlecenie
# zamknie nadzorca (brak postępu), a z nim zwolni maszynę. Maszyna nie ma już
# tokenu Hetznera, więc nie kasuje się sama.
notify_final() {
  local i
  for i in $(seq 1 15); do
    if curl -sfL -X POST "$APP_URL/api/symulacje/$CASE_ID/complete" \\
      -H "Content-Type: application/json" \\
      -H "x-job-token: $JOB_TOKEN" \\
      -d "$1" -o /dev/null; then return 0; fi
    sleep 60
  done
  log "nie udalo sie zglosic zakonczenia — maszyne zwolni nadzorca"
  return 0
}

on_exit() {
  local code=$?
  if [ $code -ne 0 ]; then
    log "=== Script exited with error: $code ==="
    send_log 2>/dev/null || true
    notify_final "{\\\"status\\\":\\\"failed\\\",\\\"exitCode\\\":$code}" || true
  fi
}
trap on_exit EXIT

# Łagodne zatrzymanie na życzenie użytkownika — utwórz plik CHID.stop
# (FDS kończy bieżący krok, zapisuje wyniki i wychodzi czysto). Idempotentne.
# CHID wyprowadzamy z pliku CHID.smv, który FDS tworzy na starcie (odporne na spacje).
maybe_stop() {
  [ "$STOP_HANDLED" = "1" ] && return 0
  case "$1" in
    *'"stop":true'*)
      local chid
      chid=$(ls -1 *.smv 2>/dev/null | head -1 | sed 's/\\.smv$//' || true)
      [ -z "$chid" ] && return 0
      log "Otrzymano żądanie zatrzymania — tworzę plik stop dla CHID: $chid"
      touch "$WORKDIR/$chid.stop" 2>/dev/null || true
      STOP_HANDLED=1
      ;;
  esac
}

# ── Log przyrostowy ───────────────────────────────────────────────────────────
# Wysyłamy WYŁĄCZNIE to, co dopisało się od poprzedniej próbki. Wcześniej każda
# próbka niosła cały ogon logu (do 1 MB), czyli te same setki kilobajtów co
# kilka sekund — przy kilkunastu maszynach naraz to gigabajty ruchu dziennie za
# treść, którą serwer już ma.
#
# Offset trzymamy w PLIKU, nie w zmiennej: pętla podglądu chodzi w tle jako
# osobny proces, a send_log wołamy też z głównego skryptu (koniec pracy, trap
# na błędzie). Zmienna nie przeżyłaby tej granicy i log poleciałby drugi raz.
LOG_FILE=/var/log/fds-runner.log
LOG_OFFSET_FILE=/tmp/fds-log-offset
LOG_CHUNK_FILE=/tmp/fds-log-chunk

# Wypisuje base64 przyrostu (pusto = nic nowego) i zostawia surowy fragment na
# dysku, żeby commit_log_offset mógł policzyć realnie odczytane bajty. Liczymy
# je z pliku, a nie z rozmiaru logu — log rośnie w trakcie odczytu.
log_chunk_b64() {
  local off size
  [ -f "$LOG_FILE" ] || return 0
  off=$(cat "$LOG_OFFSET_FILE" 2>/dev/null || echo 0)
  size=$(stat -c %s "$LOG_FILE" 2>/dev/null || echo 0)
  # Log obrócony albo skrócony — czytamy od początku, zamiast wysyłać śmieci
  [ "$size" -lt "$off" ] && off=0
  [ "$size" -le "$off" ] && return 0
  tail -c +$((off + 1)) "$LOG_FILE" > "$LOG_CHUNK_FILE" 2>/dev/null || return 0
  echo "$off" > "$LOG_CHUNK_FILE.off"
  base64 -w0 "$LOG_CHUNK_FILE" 2>/dev/null || true
}

# Offset przesuwamy DOPIERO po udanej wysyłce — nieudana próba powtórzy ten sam
# fragment, zamiast zostawić dziurę w logu.
commit_log_offset() {
  local off n
  off=$(cat "$LOG_CHUNK_FILE.off" 2>/dev/null || echo 0)
  n=$(stat -c %s "$LOG_CHUNK_FILE" 2>/dev/null || echo 0)
  echo $((off + n)) > "$LOG_OFFSET_FILE"
}

send_log() {
  local chunk resp
  chunk=$(log_chunk_b64)
  [ -z "$chunk" ] && return 0
  resp=""
  # Body przez stdin (printf to builtin) — omija limit ARG_MAX na argument curl
  if resp=$(printf '{"status":"running","logChunk":"%s"}' "$chunk" | curl -sfL -X POST "$APP_URL/api/symulacje/$CASE_ID/complete" \\
    -H "Content-Type: application/json" \\
    -H "x-job-token: $JOB_TOKEN" \\
    --data-binary @- 2>/dev/null); then
    commit_log_offset
  else
    resp=""
  fi
  maybe_stop "$resp"
}

# Downsampluj CSV do <= ~500 wierszy danych (nagłówki + co N-ta linia)
downsample() {
  local f="$1"
  [ -f "$f" ] || return 1
  local total data step
  total=$(wc -l < "$f" 2>/dev/null || echo 0)
  data=$((total - 2))
  if [ "$data" -lt 1 ]; then cat "$f"; return 0; fi
  step=$(( (data + 499) / 500 ))
  [ "$step" -lt 1 ] && step=1
  awk -v step="$step" 'NR<=2 || (NR-2) % step == 0' "$f"
}

# Wyślij bieżące wyniki DEVC/HRR + partię nowych klatek przekroju (podgląd na żywo)
send_data() {
  local devc_file hrr_file devc hrr slice chunk resp
  devc_file=$(ls -1 *_devc.csv 2>/dev/null | head -1 || true)
  hrr_file=$(ls -1 *_hrr.csv 2>/dev/null | head -1 || true)
  devc=""
  hrr=""
  slice=""
  [ -n "$devc_file" ] && [ -f "$devc_file" ] && devc=$(downsample "$devc_file" | base64 -w0 || true)
  [ -n "$hrr_file" ] && [ -f "$hrr_file" ] && hrr=$(downsample "$hrr_file" | base64 -w0 || true)
  # Przekrój (.sf → JSON) — best-effort, tylko jeśli mamy python3 i skrypt
  if command -v python3 >/dev/null 2>&1 && [ -f "$WORKDIR/slice_frame.py" ]; then
    slice=$(python3 "$WORKDIR/slice_frame.py" "$WORKDIR" 2>/tmp/slice_err.log | base64 -w0 || true)
  elif ! command -v python3 >/dev/null 2>&1; then
    log "podglad: przekroj pominiety — brak python3 na maszynie"
  fi
  # Diagnostyka zdalna: gdy przekrój pusty, a skrypt coś zgłosił na stderr — pokaż powód
  if [ -z "$slice" ] && [ -s /tmp/slice_err.log ]; then
    log "podglad-diag: $(head -c 200 /tmp/slice_err.log | tr '\\n' ' ')"
  fi
  # Log jedzie TYM SAMYM żądaniem co dane — dwa osobne POST-y co próbkę
  # podwajały liczbę wywołań funkcji, nie wnosząc nic ponad to jedno.
  chunk=$(log_chunk_b64)
  if [ -z "$chunk" ] && [ -z "$devc" ] && [ -z "$hrr" ] && [ -z "$slice" ]; then
    log "podglad: brak danych DEVC/HRR/przekroju (FDS jeszcze nie zapisał *_devc.csv / *_hrr.csv / *.sf)"
    return 0
  fi
  log "podglad: wysylam LOG=\${#chunk}B DEVC=\${#devc}B HRR=\${#hrr}B SLICE=\${#slice}B"
  resp=""
  # Body przez stdin (printf to builtin) — omija limit ARG_MAX na argument curl
  if resp=$(printf '{"status":"running","logChunk":"%s","devcCsv":"%s","hrrCsv":"%s","sliceJson":"%s"}' "$chunk" "$devc" "$hrr" "$slice" | \\
    curl -sfL -X POST "$APP_URL/api/symulacje/$CASE_ID/complete" \\
    -H "Content-Type: application/json" \\
    -H "x-job-token: $JOB_TOKEN" \\
    --data-binary @- 2>/dev/null); then
    [ -n "$chunk" ] && commit_log_offset
  else
    resp=""
  fi
  maybe_stop "$resp"
}

log "=== FDS Runner start: $CASE_ID (MPI=\${NCORES} x OMP=\${OMP_THREADS}) ==="

${useSnapshot ? `
# ── FDS pre-installed ze snapshotu ───────────────────────────────────────────
export LD_LIBRARY_PATH="\${LD_LIBRARY_PATH:-}"
source /opt/fds6/bin/FDS6VARS.sh 2>/dev/null || true
FDS_BIN=$(find /opt/fds6/bin -maxdepth 1 -name "fds" -o -name "fds_linux*" 2>/dev/null | grep -v openmp | head -1 || echo "${fdsBin}")
[ ! -x "$FDS_BIN" ] && { log "ERROR: FDS binary not found in snapshot"; notify '{"status":"failed","exitCode":127}'; exit 1; }
log "FDS ready (snapshot): $FDS_BIN"
` : `
# ── Instalacja FDS (fallback gdy brak snapshotu) ──────────────────────────────
apt-get update -qq
apt-get install -y openmpi-bin libopenmpi-dev wget curl expect python3 2>/dev/null
log "Downloading FDS installer..."
wget -q "${p.fdsDownloadUrl}" -O /tmp/fds_installer.sh
chmod +x /tmp/fds_installer.sh
mkdir -p /opt/fds6

# Próba ekstrakcji bez interakcji (makeself --noexec)
if bash /tmp/fds_installer.sh --noexec --target /opt/fds6 2>/dev/null; then
  log "FDS extracted via --noexec"
else
  log "Running FDS installer with expect..."
  expect -c '
    set timeout 300
    spawn bash /tmp/fds_installer.sh
    expect -re {press ENTER|ENTER to} { send "\\r" }
    expect -re {\\(q\\)|press q}       { send "q\\r" }
    expect -re {yes/no|accept}         { send "yes\\r" }
    expect -re {directory|path}        { send "/opt/fds6\\r" }
    expect eof
  '
fi
FDS_BIN=$(find /opt/fds6 -name "fds_linux*" -perm /111 -type f 2>/dev/null | head -1)
[ -z "$FDS_BIN" ] && { log "ERROR: FDS binary not found"; notify '{"status":"failed","exitCode":127}'; exit 1; }
log "FDS installed: $FDS_BIN"
`}

# ── Pobierz plik FDS ──────────────────────────────────────────────────────────
mkdir -p "$WORKDIR" && cd "$WORKDIR"
log "Downloading input: $FILE_NAME"
# Adres jest podpisany i krótkotrwały — maszyna nie zna klucza do magazynu plików.
curl -sLf "$INPUT_URL" -o "$FILE_NAME"
log "Input ready: $(wc -c < "$FILE_NAME") bytes"

# ── Skrypt podglądu przekroju (.sf → JSON) — „na żywo jak Smokeview" ──────────
# Wyciąga NOWE klatki wybranych przekrojów SLCF od ostatniego cyklu (stan w
# .slice_state.json): najnowsza klatka w pełnej rozdzielczości (data) + do MAXFRAMES
# klatek pośrednich w lżejszej rozdzielczości (frames[]), by przekrój płynął klatka
# po klatce. Downsampling + kwantyzacja do uint8. Tylko stdlib Pythona — brak
# zależności pip, by nie ryzykować niezawodności cloud-init.
cat > "$WORKDIR/slice_frame.py" <<'PYEOF'
import sys, os, glob, struct, json, base64

WORK = sys.argv[1] if len(sys.argv) > 1 else "."
MAXDIM_LATEST = 200
MAXDIM_HIST = 96
MAXSLICES = 6
MAXFRAMES = 6
STATE_FILE = os.path.join(WORK, ".slice_state.json")

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

def parse_smv(work):
    meshes = []
    slices = {}
    files = glob.glob(os.path.join(work, "*.smv"))
    if not files:
        return meshes, slices
    try:
        fh = open(files[0], "r", errors="ignore")
        lines = fh.read().split(chr(10))
        fh.close()
    except Exception:
        return meshes, slices
    n = len(lines)
    cur = None
    i = 0
    while i < n:
        key = lines[i].strip()
        if key.startswith("GRID"):
            cur = {}
            parts = lines[i + 1].split() if i + 1 < n else []
            if len(parts) >= 3:
                cur["ibar"] = int(parts[0]); cur["jbar"] = int(parts[1]); cur["kbar"] = int(parts[2])
            meshes.append(cur)
            i += 2
            continue
        if key.startswith("PDIM") and cur is not None:
            parts = lines[i + 1].split() if i + 1 < n else []
            if len(parts) >= 6:
                cur["xmin"] = float(parts[0]); cur["xmax"] = float(parts[1])
                cur["ymin"] = float(parts[2]); cur["ymax"] = float(parts[3])
                cur["zmin"] = float(parts[4]); cur["zmax"] = float(parts[5])
            i += 2
            continue
        if key.startswith("SLCF") or key.startswith("SLCC"):
            toks = key.replace("&", " ").split()
            mno = 1
            if len(toks) >= 2:
                try:
                    mno = int(toks[1])
                except Exception:
                    mno = 1
            fname = os.path.basename(lines[i + 1].strip()) if i + 1 < n else ""
            if fname:
                slices[fname] = mno - 1
            i += 5
            continue
        i += 1
    return meshes, slices

def read_header(path):
    try:
        f = open(path, "rb")
    except Exception:
        return None
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

def count_frames(path, meta):
    frame_bytes = 12 + 8 + meta["npts"] * 4
    try:
        size = os.path.getsize(path)
    except Exception:
        return 0
    avail = size - meta["start"]
    if avail < frame_bytes:
        return 0
    return avail // frame_bytes

def read_frame_at(f, meta, idx):
    npts = meta["npts"]
    frame_bytes = 12 + 8 + npts * 4
    f.seek(meta["start"] + (idx - 1) * frame_bytes)
    trec = read_record(f)
    drec = read_record(f)
    if trec is None or drec is None or len(trec) < 4 or len(drec) < npts * 4:
        return None
    (t,) = struct.unpack("<f", trec[:4])
    vals = struct.unpack("<" + str(npts) + "f", drec[:npts * 4])
    return {"t": t, "vals": vals}

def coord(amin, amax, cnt, i):
    if not cnt:
        return float(i)
    return amin + (amax - amin) * (float(i) / float(cnt))

def base_geom(path, meta, meshes, smap):
    nx = meta["nx"]; ny = meta["ny"]; nz = meta["nz"]
    if nx == 1:
        plane = "x"; NH = ny; NV = nz; ax = "y"; ay = "z"; stepv = ny
        hlo = meta["j1"]; hhi = meta["j2"]; vlo = meta["k1"]; vhi = meta["k2"]; clo = meta["i1"]
    elif ny == 1:
        plane = "y"; NH = nx; NV = nz; ax = "x"; ay = "z"; stepv = nx
        hlo = meta["i1"]; hhi = meta["i2"]; vlo = meta["k1"]; vhi = meta["k2"]; clo = meta["j1"]
    else:
        plane = "z"; NH = nx; NV = ny; ax = "x"; ay = "y"; stepv = nx
        hlo = meta["i1"]; hhi = meta["i2"]; vlo = meta["j1"]; vhi = meta["j2"]; clo = meta["k1"]
    mesh = None
    mi = smap.get(os.path.basename(path))
    if mi is not None and 0 <= mi < len(meshes):
        mesh = meshes[mi]
    kind = "cell"
    x0 = float(hlo); x1 = float(hhi); y0 = float(vlo); y1 = float(vhi); pos = float(clo)
    if mesh and ("xmin" in mesh) and mesh.get("ibar"):
        cnt = {"x": mesh["ibar"], "y": mesh["jbar"], "z": mesh["kbar"]}
        lo = {"x": mesh["xmin"], "y": mesh["ymin"], "z": mesh["zmin"]}
        hi = {"x": mesh["xmax"], "y": mesh["ymax"], "z": mesh["zmax"]}
        x0 = coord(lo[ax], hi[ax], cnt[ax], hlo)
        x1 = coord(lo[ax], hi[ax], cnt[ax], hhi)
        y0 = coord(lo[ay], hi[ay], cnt[ay], vlo)
        y1 = coord(lo[ay], hi[ay], cnt[ay], vhi)
        pos = coord(lo[plane], hi[plane], cnt[plane], clo)
        kind = "m"
    return {"plane": plane, "NH": NH, "NV": NV, "ax": ax, "ay": ay, "stepv": stepv,
            "x0": x0, "x1": x1, "y0": y0, "y1": y1, "pos": pos, "coords": kind}

def steps_for(NH, NV, maxdim):
    sh = 1
    while (NH + sh - 1) // sh > maxdim:
        sh += 1
    sv = 1
    while (NV + sv - 1) // sv > maxdim:
        sv += 1
    return sh, sv

def quantize(vals, g, maxdim):
    NH = g["NH"]; NV = g["NV"]; stepv = g["stepv"]
    sh, sv = steps_for(NH, NV, maxdim)
    vmin = None; vmax = None
    rows = []
    v = 0
    while v < NV:
        row = []
        h = 0
        while h < NH:
            x = vals[v * stepv + h]
            if x == x and x != float("inf") and x != float("-inf"):
                if vmin is None or x < vmin: vmin = x
                if vmax is None or x > vmax: vmax = x
            row.append(x)
            h += sh
        rows.append(row)
        v += sv
    if vmin is None:
        return None
    if vmax <= vmin:
        vmax = vmin + 1.0
    span = vmax - vmin
    buf = bytearray()
    for row in rows:
        for x in row:
            if x != x or x == float("inf") or x == float("-inf"):
                buf.append(0)
            else:
                q = int((x - vmin) / span * 255.0 + 0.5)
                if q < 0: q = 0
                if q > 255: q = 255
                buf.append(q)
    data = base64.b64encode(bytes(buf)).decode("ascii")
    w = len(rows[0]) if rows else 0
    return {"w": w, "h": len(rows), "vmin": round(vmin, 3), "vmax": round(vmax, 3), "data": data}

def load_state():
    try:
        fh = open(STATE_FILE, "r")
        s = json.load(fh)
        fh.close()
        if isinstance(s, dict):
            return s
    except Exception:
        pass
    return {}

def save_state(s):
    try:
        fh = open(STATE_FILE, "w")
        json.dump(s, fh)
        fh.close()
    except Exception:
        pass

def main():
    meshes, smap = parse_smv(WORK)
    files = sorted(glob.glob(os.path.join(WORK, "*.sf")))
    if not files:
        sys.stderr.write("brak plikow .sf w " + WORK + chr(10))
        return
    pref = ["TEMPERATURE", "VISIBILITY", "SOOT VISIBILITY", "SOOT DENSITY", "HRRPUV", "VELOCITY"]
    cands = []
    for path in files:
        meta = read_header(path)
        if meta is None:
            continue
        q = meta["q"].upper()
        rank = pref.index(q) if q in pref else len(pref)
        cands.append((rank, path, meta))
    if not cands:
        sys.stderr.write("znaleziono " + str(len(files)) + " plikow .sf, ale zaden nie ma czytelnego naglowka" + chr(10))
        return
    # Deduplikuj po (wielkosc, plaszczyzna, pozycja) wybierajac najwiekszy fragment
    # (multi-mesh). Geometria z samego naglowka — bez czytania klatek.
    winners = {}
    for rank, path, meta in cands:
        g = base_geom(path, meta, meshes, smap)
        key = (meta["q"], g["plane"], round(g["pos"], 2))
        cur = winners.get(key)
        if cur is None or meta["npts"] > cur[2]["npts"]:
            winners[key] = (rank, path, meta, g)
    ordered = sorted(winners.values(), key=lambda w: (w[0], -w[2]["npts"]))
    state = load_state()
    out = []
    for rank, path, meta, g in ordered[:MAXSLICES]:
        bname = os.path.basename(path)
        total = count_frames(path, meta)
        if total < 1:
            continue
        sent = state.get(bname, 0)
        if not isinstance(sent, int) or sent < 0 or sent > total:
            sent = 0
        lo = sent + 1
        hi = total
        if lo > hi:
            lo = hi
        # Ogranicz partie do najnowszych MAXFRAMES+1 klatek (najnowsza + historia),
        # by uniknac ogromnego payloadu przy pierwszym cyklu / po zastoju.
        if hi - lo + 1 > MAXFRAMES + 1:
            lo = hi - MAXFRAMES
        try:
            f = open(path, "rb")
        except Exception:
            continue
        frames = []
        try:
            idx = lo
            while idx <= hi:
                fr = read_frame_at(f, meta, idx)
                if fr is not None:
                    frames.append(fr)
                idx += 1
        finally:
            f.close()
        if not frames:
            continue
        latest = frames[-1]
        qz = quantize(latest["vals"], g, MAXDIM_LATEST)
        if qz is None:
            continue
        o = {"id": bname, "q": meta["q"], "unit": meta["unit"], "short": meta["short"],
             "plane": g["plane"], "pos": round(g["pos"], 3), "ax": g["ax"], "ay": g["ay"],
             "x0": round(g["x0"], 3), "x1": round(g["x1"], 3), "y0": round(g["y0"], 3), "y1": round(g["y1"], 3),
             "coords": g["coords"], "t": round(latest["t"], 2),
             "w": qz["w"], "h": qz["h"], "vmin": qz["vmin"], "vmax": qz["vmax"], "data": qz["data"]}
        hframes = []
        j = 0
        while j < len(frames) - 1:
            fr = frames[j]
            hz = quantize(fr["vals"], g, MAXDIM_HIST)
            if hz is not None:
                hframes.append({"t": round(fr["t"], 2), "vmin": hz["vmin"], "vmax": hz["vmax"],
                                "w": hz["w"], "h": hz["h"], "d": hz["data"]})
            j += 1
        if hframes:
            o["frames"] = hframes
        out.append(o)
        state[bname] = total
    save_state(state)
    if not out:
        sys.stderr.write("brak kompletnej klatki w zadnym z " + str(len(cands)) + " plikow .sf" + chr(10))
        return
    sys.stdout.write(json.dumps({"slices": out}))

main()
PYEOF

# python3 jest potrzebny do podglądu przekroju I do wysyłki wyników (poniżej),
# więc jego brak to błąd zlecenia, nie degradacja.
command -v python3 >/dev/null 2>&1 || { log "Instaluję python3..."; apt-get update -qq 2>/dev/null && apt-get install -y python3 2>/dev/null || true; }
command -v python3 >/dev/null 2>&1 || { log "ERROR: brak python3 — bez niego nie wysle wynikow"; exit 1; }

# ── Magazyn wyników (Object Storage) ──────────────────────────────────────────
# Konfigurowany PRZED startem FDS, bo migawki wyników lecą już w trakcie obliczeń.
#
# Maszyna NIE MA kluczy magazynu. Dla każdej partii plików prosi serwis o
# podpisane adresy PUT (ważne kilkanaście minut, wyłącznie pod katalogiem tego
# zlecenia) i wysyła bajty curl-em wprost do magazynu. Python robi tylko JSON
# i jedno żądanie HTTP; wielogigabajtowy .s3d nie przechodzi przez interpreter.
cat > "$WORKDIR/upload_urls.py" <<'PYEOF'
import sys, json, urllib.request
app, case, token = sys.argv[1], sys.argv[2], sys.argv[3]
files = [l.strip() for l in sys.stdin if l.strip()]
urls = {}
for i in range(0, len(files), 500):
    chunk = files[i:i + 500]
    req = urllib.request.Request(
        app + "/api/symulacje/" + case + "/upload-urls",
        data=json.dumps({"files": chunk}).encode(),
        headers={"Content-Type": "application/json", "x-job-token": token},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            urls.update(json.load(r).get("urls", {}))
    except Exception as e:
        print("upload-urls: " + str(e), file=sys.stderr)
for f in files:
    u = urls.get(f)
    if u:
        print(f + "\t" + u)
    else:
        print("brak adresu: " + f, file=sys.stderr)
PYEOF

# $@ = ścieżki względem WORKDIR. Wypisuje liczbę wysłanych plików; błędy idą do
# UPLOAD_ERR (upload_diag pokazuje je w logu zlecenia).
put_files() {
  local n=0 rel url
  [ "$#" -gt 0 ] || { echo 0; return 0; }
  while IFS=$'\\t' read -r rel url; do
    [ -n "$rel" ] && [ -n "$url" ] || continue
    [ -f "$WORKDIR/$rel" ] || continue
    if curl -sf -X PUT -T "$WORKDIR/$rel" "$url" -o /dev/null 2>>"$UPLOAD_ERR"; then
      n=$((n + 1))
    else
      echo "upload nieudany: $rel" >> "$UPLOAD_ERR"
    fi
  done < <(printf '%s\\n' "$@" | python3 "$WORKDIR/upload_urls.py" "$APP_URL" "$CASE_ID" "$JOB_TOKEN" 2>>"$UPLOAD_ERR")
  echo "$n"
}

upload_diag() {
  [ -s "$UPLOAD_ERR" ] || return 0
  log "upload: $(tail -c 300 "$UPLOAD_ERR" | tr '\\n' ' ')"
  : > "$UPLOAD_ERR"
}

# Pliki wynikowe = wszystko z prefiksem CHID (.smv, .sf, .bf, .iso, .s3d, .bnd,
# .end, .ge, .prt5, *_devc.csv…) plus log. Wcześniej lista rozszerzeń była
# zamknięta i gubiła m.in. izopowierzchnie (.iso/.viso) oraz pliki .bnd/.end —
# paczka nie otwierała się wtedy w Smokeview w całości. Pomijamy plik wejściowy
# (klient go ma) i nasze pliki pomocnicze.
result_files() {
  local chid f
  chid=$(ls -1 *.smv 2>/dev/null | head -1 | sed 's/\\.smv$//' || true)
  for f in *; do
    [ -f "$f" ] || continue
    case "$f" in
      *.ssf|*.ini|smv_preview.py|slice_frame.py|_snapshot.json|"$FILE_NAME") continue ;;
    esac
    if [ -n "$chid" ] && [ "\${f#"$chid"}" != "$f" ]; then echo "$f"; continue; fi
    case "$f" in *.csv|*.out|fds_output.log) echo "$f" ;; esac
  done
}

# Migawka wyników W TRAKCIE obliczeń — użytkownik pobiera częściowe wyniki BEZ
# zatrzymywania symulacji. Pliki lądują pod tym samym prefiksem co finalne, więc
# istniejące pobieranie (pojedynczy plik / ZIP) działa bez zmian, a końcowy upload
# nadpisze je kompletnymi wersjami. Best-effort: pliki są dopisywane przez FDS,
# więc migawka bywa ucięta na ostatnim rekordzie — to akceptowalne dla podglądu.
snapshot_results() {
  local n files
  mapfile -t files < <(result_files)
  [ "\${#files[@]}" -gt 0 ] || return 0
  n=$(put_files "\${files[@]}")
  upload_diag
  if [ "$n" -eq 0 ]; then
    return 0
  fi
  # Manifest migawki: do jakiego CZASU SYMULACJI sięgają wysłane pliki. Czytamy
  # ostatnie "Simulation Time:" z logu FDS. Wysyłany NA KOŃCU — jego obecność
  # oznacza, że komplet plików migawki jest już w magazynie.
  local simt
  simt=$(grep -a "Simulation Time:" fds_output.log 2>/dev/null | tail -1 | sed -e "s/.*Simulation Time:[ ]*//" -e "s/[ ]*s.*//" | tr -d "[:space:]" || true)
  # -1 = nie udało się odczytać czasu (UI pokaże „nieznany zakres" zamiast 0%).
  case "$simt" in
    ''|*[!0-9.eE+-]*) simt="-1" ;;
  esac
  printf '{"t":%s,"at":"%s"}' "$simt" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > _snapshot.json
  put_files _snapshot.json >/dev/null
  log "migawka wynikow: wyslano $n plikow, t=$simt s (pobieranie w trakcie obliczen)"
  return 0
}

# ── Podgląd Smokeview (render bez ekranu) ─────────────────────────────────────
# Prawdziwy Smokeview z pakietu FDS renderuje przez Xvfb + Mesa (programowy
# OpenGL) przekroje i dym 3D z bieżącego stanu plików. Obrazy lądują w magazynie
# pod _preview/ razem z manifestem; strona zlecenia je wyświetla. Wszystko
# best-effort: brak programu, bibliotek czy błąd renderu NIE dotyka obliczeń.
cat > "$WORKDIR/smv_preview.py" <<'PYEOF'
${SMV_PREVIEW_PY}
PYEOF

PREVIEW_STATE=/tmp/smv-preview-bin
SMV_PKGS="xvfb xauth libgl1 libgl1-mesa-dri libglu1-mesa libxmu6 libxi6"

preview_setup() {
  [ -s "$PREVIEW_STATE" ] && return 0
  [ -f "$PREVIEW_STATE.failed" ] && return 1
  local bin
  bin=$(find /opt/fds6 -maxdepth 4 -type f -name 'smokeview*' -perm /111 2>/dev/null | grep -v '\\.sh$' | head -1 || true)
  if [ -z "$bin" ]; then
    log "smokeview: brak programu w instalacji FDS — podglad wylaczony"
    touch "$PREVIEW_STATE.failed"; return 1
  fi
  if ! command -v xvfb-run >/dev/null 2>&1; then
    log "smokeview: instaluje Xvfb i Mesa (render bez ekranu)..."
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq $SMV_PKGS >/dev/null 2>&1 \\
      || { apt-get update -qq >/dev/null 2>&1 && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq $SMV_PKGS >/dev/null 2>&1; } \\
      || true
  fi
  if ! command -v xvfb-run >/dev/null 2>&1; then
    log "smokeview: brak xvfb-run — podglad wylaczony"
    touch "$PREVIEW_STATE.failed"; return 1
  fi
  echo "$bin" > "$PREVIEW_STATE"
  log "smokeview: gotowy ($bin)"
}

sim_time_now() {
  grep -a "Simulation Time:" "$WORKDIR/fds_output.log" 2>/dev/null | tail -1 \\
    | sed -e "s/.*Simulation Time:[ ]*//" -e "s/[ ]*s.*//" | tr -d "[:space:]" || true
}

# $1 = live (bieżąca chwila) | report (seria co stały krok czasu — ryciny do raportu)
render_preview() {
  local kind="$1" t chid limit n=0 rels
  preview_setup || return 0
  t=$(sim_time_now)
  case "$t" in ''|*[!0-9.eE+-]*) return 0 ;; esac
  if ! chid=$(cd "$WORKDIR" && python3 smv_preview.py plan "$WORKDIR" "$kind" "$t" 2>/tmp/smv_plan.err); then
    [ "$kind" = "report" ] && log "smokeview: brak ujec do renderowania ($(head -c 160 /tmp/smv_plan.err | tr '\\n' ' '))"
    return 0
  fi
  limit=240; [ "$kind" = "report" ] && limit=900
  ( cd "$WORKDIR" && LP_NUM_THREADS=2 timeout "$limit" nice -n 19 \\
      xvfb-run -a -s "-screen 0 1280x720x24" "$(cat "$PREVIEW_STATE")" -runscript "$chid" > /tmp/smv_run.log 2>&1 ) \\
    || log "smokeview: render z bledem ($(tail -c 200 /tmp/smv_run.log | tr '\\n' ' '))"
  mapfile -t rels < <(cd "$WORKDIR" && python3 smv_preview.py collect "$WORKDIR" 2>/tmp/smv_collect.err | grep -v '^$')
  [ "\${#rels[@]}" -gt 0 ] && n=$(put_files "\${rels[@]}")
  upload_diag
  if [ "$n" -gt 0 ]; then
    # Manifest na końcu — jego nowa wersja oznacza, że obrazy już są w magazynie.
    put_files _preview/manifest.json >/dev/null
    log "smokeview: $kind t=$t s — wyslano $n ujec"
  else
    log "smokeview: $kind t=$t s — brak obrazow ($(head -c 200 /tmp/smv_collect.err | tr '\\n' ' '))"
  fi
}

# ── Uruchom FDS ───────────────────────────────────────────────────────────────
notify '{"status":"running"}'
log "Starting FDS: $NCORES MPI processes..."

# Podgląd na żywo co 30 s: przyrost logu + wyniki DEVC/HRR + partia klatek
# przekroju, wszystko JEDNYM żądaniem. send_data dosyła klatki przyrostowo (od
# ostatnio wysłanej), więc przekrój płynie klatka po klatce zamiast przeskakiwać
# do najnowszej.
#
# 30 s zamiast 5 s: wykres rosnący godzinami nie zyskuje nic na sześciokrotnie
# gęstszym odpytywaniu, a każda próbka to wywołanie funkcji z każdej pracującej
# maszyny naraz.
(
  while true; do
    sleep 30
    send_data
  done
) &
LOG_PID=$!

# Migawki wyników co 2 min w OSOBNEJ pętli — wolny upload nie może opóźniać
# podglądu na żywo powyżej.
(
  while true; do
    sleep 120
    snapshot_results
  done
) &
SNAP_PID=$!

# Podgląd Smokeview co ${SMV_LIVE_INTERVAL_S} s — pierwszy po 90 s, gdy FDS zapisze .smv
# i pierwsze klatki. nice 19 + 2 wątki Mesa: solver traci na tym ułamek procenta.
(
  sleep 90
  while true; do
    render_preview live || true
    sleep ${SMV_LIVE_INTERVAL_S}
  done
) &
PREVIEW_PID=$!

export OMP_NUM_THREADS="$OMP_THREADS"
set +eo pipefail
mpiexec -n "\${NCORES}" "$FDS_BIN" "$FILE_NAME" 2>&1 | tee fds_output.log
FDS_EXIT=\${PIPESTATUS[0]}
set -eo pipefail

# FDS bywa, że kończy z kodem 0 mimo błędu konfiguracji (np. "improperly set-up").
# Wykryj to i potraktuj jako błąd, by nie oznaczyć zlecenia jako Gotowe.
# (Łagodne zatrzymanie użytkownika NIE zawiera tych markerów → pozostaje "done".)
if [ "\${FDS_EXIT}" -eq 0 ] && grep -qiE "improperly set-up|forrtl: severe|Fatal error" fds_output.log 2>/dev/null; then
  log "FDS exit 0, ale log zawiera błąd krytyczny — oznaczam jako failed"
  FDS_EXIT=1
fi

kill $LOG_PID 2>/dev/null || true
kill $SNAP_PID 2>/dev/null || true
kill $PREVIEW_PID 2>/dev/null || true
pkill -f xvfb-run 2>/dev/null || true
pkill -x smokeview 2>/dev/null || true
log "FDS finished (exit: $FDS_EXIT)"
send_log
send_data

# Ryciny do raportu: seria ujęć co stały krok czasu symulacji (≤ ~25 klatek
# na ujęcie). Także po błędzie — policzony fragment też bywa potrzebny.
render_preview report || true

# ── Upload wyników do Hetzner Object Storage ──────────────────────────────────
# Magazyn, RESULTS_PREFIX i upload_file skonfigurowane wyżej (przed startem FDS),
# bo migawki częściowych wyników leciały już w trakcie obliczeń. Ten przebieg
# nadpisuje je kompletnymi plikami.
log "Uploading results to Hetzner Object Storage..."

mapfile -t FINAL_FILES < <(result_files)
FINAL_SENT=0
[ "\${#FINAL_FILES[@]}" -gt 0 ] && FINAL_SENT=$(put_files "\${FINAL_FILES[@]}")
upload_diag
log "  → wyslano \${FINAL_SENT} z \${#FINAL_FILES[@]} plikow"
# Niekompletny upload to awaria po naszej stronie — klient nie dostanie wyników,
# za które miałby zapłacić. Zlecenie idzie w „failed” zamiast udawać „done”.
if [ "$FDS_EXIT" -eq 0 ] && [ "\${FINAL_SENT}" -lt "\${#FINAL_FILES[@]}" ]; then
  log "ERROR: nie wszystkie wyniki trafily do magazynu — oznaczam jako failed"
  FDS_EXIT=75
fi

# ── Powiadomienie końcowe — po nim serwis kasuje maszynę ─────────────────────
STATUS="done"
[ "$FDS_EXIT" -ne 0 ] && STATUS="failed"
log "=== Job $STATUS ==="
send_log
notify_final "{\\\"status\\\":\\\"$STATUS\\\",\\\"exitCode\\\":$FDS_EXIT}"
`;
}
