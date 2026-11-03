#!/usr/bin/env bash
# Stable public entry point. Every published update pins immutable stage scripts.
set -euo pipefail
umask 022
VERSION="0.12.0"
TARGET_VERSION="0.12.0"
TARGET_TAG="v0.12.0-dashboard-tools"
TARGET_MANIFEST_SHA256="c106bc78b85fa52c7f8a92f7cc88e144558bbeb782e9bb835cb9d459946ae395"
NETWORK_SHA256="f702fc8eeb6c17c32f5db2adbfc8e95055bac9cbb7bb808c9f99218612edca3f"
APPS_SHA256="bac4a8402152581f3cc32ff99143f768ee6523674042c0b05163ce739a576763"
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
fetch network.sh https://raw.githubusercontent.com/codynick/platform-rpi/v0.12.0-dashboard-tools/bootstrap/codynick-setup.sh "$NETWORK_SHA256"
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
fetch apps.sh https://raw.githubusercontent.com/codynick/platform-rpi/v0.12.0-dashboard-tools/bootstrap/codynick-apps.sh "$APPS_SHA256"
CODYNICK_TARGET_VERSION="$TARGET_VERSION" CODYNICK_TARGET_TAG="$TARGET_TAG" \
    CODYNICK_TARGET_MANIFEST_SHA256="$TARGET_MANIFEST_SHA256" bash "$temp/apps.sh"
echo 'Progress follows from the persistent CodyNick log. Ctrl+C closes this display only.'
flock -u 7
exec 7>&-
exec /usr/local/bin/codynick-install-log --follow
