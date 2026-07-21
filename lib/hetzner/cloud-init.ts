export interface CloudInitParams {
  caseId: string;
  filePath: string;
  fileName: string;
  ncores: number;        // = meshCount (liczba procesów MPI)
  ompThreads: number;    // = OMP_NUM_THREADS (wątki OpenMP na proces)
  supabaseUrl: string;
  supabaseServiceKey: string;
  appUrl: string;
  webhookSecret: string;
  hetznerToken: string;
  fdsDownloadUrl: string;
  storageAccessKey: string;
  storageSecretKey: string;
  storageBucket: string;
  storageEndpoint: string;
  storageRegion: string;
}

export function generateCloudInit(p: CloudInitParams): string {
  const useSnapshot = !!process.env.HETZNER_SNAPSHOT_ID;
  const fdsBin = "/opt/fds6/bin/fds";

  return `#!/bin/bash
set -euo pipefail
exec > >(tee /var/log/fds-runner.log) 2>&1

CASE_ID="${p.caseId}"
FILE_PATH="${p.filePath}"
FILE_NAME="${p.fileName}"
NCORES="${p.ncores}"
OMP_THREADS="${p.ompThreads}"
SUPABASE_URL="${p.supabaseUrl}"
SUPABASE_KEY="${p.supabaseServiceKey}"
APP_URL="${p.appUrl}"
WEBHOOK_SECRET="${p.webhookSecret}"
HETZNER_TOKEN="${p.hetznerToken}"
STORAGE_ACCESS_KEY="${p.storageAccessKey}"
STORAGE_SECRET_KEY="${p.storageSecretKey}"
STORAGE_BUCKET="${p.storageBucket}"
STORAGE_ENDPOINT="${p.storageEndpoint}"
STORAGE_REGION="${p.storageRegion}"
WORKDIR="/opt/fds_job"
STOP_HANDLED=0

log() { echo "[$(date '+%H:%M:%S')] $1"; }

notify() {
  curl -sfL -X POST "$APP_URL/api/symulacje/$CASE_ID/complete" \\
    -H "Content-Type: application/json" \\
    -H "x-webhook-secret: $WEBHOOK_SECRET" \\
    -d "$1" -o /dev/null || true
}

on_exit() {
  local code=$?
  if [ $code -ne 0 ]; then
    log "=== Script exited with error: $code ==="
    send_log 2>/dev/null || true
    notify "{\\\"status\\\":\\\"failed\\\",\\\"exitCode\\\":$code}" || true
    local inst
    inst=$(curl -sf http://169.254.169.254/hetzner/v1/metadata/instance-id 2>/dev/null || echo "")
    [ -n "$inst" ] && curl -sf -X DELETE \\
      "https://api.hetzner.cloud/v1/servers/$inst" \\
      -H "Authorization: Bearer $HETZNER_TOKEN" > /dev/null 2>&1 || true
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

send_log() {
  local msg resp
  msg=$(tail -c 1000000 /var/log/fds-runner.log 2>/dev/null | base64 -w0 || true)
  [ -z "$msg" ] && return 0
  # Body przez stdin (printf to builtin) — omija limit ARG_MAX na argument curl
  resp=$(printf '{"status":"running","log":"%s"}' "$msg" | curl -sfL -X POST "$APP_URL/api/symulacje/$CASE_ID/complete" \\
    -H "Content-Type: application/json" \\
    -H "x-webhook-secret: $WEBHOOK_SECRET" \\
    --data-binary @- 2>/dev/null || true)
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

# Wyślij bieżące wyniki DEVC/HRR + ostatnią klatkę przekroju (podgląd na żywo)
send_data() {
  local devc_file hrr_file devc hrr slice
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
  if [ -z "$devc" ] && [ -z "$hrr" ] && [ -z "$slice" ]; then
    log "podglad: brak danych DEVC/HRR/przekroju (FDS jeszcze nie zapisał *_devc.csv / *_hrr.csv / *.sf)"
    return 0
  fi
  log "podglad: wysylam DEVC=\${#devc}B HRR=\${#hrr}B SLICE=\${#slice}B"
  # Body przez stdin (printf to builtin) — omija limit ARG_MAX na argument curl
  printf '{"status":"running","devcCsv":"%s","hrrCsv":"%s","sliceJson":"%s"}' "$devc" "$hrr" "$slice" | \\
    curl -sfL -X POST "$APP_URL/api/symulacje/$CASE_ID/complete" \\
    -H "Content-Type: application/json" \\
    -H "x-webhook-secret: $WEBHOOK_SECRET" \\
    --data-binary @- -o /dev/null || true
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
log "Downloading: $FILE_PATH"
curl -sLf \\
  -H "Authorization: Bearer $SUPABASE_KEY" \\
  "$SUPABASE_URL/storage/v1/object/fds-files/$FILE_PATH" \\
  -o "$FILE_NAME"
log "Input ready: $(wc -c < "$FILE_NAME") bytes"

# ── Skrypt podglądu przekroju (.sf → JSON) — „na żywo jak Smokeview" ──────────
# Wyciąga OSTATNIĄ kompletną klatkę wybranego przekroju SLCF, downsampluje siatkę
# do ≤96×96 i kwantyzuje wartości do uint8 (payload = w*h bajtów). Tylko stdlib
# Pythona — brak zależności pip, by nie ryzykować niezawodności cloud-init.
cat > "$WORKDIR/slice_frame.py" <<'PYEOF'
import sys, os, glob, struct, json, base64

WORK = sys.argv[1] if len(sys.argv) > 1 else "."
MAXDIM = 96

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

def read_last_frame(path, meta):
    npts = meta["npts"]
    frame_bytes = 12 + 8 + npts * 4
    try:
        size = os.path.getsize(path)
    except Exception:
        return None
    avail = size - meta["start"]
    if avail < frame_bytes:
        return None
    nframes = avail // frame_bytes
    try:
        f = open(path, "rb")
    except Exception:
        return None
    try:
        idx = nframes
        while idx >= 1:
            f.seek(meta["start"] + (idx - 1) * frame_bytes)
            trec = read_record(f)
            drec = read_record(f)
            if trec is not None and drec is not None and len(trec) >= 4 and len(drec) >= npts * 4:
                (t,) = struct.unpack("<f", trec[:4])
                vals = struct.unpack("<" + str(npts) + "f", drec[:npts * 4])
                return {"t": t, "vals": vals}
            idx -= 1
        return None
    finally:
        f.close()

def coord(amin, amax, cnt, i):
    if not cnt:
        return float(i)
    return amin + (amax - amin) * (float(i) / float(cnt))

def build(path, meta, frame, meshes, smap):
    nx = meta["nx"]; ny = meta["ny"]; nz = meta["nz"]
    vals = frame["vals"]
    if nx == 1:
        plane = "x"; NH = ny; NV = nz; ax = "y"; ay = "z"; stepv = ny
        hlo = meta["j1"]; hhi = meta["j2"]; vlo = meta["k1"]; vhi = meta["k2"]; clo = meta["i1"]
    elif ny == 1:
        plane = "y"; NH = nx; NV = nz; ax = "x"; ay = "z"; stepv = nx
        hlo = meta["i1"]; hhi = meta["i2"]; vlo = meta["k1"]; vhi = meta["k2"]; clo = meta["j1"]
    else:
        plane = "z"; NH = nx; NV = ny; ax = "x"; ay = "y"; stepv = nx
        hlo = meta["i1"]; hhi = meta["i2"]; vlo = meta["j1"]; vhi = meta["j2"]; clo = meta["k1"]

    def val_at(h, v):
        return vals[v * stepv + h]

    sh = 1
    while (NH + sh - 1) // sh > MAXDIM:
        sh += 1
    sv = 1
    while (NV + sv - 1) // sv > MAXDIM:
        sv += 1

    vmin = None; vmax = None
    rows = []
    v = 0
    while v < NV:
        row = []
        h = 0
        while h < NH:
            x = val_at(h, v)
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
    return {"q": meta["q"], "unit": meta["unit"], "short": meta["short"],
            "t": round(frame["t"], 2), "w": w, "h": len(rows),
            "plane": plane, "pos": round(pos, 3), "ax": ax, "ay": ay,
            "x0": round(x0, 3), "x1": round(x1, 3), "y0": round(y0, 3), "y1": round(y1, 3),
            "coords": kind, "vmin": round(vmin, 3), "vmax": round(vmax, 3), "data": data}

def main():
    meshes, smap = parse_smv(WORK)
    files = sorted(glob.glob(os.path.join(WORK, "*.sf")))
    if not files:
        sys.stderr.write("brak plikow .sf w " + WORK + chr(10))
        return
    pref = ["TEMPERATURE", "VISIBILITY", "SOOT VISIBILITY", "SOOT DENSITY", "HRRPUV", "VELOCITY"]
    best = None
    for path in files:
        meta = read_header(path)
        if meta is None:
            continue
        q = meta["q"].upper()
        rank = pref.index(q) if q in pref else len(pref)
        score = (rank, -meta["npts"])
        if best is None or score < best[0]:
            best = (score, path, meta)
    if best is None:
        sys.stderr.write("znaleziono " + str(len(files)) + " plikow .sf, ale zaden nie ma czytelnego naglowka" + chr(10))
        return
    _, path, meta = best
    frame = read_last_frame(path, meta)
    if frame is None:
        sys.stderr.write("brak kompletnej klatki w " + os.path.basename(path) + " (FDS jeszcze nie zapisal pelnego kroku)" + chr(10))
        return
    out = build(path, meta, frame, meshes, smap)
    if out is not None:
        sys.stdout.write(json.dumps(out))

main()
PYEOF

# Zapewnij python3 do podglądu przekroju (także na obrazie snapshot) — best-effort
command -v python3 >/dev/null 2>&1 || { log "Instaluję python3 (podgląd przekroju)..."; apt-get update -qq 2>/dev/null && apt-get install -y python3 2>/dev/null || true; }

# ── Uruchom FDS ───────────────────────────────────────────────────────────────
notify '{"status":"running"}'
log "Starting FDS: $NCORES MPI processes..."

# Wysyłaj logi co 5s w tle; wyniki DEVC/HRR co ~10s (co 2. iteracja)
(
  i=0
  while true; do
    sleep 5
    send_log
    i=$((i + 1))
    [ $((i % 2)) -eq 0 ] && send_data
  done
) &
LOG_PID=$!

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
log "FDS finished (exit: $FDS_EXIT)"
send_log
send_data

# ── Upload wyników do Hetzner Object Storage ──────────────────────────────────
log "Uploading results to Hetzner Object Storage..."
RESULTS_PREFIX="results/$CASE_ID"

export AWS_ACCESS_KEY_ID="$STORAGE_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$STORAGE_SECRET_KEY"

if ! command -v aws &>/dev/null; then
  apt-get update -qq
  apt-get install -y awscli 2>/dev/null
fi

upload_file() {
  local f="$1"
  [ -f "$f" ] || return 0
  local bname
  bname=$(basename "$f")
  log "  → $bname"
  aws s3 cp "$f" "s3://$STORAGE_BUCKET/$RESULTS_PREFIX/$bname" \\
    --endpoint-url "$STORAGE_ENDPOINT" \\
    --region "$STORAGE_REGION" \\
    --quiet 2>/dev/null || true
}

for f in *.csv *.smv *.s3d *.q *.sf *.bf *.prt5 *.out fds_output.log; do
  upload_file "$f"
done

# ── Powiadomienie ─────────────────────────────────────────────────────────────
STATUS="done"
[ "$FDS_EXIT" -ne 0 ] && STATUS="failed"
log "=== Job $STATUS ==="
send_log
notify "{\\\"status\\\":\\\"$STATUS\\\",\\\"exitCode\\\":$FDS_EXIT}"

# ── Self-delete ───────────────────────────────────────────────────────────────
INSTANCE_ID=$(curl -sf http://169.254.169.254/hetzner/v1/metadata/instance-id || echo "")
[ -n "$INSTANCE_ID" ] && curl -sf -X DELETE \\
  "https://api.hetzner.cloud/v1/servers/$INSTANCE_ID" \\
  -H "Authorization: Bearer $HETZNER_TOKEN" > /dev/null || true
`;
}
