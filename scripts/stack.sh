#!/usr/bin/env bash
# Manage the single local TMS stack (Postgres + Redis + BE + FE) with lock ownership.
# Usage:
#   ./scripts/stack.sh [proj] up <bot> <KEY> <commit|worktree> [--dev] [--fe <ref|dir>] [--be <ref|dir>]
#   ./scripts/stack.sh [proj] down
#   ./scripts/stack.sh [proj] status
#   ./scripts/stack.sh [proj] reset-db
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

PROJ="tms"
if [[ $# -gt 0 && -f "$ROOT/projects/$1.json" ]]; then
  PROJ="$1"
  shift
fi

CMD="${1:-}"
if [[ -z "$CMD" ]]; then
  cat >&2 <<'USAGE'
usage:
  stack.sh [proj] up <bot> <KEY> <commit|worktree> [--dev] [--fe <ref|dir>] [--be <ref|dir>]
  stack.sh [proj] down
  stack.sh [proj] status
  stack.sh [proj] reset-db
USAGE
  exit 2
fi
shift

REGISTRY="$ROOT/projects/$PROJ.json"
if [[ ! -f "$REGISTRY" ]]; then
  echo "missing registry: $REGISTRY" >&2
  exit 2
fi

for cmd in jq docker psql migrate curl python3 ss; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "missing required tool: $cmd" >&2
    exit 2
  fi
done

FE_MAIN_DIR="$(jq -r '.repos[] | select(.role=="fe-web") | .path' "$REGISTRY")"
FE_BASE="$(jq -r '.repos[] | select(.role=="fe-web") | (.base // "dev")' "$REGISTRY")"
BE_MAIN_DIR="$(jq -r '.repos[] | select(.role=="be") | .path' "$REGISTRY")"
BE_BASE="$(jq -r '.repos[] | select(.role=="be") | (.base // "main")' "$REGISTRY")"
TEST_REL_DIR="$(jq -r '.repos[] | select(.role=="test") | .path' "$REGISTRY")"
TEST_DIR="$ROOT/$TEST_REL_DIR"

FE_PORT="$(jq -r '.stack.ports.fe // 4700' "$REGISTRY")"
BE_PORT="$(jq -r '.stack.ports.be // 50051' "$REGISTRY")"
BE_HTTP_PORT="$(jq -r '.stack.ports.be_http // 8081' "$REGISTRY")"
PG_PORT="$(jq -r '.stack.ports.postgres // 5436' "$REGISTRY")"
REDIS_PORT_CFG="$(jq -r '.stack.ports.redis // 6380' "$REGISTRY")"

STATE_BASE="${XDG_STATE_HOME:-$HOME/.local/state}"
STATE_DIR="$STATE_BASE/${PROJ}-stack"
LOCK_FILE="$STATE_DIR/lock.json"
LOG_DIR="$STATE_DIR/logs"
WT_DIR="$STATE_DIR/worktrees"
BIN_DIR="$STATE_DIR/bin"
mkdir -p "$STATE_DIR" "$LOG_DIR" "$WT_DIR" "$BIN_DIR"

pid_alive() {
  local pid="${1:-}"
  [[ -n "$pid" && "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null
}

lock_is_alive() {
  [[ -f "$LOCK_FILE" ]] || return 1
  local fe_pid be_pid
  fe_pid="$(jq -r '.fe_pid // empty' "$LOCK_FILE" 2>/dev/null || true)"
  be_pid="$(jq -r '.be_pid // empty' "$LOCK_FILE" 2>/dev/null || true)"
  pid_alive "$fe_pid" || pid_alive "$be_pid"
}

format_lock_holder() {
  jq -r '"busy by \(.bot // "unknown") (key=\(.key // "?"), mode=\(.mode // "?"), fe_pid=\(.fe_pid // "-"), be_pid=\(.be_pid // "-"), started_at=\(.started_at // "?"))"' "$LOCK_FILE" 2>/dev/null || echo "busy (invalid lock.json)"
}

port_listener_info() {
  local port="$1"
  local line
  line="$(ss -ltnp "sport = :$port" 2>/dev/null | awk 'NR>1 && /LISTEN/ {print; exit}' || true)"
  if [[ -n "$line" ]]; then
    echo "$line"
    return 0
  fi
  if command -v lsof >/dev/null 2>&1; then
    line="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | awk 'NR>1 {print; exit}' || true)"
    if [[ -n "$line" ]]; then
      echo "$line"
      return 0
    fi
  fi
  return 1
}

ensure_ports_free() {
  local port info busy=0
  for port in "$FE_PORT" "$BE_PORT" "$BE_HTTP_PORT"; do
    if info="$(port_listener_info "$port")"; then
      echo "port :$port is already occupied (no active stack lock): $info" >&2
      busy=1
    fi
  done
  if [[ "$busy" -ne 0 ]]; then
    echo "refusing to start on alternate ports; free the occupied port(s) first" >&2
    exit 1
  fi
}

kill_tree() {
  local pid="${1:-}"
  pid_alive "$pid" || return 0
  local children child
  children="$(pgrep -P "$pid" 2>/dev/null || true)"
  for child in $children; do
    kill_tree "$child"
  done
  kill -TERM "$pid" 2>/dev/null || true
}

stop_pid_gracefully() {
  local pid="${1:-}" label="${2:-process}"
  pid_alive "$pid" || return 0
  echo "stopping $label (pid=$pid)..."
  kill_tree "$pid"
  local i
  for i in $(seq 1 20); do
    if ! pid_alive "$pid"; then
      return 0
    fi
    sleep 0.5
  done
  echo "force-killing $label (pid=$pid)..."
  local children child
  children="$(pgrep -P "$pid" 2>/dev/null || true)"
  for child in $children; do
    kill -KILL "$child" 2>/dev/null || true
  done
  kill -KILL "$pid" 2>/dev/null || true
}

load_be_env() {
  local env_file="$BE_MAIN_DIR/.env"
  if [[ ! -f "$env_file" ]]; then
    echo "missing $env_file (copy from $BE_MAIN_DIR/.env.example)" >&2
    exit 1
  fi
  set -a
  # shellcheck disable=SC1090
  source "$env_file"
  set +a

  POSTGRES_USER="${POSTGRES_USER:-fms_staging}"
  POSTGRES_DB="${POSTGRES_DB:-tms_staging}"
  POSTGRES_PORT="$PG_PORT"
  REDIS_PORT="$REDIS_PORT_CFG"
  REDIS_DB="${REDIS_DB:-1}"

  if [[ -z "${POSTGRES_PASSWORD:-}" || -z "${REDIS_PASSWORD:-}" ]]; then
    echo "POSTGRES_PASSWORD and REDIS_PASSWORD must be set in $env_file" >&2
    exit 1
  fi

  export POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB POSTGRES_PORT REDIS_PASSWORD REDIS_PORT REDIS_DB
  export APP_DATABASE_POSTGRES_DNS="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}?sslmode=disable"
  export APP_REDIS_ADDR="localhost:${REDIS_PORT}"
  export APP_REDIS_PASSWORD="${REDIS_PASSWORD}"
  export APP_REDIS_DB="${REDIS_DB}"
  export SENTRY_ENVIRONMENT="${SENTRY_ENVIRONMENT:-development}"
}

start_infra() {
  load_be_env
  docker compose -f "$BE_MAIN_DIR/docker-compose.yml" up -d --wait postgres redis
}

hash_tms_password() {
  local plain="$1"
  TMS_PLAIN_PW="$plain" python3 - <<'PY'
import base64, hashlib, os
pw = os.environ["TMS_PLAIN_PW"].encode("utf-8")
salt = os.urandom(32)
dk = hashlib.pbkdf2_hmac("sha256", pw, salt, 10000, 32)
print(base64.b64encode(salt + dk).decode("ascii"))
PY
}

seed_db() {
  local seed_dir="$TEST_DIR/seed"
  if [[ ! -d "$seed_dir" ]] || ! compgen -G "$seed_dir/*.sql" >/dev/null; then
    echo "no seed sql found in $seed_dir; skipping seed"
    return 0
  fi

  local test_env="$TEST_DIR/.env"
  if [[ ! -f "$test_env" ]]; then
    echo "missing $test_env (copy from $TEST_DIR/.env.example) — needed for seed credentials" >&2
    exit 1
  fi

  set -a
  # shellcheck disable=SC1090
  source "$test_env"
  set +a

  if [[ -z "${APP_USERNAME:-}" || -z "${APP_PASSWORD:-}" ]]; then
    echo "APP_USERNAME and APP_PASSWORD must be set in $test_env" >&2
    exit 1
  fi

  local tenant="${APP_TENANT:-tuanvudev}"
  local admin_hash viewer_user viewer_pw viewer_hash
  admin_hash="$(hash_tms_password "$APP_PASSWORD")"
  viewer_user="${APP_QA_VIEWER_USERNAME:-qa_viewer}"
  viewer_pw="${APP_QA_VIEWER_PASSWORD:-$APP_PASSWORD}"
  viewer_hash="$(hash_tms_password "$viewer_pw")"

  local sql_file
  for sql_file in "$seed_dir"/*.sql; do
    echo "seeding $(basename "$sql_file") for tenant=$tenant..."
    psql "$APP_DATABASE_POSTGRES_DNS" \
      -v ON_ERROR_STOP=1 \
      -v app_tenant="$tenant" \
      -v app_username="$APP_USERNAME" \
      -v app_password_hash="$admin_hash" \
      -v qa_viewer_username="$viewer_user" \
      -v qa_viewer_password_hash="$viewer_hash" \
      -f "$sql_file" >/dev/null
  done
}

prepare_worktree() {
  local main_dir="$1" role="$2" ref="$3"
  local sha short_sha wt_path
  sha="$(git -C "$main_dir" rev-parse --verify "${ref}^{commit}" 2>/dev/null || true)"
  if [[ -z "$sha" ]]; then
    echo "cannot resolve ref '$ref' in $main_dir ($role)" >&2
    exit 1
  fi
  short_sha="${sha:0:12}"
  wt_path="$WT_DIR/${PROJ}-${role}-${short_sha}"
  if [[ -d "$wt_path" ]]; then
    git -C "$wt_path" checkout --detach "$sha" >/dev/null 2>&1 || true
  else
    git -C "$main_dir" worktree add --detach "$wt_path" "$sha" >/dev/null
  fi
  echo "$wt_path"
}

resolve_repo_sources() {
  local target="${1:-}" fe_override="${2:-}" be_override="${3:-}"
  FE_SRC=""
  BE_SRC=""

  if [[ -n "$fe_override" ]]; then
    if [[ -d "$fe_override" ]]; then
      FE_SRC="$(cd "$fe_override" && pwd)"
    else
      FE_SRC="$(prepare_worktree "$FE_MAIN_DIR" "fe" "$fe_override")"
    fi
  fi
  if [[ -n "$be_override" ]]; then
    if [[ -d "$be_override" ]]; then
      BE_SRC="$(cd "$be_override" && pwd)"
    else
      BE_SRC="$(prepare_worktree "$BE_MAIN_DIR" "be" "$be_override")"
    fi
  fi

  if [[ -n "$target" ]]; then
    if [[ -d "$target" ]]; then
      local abs_target
      abs_target="$(cd "$target" && pwd)"
      if [[ -f "$abs_target/go.mod" ]]; then
        BE_SRC="${BE_SRC:-$abs_target}"
      elif [[ -f "$abs_target/package.json" ]]; then
        FE_SRC="${FE_SRC:-$abs_target}"
      else
        echo "directory '$target' is neither BE (go.mod) nor FE (package.json)" >&2
        exit 2
      fi
    else
      local in_fe=0 in_be=0
      git -C "$FE_MAIN_DIR" cat-file -e "${target}^{commit}" 2>/dev/null && in_fe=1 || true
      git -C "$BE_MAIN_DIR" cat-file -e "${target}^{commit}" 2>/dev/null && in_be=1 || true
      if [[ "$in_fe" -eq 0 && "$in_be" -eq 0 ]]; then
        echo "ref/commit '$target' not found in FE ($FE_MAIN_DIR) or BE ($BE_MAIN_DIR)" >&2
        exit 1
      fi
      if [[ "$in_fe" -eq 1 && -z "$FE_SRC" ]]; then
        FE_SRC="$(prepare_worktree "$FE_MAIN_DIR" "fe" "$target")"
      fi
      if [[ "$in_be" -eq 1 && -z "$BE_SRC" ]]; then
        BE_SRC="$(prepare_worktree "$BE_MAIN_DIR" "be" "$target")"
      fi
    fi
  fi

  if [[ -z "$FE_SRC" ]]; then
    FE_SRC="$(prepare_worktree "$FE_MAIN_DIR" "fe" "$FE_BASE")"
  fi
  if [[ -z "$BE_SRC" ]]; then
    BE_SRC="$(prepare_worktree "$BE_MAIN_DIR" "be" "$BE_BASE")"
  fi
}

prepare_fe_deps() {
  local fe_dir="$1"
  if [[ -f "$FE_MAIN_DIR/.env" && ! -f "$fe_dir/.env" ]]; then
    cp "$FE_MAIN_DIR/.env" "$fe_dir/.env"
  fi
  if [[ "$fe_dir" != "$FE_MAIN_DIR" && ! -e "$fe_dir/node_modules" ]]; then
    if cmp -s "$FE_MAIN_DIR/pnpm-lock.yaml" "$fe_dir/pnpm-lock.yaml" && [[ -d "$FE_MAIN_DIR/node_modules" ]]; then
      ln -s "$FE_MAIN_DIR/node_modules" "$fe_dir/node_modules"
    else
      (cd "$fe_dir" && pnpm install --prefer-offline)
    fi
  fi
}

wait_for_port() {
  local port="$1" pid="$2" log_file="$3" name="$4" max_secs="${5:-60}"
  local i
  for i in $(seq 1 "$max_secs"); do
    if ! pid_alive "$pid"; then
      echo "$name exited unexpectedly; last log lines ($log_file):" >&2
      tail -n 30 "$log_file" >&2 || true
      return 1
    fi
    if port_listener_info "$port" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  echo "$name did not listen on :$port within ${max_secs}s; last log lines ($log_file):" >&2
  tail -n 30 "$log_file" >&2 || true
  return 1
}

cmd_up() {
  local bot="${1:-}" key="${2:-}" target="${3:-}"
  if [[ -z "$bot" || -z "$key" || -z "$target" ]]; then
    echo "usage: stack.sh [$PROJ] up <bot> <KEY> <commit|worktree> [--dev] [--fe <ref|dir>] [--be <ref|dir>]" >&2
    exit 2
  fi
  shift 3

  local dev_mode=0 fe_override="" be_override=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --dev) dev_mode=1; shift ;;
      --fe) fe_override="${2:-}"; shift 2 ;;
      --be) be_override="${2:-}"; shift 2 ;;
      *) echo "unknown option: $1" >&2; exit 2 ;;
    esac
  done

  if lock_is_alive; then
    format_lock_holder >&2
    exit 1
  elif [[ -f "$LOCK_FILE" ]]; then
    echo "removing stale lock ($LOCK_FILE)" >&2
    rm -f "$LOCK_FILE"
  fi

  ensure_ports_free
  load_be_env
  if [[ -d "$TEST_DIR/seed" ]] && compgen -G "$TEST_DIR/seed/*.sql" >/dev/null && [[ ! -f "$TEST_DIR/.env" ]]; then
    echo "missing $TEST_DIR/.env (copy from $TEST_DIR/.env.example) — needed for seed credentials" >&2
    exit 1
  fi
  resolve_repo_sources "$target" "$fe_override" "$be_override"
  prepare_fe_deps "$FE_SRC"

  local fe_commit be_commit mode="prod"
  fe_commit="$(git -C "$FE_SRC" rev-parse --short HEAD)"
  be_commit="$(git -C "$BE_SRC" rev-parse --short HEAD)"
  [[ "$dev_mode" -eq 1 ]] && mode="dev"

  echo "starting infra (postgres:$PG_PORT, redis:$REDIS_PORT_CFG)..."
  start_infra

  local be_bin="$BIN_DIR/${PROJ}-be"
  local be_log="$LOG_DIR/be.log"
  local fe_log="$LOG_DIR/fe.log"

  echo "building BE ($BE_SRC @ $be_commit)..."
  (cd "$BE_SRC" && go build -o "$be_bin" .)

  echo "starting BE on :$BE_PORT (http :$BE_HTTP_PORT)..."
  (
    cd "$BE_SRC"
    exec "$be_bin" >"$be_log" 2>&1
  ) &
  local be_pid=$!

  cleanup_on_fail() {
    stop_pid_gracefully "${fe_pid:-}" "FE" || true
    stop_pid_gracefully "${be_pid:-}" "BE" || true
    rm -f "$LOCK_FILE"
  }
  trap cleanup_on_fail ERR

  wait_for_port "$BE_PORT" "$be_pid" "$be_log" "BE" 60

  echo "running migrate-up..."
  migrate -path "$BE_SRC/migrations" -database "$APP_DATABASE_POSTGRES_DNS" up

  echo "seeding database..."
  seed_db

  export GRPC_HOST="http://localhost:${BE_PORT}"
  export NEXTAUTH_URL="http://localhost:${FE_PORT}/api/auth"
  export NEXT_DISABLE_TELEMETRY=1

  if [[ "$dev_mode" -eq 1 ]]; then
    echo "starting FE in dev mode ($FE_SRC @ $fe_commit) on :$FE_PORT..."
    (
      cd "$FE_SRC"
      exec npx next dev --turbopack -p "$FE_PORT" >"$fe_log" 2>&1
    ) &
  else
    echo "building FE ($FE_SRC @ $fe_commit)..."
    (cd "$FE_SRC" && npx next build >"$fe_log" 2>&1)
    echo "starting FE in prod mode on :$FE_PORT..."
    (
      cd "$FE_SRC"
      exec npx next start -p "$FE_PORT" >>"$fe_log" 2>&1
    ) &
  fi
  local fe_pid=$!

  local started_at tmp_lock
  started_at="$(date -Iseconds)"
  tmp_lock="$(mktemp "$STATE_DIR/lock.XXXXXX")"
  jq -n \
    --arg project "$PROJ" \
    --arg bot "$bot" \
    --arg key "$key" \
    --arg mode "$mode" \
    --arg fe_commit "$fe_commit" \
    --arg be_commit "$be_commit" \
    --arg fe_dir "$FE_SRC" \
    --arg be_dir "$BE_SRC" \
    --argjson fe_pid "$fe_pid" \
    --argjson be_pid "$be_pid" \
    --argjson fe_port "$FE_PORT" \
    --argjson be_port "$BE_PORT" \
    --argjson be_http_port "$BE_HTTP_PORT" \
    --argjson pg_port "$PG_PORT" \
    --argjson redis_port "$REDIS_PORT_CFG" \
    --arg started_at "$started_at" \
    --arg be_log "$be_log" \
    --arg fe_log "$fe_log" \
    '{
      project: $project,
      bot: $bot,
      key: $key,
      mode: $mode,
      fe_commit: $fe_commit,
      be_commit: $be_commit,
      fe_dir: $fe_dir,
      be_dir: $be_dir,
      fe_pid: $fe_pid,
      be_pid: $be_pid,
      ports: { fe: $fe_port, be: $be_port, be_http: $be_http_port, postgres: $pg_port, redis: $redis_port },
      started_at: $started_at,
      logs: { be: $be_log, fe: $fe_log }
    }' >"$tmp_lock"
  mv "$tmp_lock" "$LOCK_FILE"

  echo "waiting for http://127.0.0.1:${FE_PORT}/tms/login -> 200..."
  local i code
  for i in $(seq 1 120); do
    if ! pid_alive "$fe_pid"; then
      echo "FE exited unexpectedly; last log lines ($fe_log):" >&2
      tail -n 30 "$fe_log" >&2 || true
      cleanup_on_fail
      exit 1
    fi
    code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${FE_PORT}/tms/login" || true)"
    if [[ "$code" == "200" ]]; then
      trap - ERR
      echo "stack up: bot=$bot key=$key mode=$mode fe=:$FE_PORT($fe_commit) be=:$BE_PORT($be_commit)"
      return 0
    fi
    sleep 1
  done

  echo "FE /tms/login did not return 200 within 120s (last code=$code)" >&2
  cleanup_on_fail
  exit 1
}

cmd_down() {
  if [[ ! -f "$LOCK_FILE" ]]; then
    echo "stack is not running (no lock at $LOCK_FILE)"
    return 0
  fi
  local fe_pid be_pid
  fe_pid="$(jq -r '.fe_pid // empty' "$LOCK_FILE" 2>/dev/null || true)"
  be_pid="$(jq -r '.be_pid // empty' "$LOCK_FILE" 2>/dev/null || true)"
  stop_pid_gracefully "$fe_pid" "FE"
  stop_pid_gracefully "$be_pid" "BE"
  rm -f "$LOCK_FILE"
  echo "stack down (lock removed)"
}

cmd_status() {
  if [[ ! -f "$LOCK_FILE" ]]; then
    echo "status: stopped (no lock)"
    return 0
  fi
  local bot key mode fe_commit be_commit fe_pid be_pid started_at
  local fe_state="dead" be_state="dead" uptime_str="?"
  bot="$(jq -r '.bot // "?"' "$LOCK_FILE")"
  key="$(jq -r '.key // "?"' "$LOCK_FILE")"
  mode="$(jq -r '.mode // "?"' "$LOCK_FILE")"
  fe_commit="$(jq -r '.fe_commit // "?"' "$LOCK_FILE")"
  be_commit="$(jq -r '.be_commit // "?"' "$LOCK_FILE")"
  fe_pid="$(jq -r '.fe_pid // empty' "$LOCK_FILE")"
  be_pid="$(jq -r '.be_pid // empty' "$LOCK_FILE")"
  started_at="$(jq -r '.started_at // "?"' "$LOCK_FILE")"

  pid_alive "$fe_pid" && fe_state="alive" || true
  pid_alive "$be_pid" && be_state="alive" || true

  if [[ "$started_at" != "?" ]]; then
    uptime_str="$(STARTED_AT="$started_at" python3 - <<'PY'
from datetime import datetime, timezone
import os
s = datetime.fromisoformat(os.environ["STARTED_AT"])
delta = max(0, int((datetime.now(timezone.utc) - s.astimezone(timezone.utc)).total_seconds()))
h, rem = divmod(delta, 3600)
m, sec = divmod(rem, 60)
print(f"{h}h{m:02d}m{sec:02d}s")
PY
)"
  fi

  cat <<EOF
status: $( [[ "$fe_state" == "alive" || "$be_state" == "alive" ]] && echo "running" || echo "stale" )
holder: $bot
key: $key
mode: $mode
fe: commit=$fe_commit pid=${fe_pid:-none}($fe_state) port=$FE_PORT
be: commit=$be_commit pid=${be_pid:-none}($be_state) ports=$BE_PORT,$BE_HTTP_PORT
started_at: $started_at (uptime: $uptime_str)
lock: $LOCK_FILE
EOF
}

cmd_reset_db() {
  if lock_is_alive; then
    format_lock_holder >&2
    echo "run 'stack.sh down' before reset-db" >&2
    exit 1
  fi
  if port_listener_info "$BE_PORT" >/dev/null 2>&1; then
    echo "port :$BE_PORT is occupied; stop BE before reset-db" >&2
    exit 1
  fi

  start_infra

  echo "dropping and recreating public schema..."
  psql "$APP_DATABASE_POSTGRES_DNS" -v ON_ERROR_STOP=1 -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" >/dev/null

  echo "bootstrapping Ent schema & migrations via BE ($BE_MAIN_DIR)..."
  local be_bin="$BIN_DIR/${PROJ}-be"
  local tmp_log="$LOG_DIR/reset-db-be.log"
  (cd "$BE_MAIN_DIR" && go build -o "$be_bin" .)
  (cd "$BE_MAIN_DIR" && exec "$be_bin" >"$tmp_log" 2>&1) &
  local boot_pid=$!
  trap 'stop_pid_gracefully "$boot_pid" "BE-bootstrap"' EXIT
  wait_for_port "$BE_PORT" "$boot_pid" "$tmp_log" "BE-bootstrap" 60
  stop_pid_gracefully "$boot_pid" "BE-bootstrap"
  trap - EXIT

  migrate -path "$BE_MAIN_DIR/migrations" -database "$APP_DATABASE_POSTGRES_DNS" up
  seed_db
  echo "reset-db complete"
}

case "$CMD" in
  up) cmd_up "$@" ;;
  down) cmd_down "$@" ;;
  status) cmd_status "$@" ;;
  reset-db) cmd_reset_db "$@" ;;
  *) echo "unknown command: $CMD" >&2; exit 2 ;;
esac
