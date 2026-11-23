#!/usr/bin/env bash
# QA helper: nạp credential local từ file env của BE rồi exec lệnh truyền vào.
# Không in giá trị credential ra stdout. Dùng:
#   ./qa-env.sh psql -c "select 1"
#   ./qa-env.sh redis-cli -p 6380 -n 1 dbsize
set -euo pipefail
ENV_FILE="/home/vif/tuan-vu/tms_application/.env"
TEST_ENV_FILE="/home/vif/tuanvu/dev-team/tests/tms/.env"
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
# shellcheck disable=SC1090
source "$TEST_ENV_FILE"
set +a
export QA_PW="${APP_PASSWORD:?missing}"
export PGHOST=localhost
export PGPORT=5436
export PGUSER="${POSTGRES_USER:-fms_staging}"
export PGDATABASE="${POSTGRES_DB:-tms_staging}"
export PGPASSWORD="${POSTGRES_PASSWORD:?missing}"
export REDISCLI_AUTH="${REDIS_PASSWORD:?missing}"
export REDIS_PORT="${REDIS_PORT:-6380}"
export REDIS_DB="${REDIS_DB:-1}"
exec "$@"
