#!/usr/bin/env bash
# Measure Pigeon cold-ish launch: process start → first window visible.
# macOS only. Needs Accessibility for Terminal/iTerm (System Settings → Privacy).
#
# Usage:
#   ./scripts/bench-startup.sh              # 25 runs, auto-find .app
#   ./scripts/bench-startup.sh --runs 25
#   ./scripts/bench-startup.sh --app /Applications/Pigeon.app
#   ./scripts/bench-startup.sh --warmup 2    # discard first N (OS cache warm-up)
#
# Prefer a release build for marketing numbers:
#   pnpm tauri build
#   ./scripts/bench-startup.sh --app apps/desktop/src-tauri/target/release/bundle/macos/Pigeon.app

set -euo pipefail

RUNS=25
WARMUP=1
APP=""
TIMEOUT_S=30
GAP_S=0.8

usage() {
  cat <<'EOF'
Measure Pigeon launch: process start → first window (macOS).

  ./scripts/bench-startup.sh
  ./scripts/bench-startup.sh --runs 25
  ./scripts/bench-startup.sh --app /Applications/Pigeon.app
  ./scripts/bench-startup.sh --warmup 2

Needs Accessibility for Terminal/iTerm.
Prefer release build: pnpm tauri build
EOF
  exit "${1:-0}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --runs) RUNS="$2"; shift 2 ;;
    --warmup) WARMUP="$2"; shift 2 ;;
    --app) APP="$2"; shift 2 ;;
    --timeout) TIMEOUT_S="$2"; shift 2 ;;
    --gap) GAP_S="$2"; shift 2 ;;
    -h|--help) usage 0 ;;
    *) echo "Unknown arg: $1" >&2; usage 1 ;;
  esac
done

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "macOS only." >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

resolve_app() {
  local candidates=(
    "$APP"
    "$ROOT/apps/desktop/src-tauri/target/release/bundle/macos/Pigeon.app"
    "/Applications/Pigeon.app"
  )
  for c in "${candidates[@]}"; do
    [[ -n "$c" && -d "$c" ]] && { echo "$c"; return 0; }
  done
  return 1
}

APP="$(resolve_app)" || {
  echo "Pigeon.app not found. Build first: pnpm tauri build" >&2
  echo "Or pass: --app /path/to/Pigeon.app" >&2
  exit 1
}

PROC="Pigeon"
echo "App:     $APP"
echo "Runs:    $RUNS (warmup discard: $WARMUP)"
echo "Ready:   first window of process \"$PROC\""
echo

quit_app() {
  osascript -e "tell application \"$PROC\" to quit" >/dev/null 2>&1 || true
  # Force if still around after a moment
  local i=0
  while pgrep -xq "$PROC" && (( i < 50 )); do
    sleep 0.1
    ((i++)) || true
  done
  if pgrep -xq "$PROC"; then
    pkill -x "$PROC" >/dev/null 2>&1 || true
    sleep 0.3
  fi
}

# Returns elapsed seconds (float) until ≥1 window, or fails.
one_run() {
  python3 - "$APP" "$PROC" "$TIMEOUT_S" <<'PY'
import subprocess, sys, time

app, proc, timeout_s = sys.argv[1], sys.argv[2], float(sys.argv[3])

def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)

def window_count():
    r = run([
        "osascript", "-e",
        f'tell application "System Events" to count (windows of process "{proc}")'
    ])
    if r.returncode != 0:
        return -1
    try:
        return int(r.stdout.strip() or "0")
    except ValueError:
        return -1

# Launch
t0 = time.perf_counter()
open_r = run(["open", "-n", "-a", app])
if open_r.returncode != 0:
    print(f"open failed: {open_r.stderr.strip()}", file=sys.stderr)
    sys.exit(2)

deadline = t0 + timeout_s
saw_process = False
while time.perf_counter() < deadline:
    if not saw_process:
        if run(["pgrep", "-xq", proc]).returncode == 0:
            saw_process = True
    n = window_count()
    if n > 0:
        elapsed = time.perf_counter() - t0
        print(f"{elapsed:.4f}")
        sys.exit(0)
    time.sleep(0.02)

reason = "timeout waiting for window"
if not saw_process:
    reason = "process never started"
elif window_count() < 0:
    reason = (
        "System Events cannot see windows — grant Accessibility to "
        "Terminal/iTerm (System Settings → Privacy & Security → Accessibility)"
    )
print(reason, file=sys.stderr)
sys.exit(1)
PY
}

quit_app
sleep "$GAP_S"

TIMES=()
FAIL=0
TOTAL=$((RUNS + WARMUP))

for ((i = 1; i <= TOTAL; i++)); do
  label="$i/$TOTAL"
  if (( i <= WARMUP )); then
    label="warmup $i/$WARMUP"
  fi
  printf "  %-14s " "$label"
  if ms="$(one_run)"; then
    printf "%.0f ms\n" "$(python3 -c "print(float('$ms')*1000)")"
    if (( i > WARMUP )); then
      TIMES+=("$ms")
    fi
  else
    echo "FAIL"
    FAIL=$((FAIL + 1))
  fi
  quit_app
  sleep "$GAP_S"
done

echo
if (( ${#TIMES[@]} == 0 )); then
  echo "No successful runs." >&2
  exit 1
fi

python3 - "${TIMES[@]}" <<'PY'
import sys
xs = sorted(float(x) for x in sys.argv[1:])
n = len(xs)

def pct(p):
    if n == 1:
        return xs[0]
    k = (n - 1) * (p / 100.0)
    f = int(k)
    c = min(f + 1, n - 1)
    return xs[f] + (xs[c] - xs[f]) * (k - f)

mean = sum(xs) / n
print(f"n={n}  (seconds)")
print(f"  min     {xs[0]*1000:7.0f} ms   ({xs[0]:.3f}s)")
print(f"  median  {pct(50)*1000:7.0f} ms   ({pct(50):.3f}s)")
print(f"  p95     {pct(95)*1000:7.0f} ms   ({pct(95):.3f}s)")
print(f"  max     {xs[-1]*1000:7.0f} ms   ({xs[-1]:.3f}s)")
print(f"  mean    {mean*1000:7.0f} ms   ({mean:.3f}s)")
print()
print("Marketing tip: quote median (or p95), round honestly — e.g. ~0.4s not 0.2s if median is 380ms.")
PY

if (( FAIL > 0 )); then
  echo "Failed runs: $FAIL" >&2
  exit 1
fi
