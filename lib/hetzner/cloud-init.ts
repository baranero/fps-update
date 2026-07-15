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

# Wyślij bieżące wyniki DEVC/HRR (podgląd na żywo) — analogicznie do send_log
send_data() {
  local devc_file hrr_file devc hrr
  devc_file=$(ls -1 *_devc.csv 2>/dev/null | head -1 || true)
  hrr_file=$(ls -1 *_hrr.csv 2>/dev/null | head -1 || true)
  devc=""
  hrr=""
  [ -n "$devc_file" ] && [ -f "$devc_file" ] && devc=$(downsample "$devc_file" | base64 -w0 || true)
  [ -n "$hrr_file" ] && [ -f "$hrr_file" ] && hrr=$(downsample "$hrr_file" | base64 -w0 || true)
  if [ -z "$devc" ] && [ -z "$hrr" ]; then
    log "podglad: brak danych DEVC/HRR (pliki *_devc.csv / *_hrr.csv jeszcze nie zapisane przez FDS)"
    return 0
  fi
  log "podglad: wysylam DEVC=\${#devc}B HRR=\${#hrr}B (plik devc=\${devc_file:-brak}, hrr=\${hrr_file:-brak})"
  # Body przez stdin (printf to builtin) — omija limit ARG_MAX na argument curl
  printf '{"status":"running","devcCsv":"%s","hrrCsv":"%s"}' "$devc" "$hrr" | \\
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
apt-get install -y openmpi-bin libopenmpi-dev wget curl expect 2>/dev/null
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
