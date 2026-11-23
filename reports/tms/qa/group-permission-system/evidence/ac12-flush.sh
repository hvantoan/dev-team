#!/usr/bin/env bash
# AC12 (BR-PQ-014): flush toàn bộ session sau migration, chỉ trong prefix auth:token:*.
# Chạy qua qa-env.sh để có QA_PW / REDIS_* / REDISCLI_AUTH:
#   ./qa-env.sh bash ac12-flush.sh
# Ghi ac12-flush.log + ac12-result.json (không in token).
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
BE=/home/vif/tuan-vu/tms_application
API=http://127.0.0.1:8081
DB="${REDIS_DB:-1}"

R() { docker exec -i -e REDISCLI_AUTH tms-redis redis-cli -n "$DB" "$@"; }

login() {
  curl -s -X POST "$API/api/v1/auth/login" -H 'Content-Type: application/json' \
    -d "{\"tenantCode\":\"tuanvudev\",\"username\":\"$1\",\"password\":\"$QA_PW\"}" \
    | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])'
}

T1=$(login qa-cusdeb-hx)
T2=$(login qa-prd-r)
[ -n "$T1" ] && [ -n "$T2" ] || { echo "login failed"; exit 1; }

# Key ngoài namespace session phải sống sót qua flush.
R set tms:lock:cron:qa locked >/dev/null
R set ratelimit:counter:qa 5 >/dev/null
R set cache:commune:qa cached >/dev/null

before=$(R dbsize)
sess_before=$(R --scan --pattern 'auth:token:*' | wc -l)

echo "== trước flush =="
echo "dbsize(before)=$before; session keys=$sess_before"
R --scan --pattern '*' | sort > "$HERE/ac12-keys-before.txt"

echo "== chạy scripts/flush-sessions.sh =="
PATH="$HERE/bin:$PATH" REDIS_ADDR="127.0.0.1:${REDIS_PORT:-6380}" REDIS_DB="$DB" \
  bash "$BE/scripts/flush-sessions.sh" 2>&1 | tee "$HERE/ac12-flush.log"
flush_exit=${PIPESTATUS[0]}

after=$(R dbsize)
sess_after=$(R --scan --pattern 'auth:token:*' | wc -l)
non_session_alive=$(R exists tms:lock:cron:qa ratelimit:counter:qa cache:commune:qa)
R --scan --pattern '*' | sort > "$HERE/ac12-keys-after.txt"

old1=$(curl -s -o "$HERE/ac12-old-token-body.json" -w '%{http_code}' "$API/api/v1/users/permissions" -H "Authorization: Bearer $T1")
old2=$(curl -s -o /dev/null -w '%{http_code}' "$API/api/v1/users/permissions" -H "Authorization: Bearer $T2")

# Đăng nhập lại sau flush: session mới phải hoạt động và quyền khớp DB.
T3=$(login qa-cusdeb-hx)
relogin=$(curl -s -o "$HERE/ac12-relogin-perms.json" -w '%{http_code}' "$API/api/v1/users/permissions" -H "Authorization: Bearer $T3")

cat > "$HERE/ac12-result.json" <<JSON
{
  "dbsize_before": $before,
  "session_keys_before": $sess_before,
  "flush_exit": $flush_exit,
  "dbsize_after": $after,
  "session_keys_after": $sess_after,
  "non_session_keys_alive_after": $non_session_alive,
  "old_token_status_user1": $old1,
  "old_token_status_user2": $old2,
  "relogin_status": $relogin,
  "PASS": $([ "$sess_after" -eq 0 ] && [ "$non_session_alive" -eq 3 ] && [ "$old1" = "401" ] && [ "$old2" = "401" ] && [ "$relogin" = "200" ] && [ "$flush_exit" -eq 0 ] && echo true || echo false)
}
JSON

echo "== sau flush =="
cat "$HERE/ac12-result.json"
echo "== quyền sau đăng nhập lại =="
cat "$HERE/ac12-relogin-perms.json"
