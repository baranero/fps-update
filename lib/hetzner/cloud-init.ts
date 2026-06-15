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
WORKDIR="/opt/fds_job"

log() { echo "[$(date '+%H:%M:%S')] $1"; }

notify() {
  curl -sfL -X POST "$APP_URL/api/symulacje/$CASE_ID/complete" \\
    -H "Content-Type: application/json" \\
    -H "x-webhook-secret: $WEBHOOK_SECRET" \\
    -d "$1" -o /dev/null || true
}

on_exit() {
  local code=$?
  [ $code -ne 0 ] && notify "{\\\"status\\\":\\\"failed\\\",\\\"exitCode\\\":$code}" || true
}
trap on_exit EXIT

send_log() {
  local msg
  msg=$(tail -20 /var/log/fds-runner.log 2>/dev/null | base64 -w0 || true)
  curl -sfL -X POST "$APP_URL/api/symulacje/$CASE_ID/complete" \\
    -H "Content-Type: application/json" \\
    -H "x-webhook-secret: $WEBHOOK_SECRET" \\
    -d "{\\"status\\":\\"running\\",\\"log\\":\\"$msg\\"}" -o /dev/null || true
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

# Wysyłaj logi co 15s w tle
(while true; do sleep 15; send_log; done) &
LOG_PID=$!

export OMP_NUM_THREADS="$OMP_THREADS"
set +eo pipefail
mpiexec -n "\${NCORES}" "$FDS_BIN" "$FILE_NAME" 2>&1 | tee fds_output.log
FDS_EXIT=\${PIPESTATUS[0]}
set -eo pipefail

kill $LOG_PID 2>/dev/null || true
log "FDS finished (exit: $FDS_EXIT)"

# ── Upload wyników ────────────────────────────────────────────────────────────
log "Uploading results..."
RESULTS_PREFIX="results/$CASE_ID"

upload_file() {
  local f="$1"
  [ -f "$f" ] || return 0
  log "  → $(basename "$f")"
  curl -sf -X PUT \\
    -H "Authorization: Bearer $SUPABASE_KEY" \\
    -H "Content-Type: application/octet-stream" \\
    "$SUPABASE_URL/storage/v1/object/fds-files/$RESULTS_PREFIX/$(basename "$f")" \\
    --data-binary "@$f" > /dev/null || \\
  curl -sf -X POST \\
    -H "Authorization: Bearer $SUPABASE_KEY" \\
    -H "Content-Type: application/octet-stream" \\
    "$SUPABASE_URL/storage/v1/object/fds-files/$RESULTS_PREFIX/$(basename "$f")" \\
    --data-binary "@$f" > /dev/null || true
}

for f in *.csv *.smv *.s3d *.q *.sf *.bf *.prt5 fds_output.log; do
  upload_file "$f"
done

# ── Powiadomienie ─────────────────────────────────────────────────────────────
STATUS="done"
[ "$FDS_EXIT" -ne 0 ] && STATUS="failed"
notify "{\\\"status\\\":\\\"$STATUS\\\",\\\"exitCode\\\":$FDS_EXIT}"
log "=== Job $STATUS ==="

# ── Self-delete ───────────────────────────────────────────────────────────────
INSTANCE_ID=$(curl -sf http://169.254.169.254/hetzner/v1/metadata/instance-id || echo "")
[ -n "$INSTANCE_ID" ] && curl -sf -X DELETE \\
  "https://api.hetzner.cloud/v1/servers/$INSTANCE_ID" \\
  -H "Authorization: Bearer $HETZNER_TOKEN" > /dev/null || true
`;
}
