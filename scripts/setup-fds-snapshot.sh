#!/bin/bash
# Jednorazowy skrypt konfigurujący serwer Hetzner ze środowiskiem FDS.
# Uruchom na świeżym Ubuntu 22.04 (CX22), potem wyłącz serwer i utwórz snapshot.
#
# Użycie:
#   ssh root@<IP_SERWERA>
#   curl -fsSL https://raw.githubusercontent.com/.../setup-fds-snapshot.sh | bash
#   # lub po wgraniu przez scp:
#   bash setup-fds-snapshot.sh
#
# Po zakończeniu (ok. 15 min):
#   1. W Hetzner Dashboard → Servers → wyłącz serwer (Shutdown)
#   2. Servers → Images → Create Image
#   3. Skopiuj ID snapshotu → wklej do .env.local jako HETZNER_SNAPSHOT_ID
#   4. Usuń serwer tymczasowy

set -euo pipefail
exec > >(tee /var/log/fds-setup.log) 2>&1

FDS_VERSION="6.10.1"
FDS_URL="https://github.com/firemodels/fds/releases/download/FDS-${FDS_VERSION}/FDS-${FDS_VERSION}_SMV-${FDS_VERSION}_lnx.sh"
INSTALL_DIR="/opt/fds6"

echo "=== FDS Snapshot Setup ==="
echo "FDS version: $FDS_VERSION"
echo "Install dir: $INSTALL_DIR"
date

# Pakiety systemowe
echo "--- Instalacja zależności..."
apt-get update -qq
apt-get install -y --no-install-recommends \
  openmpi-bin \
  libopenmpi-dev \
  wget \
  curl \
  expect \
  ca-certificates \
  2>/dev/null
echo "OK: pakiety zainstalowane"

# Pobierz instalator FDS
echo "--- Pobieranie instalatora FDS ${FDS_VERSION}..."
wget -q --show-progress "$FDS_URL" -O /tmp/fds_installer.sh
chmod +x /tmp/fds_installer.sh
echo "OK: pobrano $(wc -c < /tmp/fds_installer.sh) bajtów"

# Wypakuj FDS (instalator to self-extracting makeself)
mkdir -p "$INSTALL_DIR"
echo "--- Ekstrakcja FDS do $INSTALL_DIR..."

if bash /tmp/fds_installer.sh --noexec --target "$INSTALL_DIR" 2>/dev/null; then
  echo "OK: wypakowano przez --noexec"
else
  echo "INFO: --noexec niedostępne, próba przez expect..."
  expect -c "
    set timeout 600
    spawn bash /tmp/fds_installer.sh
    expect -re {press ENTER|ENTER to} { send \"\r\" }
    expect -re {\(q\)|press q}        { send \"q\r\" }
    expect -re {yes/no|accept}        { send \"yes\r\" }
    expect -re {directory|path}       { send \"${INSTALL_DIR}\r\" }
    expect eof
  "
fi

# Znajdź binarną FDS
FDS_BIN=$(find "$INSTALL_DIR" -name "fds_linux*" -perm /111 -type f 2>/dev/null | head -1)
if [ -z "$FDS_BIN" ]; then
  echo "ERROR: Nie znaleziono binarki FDS w $INSTALL_DIR"
  exit 1
fi
echo "OK: FDS binary: $FDS_BIN"

# Weryfikacja — uruchom FDS --version
"$FDS_BIN" --version 2>&1 | head -3 || true

# Cleanup
rm -f /tmp/fds_installer.sh
apt-get clean
rm -rf /var/lib/apt/lists/*

echo ""
echo "=== Gotowe! ==="
echo ""
echo "Następne kroki:"
echo "  1. Wyloguj się z serwera"
echo "  2. W Hetzner Dashboard: wyłącz serwer (Actions → Shutdown)"
echo "  3. Servers → Images → Create Image (wpisz nazwę np. 'fds-6.10.1')"
echo "  4. Skopiuj ID snapshotu"
echo "  5. Wklej do .env.local: HETZNER_SNAPSHOT_ID=<ID>"
echo "  6. Na Vercel: Settings → Environment Variables → dodaj HETZNER_SNAPSHOT_ID"
echo "  7. Usuń tymczasowy serwer"
