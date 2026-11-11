#!/usr/bin/env bash
# Stable public entry point. Every published update pins immutable stage scripts.
set -euo pipefail
umask 022
VERSION="0.15.1"
TARGET_VERSION="0.14.1"
TARGET_TAG="v0.14.1-second-demo-guide"
TARGET_MANIFEST_SHA256="bf72968bdc47766a34a473326944bd657aacce1d9ac43fa61c0a643e8bee5c85"
NETWORK_SHA256="753368bee1c4c3c1c747bc64792f377de8d595bed590a88dc1ca54ff6398ed81"
APPS_SHA256="0e2cf5a724c57e4ebb03bfa2231a70a9f3c0be986e8645edbcbb582115d74576"
[[ $EUID -eq 0 ]] || { echo 'Run this setup command using sudo.'; exit 1; }
echo "CodyNick setup ${TARGET_VERSION}: install / repair / upgrade / downgrade"
exec 7>/run/lock/codynick-setup-entry.lock
flock -n 7 || { echo 'Another setup command is running.'; exit 1; }
temp=$(mktemp -d)
trap 'rm -rf -- "$temp"' EXIT
fetch() {
    wget -4 --timeout=60 --tries=3 -O "$temp/$1" "$2"
    printf '%s  %s\n' "$3" "$temp/$1" | sha256sum -c -
}
stage() {
    python3 - <<'PY'
import json,pathlib
p=pathlib.Path('/var/lib/codynick/network-setup.json')
print(json.loads(p.read_text()).get('stage','') if p.exists() else '')
PY
}
fetch network.sh https://raw.githubusercontent.com/codynick/platform-rpi/v0.15.1-advanced-python/bootstrap/codynick-setup.sh "$NETWORK_SHA256"
state=$(stage)
initial_state=$state
if [[ "$state" != network-ready ]]; then
    bash "$temp/network.sh"
    state=$(stage)
    if [[ "$state" == pending || "$state" == applying ]]; then
        if [[ "$initial_state" == pending || "$initial_state" == applying ]]; then
            /usr/local/sbin/codynick-setup --confirm
        else
            echo 'Join the displayed Pi hotspot and reconnect to SSH at 10.42.0.1.'
            echo 'Run this SAME setup command there within 15 minutes to confirm and continue.'
            exit 0
        fi
    fi
    [[ $(stage) == network-ready ]] || { echo 'Network stage is incomplete. Rerun this same setup command after resolving the reported problem.'; exit 1; }
else
    bash "$temp/network.sh" --upgrade
fi
# Do not restart a working hotspot. Recover stopped existing units without rewriting settings.
for service in ssh codynick-ap codynick-dhcp codynick-nat; do
    if ! systemctl is-active --quiet "$service"; then
        systemctl start "$service" || { echo "Network service $service needs recovery; application installation was not started."; exit 1; }
    fi
done
fetch apps.sh https://raw.githubusercontent.com/codynick/platform-rpi/v0.15.1-advanced-python/bootstrap/codynick-apps.sh "$APPS_SHA256"
CODYNICK_TARGET_VERSION="$TARGET_VERSION" CODYNICK_TARGET_TAG="$TARGET_TAG" \
    CODYNICK_TARGET_MANIFEST_SHA256="$TARGET_MANIFEST_SHA256" bash "$temp/apps.sh"
echo 'Progress follows from the persistent CodyNick log. Ctrl+C closes this display only.'
flock -u 7
exec 7>&-
exec /usr/local/bin/codynick-install-log --follow
