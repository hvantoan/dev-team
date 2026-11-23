#!/usr/bin/env bash
# Quản lý stack local ChatbotX (host dev qua scripts/dev-up.sh) với lock sở hữu.
# Docker stack của owner (builder/caddy/worker/realtime) KHÔNG bị wrapper này
# start/stop/kill — chỉ đọc trạng thái. Port cố định, không đổi khi bận.
#
# Usage:
#   ./scripts/stack-chatbotx.sh up <bot> <KEY>
#   ./scripts/stack-chatbotx.sh down
#   ./scripts/stack-chatbotx.sh status
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REGISTRY="$ROOT/projects/chatbotx.json"

for cmd in jq docker ss; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "missing required command: $cmd" >&2; exit 1; }
done
[[ -f "$REGISTRY" ]] || { echo "registry not found: $REGISTRY" >&2; exit 1; }

REPO="$(jq -r '.repos[] | select(.role=="monorepo") | .path' "$REGISTRY")"
[[ -n "$REPO" && -d "$REPO" ]] || { echo "monorepo path missing in $REGISTRY" >&2; exit 1; }
COMPOSE_PROJECT="$(jq -r '.project' "$REGISTRY")"
BUILDER_PORT="$(jq -r '.stack.ports.builder // 3123' "$REGISTRY")"
PG_PORT="$(jq -r '.stack.ports.postgres // 25432' "$REGISTRY")"
REDIS_PORT="$(jq -r '.stack.ports.redis // 26379' "$REGISTRY")"
MAILHOG_PORT="$(jq -r '.stack.ports.mailhog // 8025' "$REGISTRY")"
FS_PORT="$(jq -r '.stack.ports.filesystem // 29000' "$REGISTRY")"
PORTS=("$BUILDER_PORT" "$PG_PORT" "$REDIS_PORT" "$MAILHOG_PORT" "$FS_PORT")

STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/chatbotx-stack"
LOCK_FILE="$STATE_DIR/lock.json"
DEV_PIDFILE="/tmp/chatbotx-dev.pid"
DEV_LOG="/tmp/chatbotx-dev.log"
mkdir -p "$STATE_DIR"

