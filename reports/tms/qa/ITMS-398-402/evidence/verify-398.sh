#!/bin/bash
SECRET=$(grep -A2 '^jwt:' /home/vif/tuan-vu/tms_application/config.yaml | grep secret | awk '{print $2}')
RPASS=$(grep -A3 '^redis:' /home/vif/tuan-vu/tms_application/config.yaml | grep password | awk '{print $2}')
export QA_JWT_SECRET="$SECRET"
export QA_TENANT_ID="01JX4Y4HPGJVS08S6YPJ995MZW"
export QA_USER_ID="01M2DGBTDVDAJYHTSSWZ187TX5"   # anhthu123
RCLI="docker exec tms-local-redis redis-cli -h services.fumydatacenter.com -p 49282 -a $RPASS -n 1"
API="http://127.0.0.1:8081/api/v1/customer-debts/recalculate"
BODY='{"customer_id":"01KBA1RZ70E147EH8X85NB4WQJ"}'

echo "=== A: session WITHOUT cusdeb_rc (expect 403 PERMISSION) ==="
$RCLI SET "auth:token:$QA_USER_ID" '{"userId":"'$QA_USER_ID'","isAdmin":false,"permissions":["cusdeb_hx"]}' >/dev/null 2>&1
TOK=$(python3 /tmp/qa-auth/mint.py)
curl -s -w "\nHTTP %{http_code}\n" -X POST "$API" -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" -d "$BODY"

echo "=== B: session WITH cusdeb_rc (expect NOT permission denied) ==="
$RCLI SET "auth:token:$QA_USER_ID" '{"userId":"'$QA_USER_ID'","isAdmin":false,"permissions":["cusdeb_hx","cusdeb_rc"]}' >/dev/null 2>&1
TOK=$(python3 /tmp/qa-auth/mint.py)
curl -s -w "\nHTTP %{http_code}\n" -X POST "$API" -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" -d "$BODY"
