#!/usr/bin/env bash
set -euo pipefail
umask 022
VERSION="0.11.1"
VISION_SHA256="0d28804e08194680ebc149d5b8caadcde46ceb2b8f5366ac7240f1999791c42a"
SPEECH_SHA256="ac5f4cb76405a26ec3b9f09b82fd7143f3306dfc0f6db9077f9b5e744e9314a7"
OCR_SHA256="881e4a795e30a524176a14f7ea5e9a7e942e4b53d38e66e10c7fd55267f897bc"
TTS_SHA256="6567eb8cf701d468016895e93cd44d4cd8831e2b03c9b3266d6272c319527065"
LLM_SHA256="d22acd8c728ffd5b84d9bc9d7e76f4892648e6fa057e8fb78a238dab4602d2ed"
TAG="v0.11.1-repository-migration"
HELPER_SHA256="c2658e980535b9bdf0c37970bb08e8c302b33a47c28b7ef83891d67af3949999"
MANIFEST_SHA256="b841f160115bcb54b260ab858f7456dfb87819f39a6c1be206818b252bba765e"
VERSION_STATUS_SHA256="a306cb1bc2ccd2e6b42b4c420502922de6f793c015a736184e4752016079a09b"
BASE="https://raw.githubusercontent.com/codynick/platform-rpi/${TAG}"
TARGET_VERSION="${CODYNICK_TARGET_VERSION:-$VERSION}"
TARGET_TAG="${CODYNICK_TARGET_TAG:-$TAG}"
TARGET_MANIFEST_SHA256="b841f160115bcb54b260ab858f7456dfb87819f39a6c1be206818b252bba765e"
TARGET_BASE="https://raw.githubusercontent.com/codynick/platform-rpi/${TARGET_TAG}"
[[ "$TARGET_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ && "$TARGET_TAG" =~ ^v[0-9A-Za-z.-]+$ && "$TARGET_MANIFEST_SHA256" =~ ^[0-9a-f]{64}$ ]] || { echo 'Invalid target release selector'; exit 1; }
echo "CodyNick core bootstrap ${VERSION} (local AI conversation and 5 GHz network)"
if [[ $EUID -ne 0 ]]; then
    echo "Run with sudo bash /tmp/codynick-apps.sh" >&2
    exit 1
fi
exec 9>/run/lock/codynick-app-bootstrap.lock
flock -n 9 || { echo "Another bootstrap is running." >&2; exit 1; }
if systemctl is-active --quiet codynick-install.service; then
    echo "Installation is already running. Follow it with: codynick-install-log --follow"
    exit 0
fi
install -d -m 0755 /var/log/codynick
LOG=/var/log/codynick/install.log
if [[ -s "$LOG" ]]; then
    stamp=$(date -u +%Y%m%dT%H%M%SZ)
    mv "$LOG" "/var/log/codynick/install-${stamp}.log"
fi
touch "$LOG"
chmod 0644 "$LOG"
{ ls -1t /var/log/codynick/install-*.log 2>/dev/null || true; } | tail -n +6 | xargs -r rm --
cat > /usr/local/bin/codynick-install-status <<'EOF'
#!/usr/bin/env bash
set -u
if systemctl is-active --quiet codynick-install.service; then
    echo "Installer: running"
    systemctl show codynick-install.service --property=MainPID,ActiveEnterTimestamp --no-pager
else
    echo "Installer: not running"
fi
python3 - <<'PY'
import json
from pathlib import Path
p=Path('/var/lib/codynick/application-state.json')
if not p.exists():
    print('State: not created yet')
else:
    d=json.loads(p.read_text())
    for key in ('version','stage','operation','updated_at','completed_version','reboot_required','error'):
        if key in d: print(f'{key.replace("_"," ").title()}: {d[key]}')
PY
EOF
chmod 0755 /usr/local/bin/codynick-install-status
cat > /usr/local/bin/codynick-install-log <<'EOF'
#!/usr/bin/env bash
set -u
log=/var/log/codynick/install.log
if [[ ${1:-} == --follow ]]; then
    touch "$log"
    tail -n +1 -F "$log" & tail_pid=$!
    trap 'kill "$tail_pid" 2>/dev/null || true' EXIT INT TERM
    while systemctl is-active --quiet codynick-install.service; do sleep 2; done
    kill "$tail_pid" 2>/dev/null || true
    wait "$tail_pid" 2>/dev/null || true
    echo
    exec codynick-install-status
fi
exec cat "$log"
EOF
chmod 0755 /usr/local/bin/codynick-install-log
# Lock the worker separately so a failed unit cannot race a manually started worker.
exec 8>/run/lock/codynick-app.lock
flock -n 8 || { echo "An application installer is already running." >&2; exit 1; }
temp=$(mktemp -d)
trap 'rm -rf -- "$temp"' EXIT
wget -4 --timeout=60 --tries=3 -O "$temp/app_setup.py" "$BASE/installer/app_setup.py"
wget -4 --timeout=60 --tries=3 -O "$temp/core-manifest.json" "$TARGET_BASE/releases/core-${TARGET_VERSION}.json"
wget -4 --timeout=60 --tries=3 -O "$temp/version_status.py" "$BASE/installer/version_status.py"
wget -4 --timeout=60 --tries=3 -O "$temp/vision_setup.py" "$BASE/installer/vision_setup.py"
wget -4 --timeout=60 --tries=3 -O "$temp/speech_setup.py" "$BASE/installer/speech_setup.py"
wget -4 --timeout=60 --tries=3 -O "$temp/ocr_setup.py" "$BASE/installer/ocr_setup.py"
wget -4 --timeout=60 --tries=3 -O "$temp/tts_setup.py" "$BASE/installer/tts_setup.py"
wget -4 --timeout=60 --tries=3 -O "$temp/llm_setup.py" "$BASE/installer/llm_setup.py"
printf '%s  %s\n' "$VISION_SHA256" "$temp/vision_setup.py" | sha256sum -c -
printf '%s  %s\n' "$SPEECH_SHA256" "$temp/speech_setup.py" | sha256sum -c -
printf '%s  %s\n' "$OCR_SHA256" "$temp/ocr_setup.py" | sha256sum -c -
printf '%s  %s\n' "$TTS_SHA256" "$temp/tts_setup.py" | sha256sum -c -
printf '%s  %s\n' "$LLM_SHA256" "$temp/llm_setup.py" | sha256sum -c -
printf '%s  %s\n' "$HELPER_SHA256" "$temp/app_setup.py" "$TARGET_MANIFEST_SHA256" "$temp/core-manifest.json" "$VERSION_STATUS_SHA256" "$temp/version_status.py" | sha256sum -c -
python3 - "$temp/core-manifest.json" "$TARGET_VERSION" "$TARGET_TAG" <<'PY'
import json, pathlib, platform, sys
os_info = platform.freedesktop_os_release()
if os_info.get('ID') != 'ubuntu' or os_info.get('VERSION_ID') != '26.04' or platform.machine() != 'aarch64':
    raise SystemExit('Requires Ubuntu 26.04 ARM64')
state = pathlib.Path('/var/lib/codynick/network-setup.json')
if not state.exists() or json.loads(state.read_text()).get('stage') != 'network-ready':
    raise SystemExit('Complete and confirm network setup first')
manifest = json.loads(pathlib.Path(sys.argv[1]).read_text())
if manifest.get('version') != sys.argv[2] or manifest.get('tag') != sys.argv[3]:
    raise SystemExit('Incorrect release manifest')
PY
install -d -m 0755 /usr/local/lib/codynick/core-0.11.1
install -m 0644 "$temp/app_setup.py" /usr/local/lib/codynick/core-0.11.1/app_setup.py
install -m 0644 "$temp/core-manifest.json" /usr/local/lib/codynick/core-0.11.1/core-manifest.json
install -m 0644 "$temp/version_status.py" /usr/local/lib/codynick/core-0.11.1/version_status.py
install -m 0644 "$temp/vision_setup.py" /usr/local/lib/codynick/core-0.11.1/vision_setup.py
install -m 0644 "$temp/speech_setup.py" /usr/local/lib/codynick/core-0.11.1/speech_setup.py
install -m 0644 "$temp/ocr_setup.py" /usr/local/lib/codynick/core-0.11.1/ocr_setup.py
install -m 0644 "$temp/tts_setup.py" /usr/local/lib/codynick/core-0.11.1/tts_setup.py
install -m 0644 "$temp/llm_setup.py" /usr/local/lib/codynick/core-0.11.1/llm_setup.py
systemctl reset-failed codynick-install.service 2>/dev/null || true
# A transient unit survives SSH disconnection, but intentionally does not survive reboot.
flock -u 8
systemd-run --unit=codynick-install --collect --property=Type=exec \
    --property=StandardOutput=append:${LOG} --property=StandardError=append:${LOG} \
    /usr/bin/python3 -u /usr/local/lib/codynick/core-0.11.1/app_setup.py --worker
echo
echo 'Installation is running in the background. Do not reboot until it finishes.'
echo 'Follow progress: codynick-install-log --follow'
echo 'Check status: codynick-install-status'
echo "Success ends with: CodyNick ${TARGET_VERSION}: READY"
echo 'After success, open http://10.42.0.1/code/'