pid_alive() {
  local pid="${1:-}"
  [[ -n "$pid" && "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null
}

lock_pid() { jq -r '.pid // empty' "$LOCK_FILE" 2>/dev/null || true; }

lock_is_alive() {
  [[ -f "$LOCK_FILE" ]] || return 1
  pid_alive "$(lock_pid)"
}

format_lock_holder() {
  jq -r '"busy by \(.bot // "unknown") (key=\(.key // "?"), mode=\(.mode // "?"), pid=\(.pid // "-"), started_at=\(.started_at // "?"))"' "$LOCK_FILE" 2>/dev/null \
    || echo "busy (invalid lock.json)"
}

port_listener_info() {
  local port="$1" line
  line="$(ss -ltnp "sport = :$port" 2>/dev/null | awk 'NR>1 && /LISTEN/ {print; exit}' || true)"
  [[ -n "$line" ]] && { echo "$line"; return 0; }
  if command -v lsof >/dev/null 2>&1; then
    line="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | awk 'NR>1 {print; exit}' || true)"
    [[ -n "$line" ]] && { echo "$line"; return 0; }
  fi
  return 1
}

# Container đang chạy của docker compose project chatbotx (chỉ đọc).
docker_stack_running() {
  [[ -n "$(docker ps -q --filter "label=com.docker.compose.project=$COMPOSE_PROJECT" 2>/dev/null)" ]]
}

kill_tree() {
  local pid="${1:-}"
  pid_alive "$pid" || return 0
  local child
  for child in $(pgrep -P "$pid" 2>/dev/null || true); do kill_tree "$child"; done
  kill -TERM "$pid" 2>/dev/null || true
}

stop_pid_gracefully() {
  local pid="${1:-}" label="${2:-process}" i
  pid_alive "$pid" || return 0
  echo "stopping $label (pid=$pid)…"
  kill_tree "$pid"
  for i in $(seq 1 20); do pid_alive "$pid" || return 0; sleep 0.5; done
  echo "force-killing $label (pid=$pid)…"
  for child in $(pgrep -P "$pid" 2>/dev/null || true); do kill -KILL "$child" 2>/dev/null || true; done
  kill -KILL "$pid" 2>/dev/null || true
}

write_lock() {
  local bot="$1" key="$2" mode="$3" pid="$4" started_at="$5"
  jq -n --arg bot "$bot" --arg key "$key" --arg mode "$mode" \
    --arg pid "$pid" --arg started_at "$started_at" \
    '{bot:$bot, key:$key, mode:$mode, pid:($pid|tonumber?), started_at:$started_at}' \
    >"$LOCK_FILE"
}

cmd_up() {
  local bot="${1:-}" key="${2:-}"
  [[ -n "$bot" && -n "$key" ]] || { echo "usage: stack-chatbotx.sh up <bot> <KEY>" >&2; exit 2; }

  if lock_is_alive; then
    format_lock_holder >&2
    echo "refusing: stack already held; run 'stack-chatbotx.sh down' first" >&2
    exit 1
  fi
  [[ -f "$LOCK_FILE" ]] && rm -f "$LOCK_FILE"   # stale lock (pid chết)

  if docker_stack_running; then
    docker ps --filter "label=com.docker.compose.project=$COMPOSE_PROJECT" \
      --format '  {{.Names}}  {{.Status}}  {{.Ports}}' >&2 || true
    echo "refusing: docker stack '$COMPOSE_PROJECT' đang chạy (owner) — không kill, không chiếm port :$BUILDER_PORT" >&2
    exit 1
  fi

  local port info busy=0
  for port in "${PORTS[@]}"; do
    if info="$(port_listener_info "$port")"; then
      echo "port :$port đang bận: $info" >&2
      busy=1
    fi
  done
  if [[ "$busy" -ne 0 ]]; then
    echo "refusing: không đổi port; giải phóng port bận trước khi up" >&2
    exit 1
  fi

  write_lock "$bot" "$key" "starting" "$$" "$(date -Iseconds)"

  echo "⚠ dev-up.sh sẽ chạy 'db:migrate' lên DB LOCAL ($PG_PORT) — chấp nhận cho local;"
  echo "  migration lên DB dùng chung/staging/prod phải có PO duyệt SQL."
  echo "starting host dev stack (dev-up.sh)…"
  if ! ( cd "$REPO" && ./scripts/dev-up.sh ); then
    echo "dev-up.sh failed — xem $DEV_LOG" >&2
    rm -f "$LOCK_FILE"
    exit 1
  fi

  local pid=""
  if [[ -f "$DEV_PIDFILE" ]]; then
    pid="$(tr -dc '0-9' <"$DEV_PIDFILE")"
  fi
  if ! pid_alive "$pid"; then
    echo "dev-up.sh exited but pidfile $DEV_PIDFILE has no live pid" >&2
    rm -f "$LOCK_FILE"
    exit 1
  fi
  write_lock "$bot" "$key" "dev-up" "$pid" "$(date -Iseconds)"
  echo "stack up: builder http://localhost:$BUILDER_PORT (pid=$pid), lock=$LOCK_FILE"
}

cmd_down() {
  if [[ ! -f "$LOCK_FILE" ]]; then
    echo "không có lock ($LOCK_FILE) — wrapper không giữ stack nào; không đụng docker container."
    return 0
  fi
  local pid
  pid="$(lock_pid)"
  echo "releasing lock: $(format_lock_holder)"

  if pid_alive "$pid"; then
    # Chỉ dọn thứ wrapper đã khởi động: pid trong lock còn sống.
    if [[ -x "$REPO/scripts/dev-up.sh" ]]; then
      ( cd "$REPO" && ./scripts/dev-up.sh --stop ) || echo "dev-up.sh --stop trả mã lỗi; tiếp tục dọn pid trong lock" >&2
    fi
    stop_pid_gracefully "$pid" "dev-up pid"
  else
    echo "lock stale (pid ${pid:-none} không còn sống) — không gọi dev-up.sh --stop, không kill/pkill process nào; chỉ xoá lock."
  fi
  rm -f "$LOCK_FILE"
  echo "wrapper down (lock removed). Docker container KHÔNG bị dừng."
}

cmd_status() {
  echo "== lock =="
  if [[ -f "$LOCK_FILE" ]]; then
    echo "lock: $LOCK_FILE"
    echo "holder: $(format_lock_holder)"
    if lock_is_alive; then
      echo "lock state: ALIVE (pid $(lock_pid))"
    else
      echo "lock state: STALE (pid $(lock_pid || echo none) không còn sống)"
    fi
  else
    echo "lock: none ($LOCK_FILE)"
  fi

  echo
  echo "== host dev (dev-up.sh) =="
  if [[ -f "$DEV_PIDFILE" ]]; then
    local dev_pid
    dev_pid="$(tr -dc '0-9' <"$DEV_PIDFILE")"
    if pid_alive "$dev_pid"; then
      echo "pidfile: $DEV_PIDFILE pid=$dev_pid ALIVE"
    else
      echo "pidfile: $DEV_PIDFILE pid=${dev_pid:-none} DEAD (stale)"
    fi
  else
    echo "pidfile: $DEV_PIDFILE absent"
  fi

  echo
  echo "== docker compose project '$COMPOSE_PROJECT' =="
  ( cd "$REPO" && docker compose -f docker-compose.dev.yml ps \
      --format '{{.Name}}  {{.Service}}  {{.State}}  {{.Ports}}' ) 2>/dev/null \
    || echo "(không đọc được docker compose ps)"

  echo
  echo "== ports =="
  local port
  for port in "${PORTS[@]}"; do
    if info="$(port_listener_info "$port")"; then
      echo ":$port LISTEN  $info"
    else
      echo ":$port free"
    fi
  done
  return 0
}

CMD="${1:-}"
[[ $# -gt 0 ]] && shift
case "$CMD" in
  up) cmd_up "$@" ;;
  down) cmd_down ;;
  status) cmd_status ;;
  *)
    echo "usage: $0 up <bot> <KEY> | down | status" >&2
    exit 2
    ;;
esac
