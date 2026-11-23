#!/usr/bin/env python3
"""Seed role/user QA cho group-permission-system trên stack local.

Mỗi role có đúng tập quyền THÔ như khai báo (không qua chuẩn hoá) để test AC7/AC6/AC9/AC10.
Mật khẩu user lấy từ APP_PASSWORD của tests/tms (không in ra), hash theo đúng thuật toán BE:
base64(salt32 || pbkdf2_sha256(pw, salt, 10000, 32)).
Chạy: python3 seed-qa-roles.py [--print]
"""
import base64, hashlib, json, os, secrets, subprocess, sys

BE_ENV = "/home/vif/tuan-vu/tms_application/.env"
TEST_ENV = "/home/vif/tuanvu/dev-team/tests/tms/.env"


def load_env(path):
    data = {}
    try:
        fh = open(path, encoding="utf-8")
    except OSError as exc:
        raise SystemExit(f"cannot read {path}: {exc}") from exc
    with fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            data[k.strip()] = v.strip().strip('"').strip("'")
    return data


be = load_env(BE_ENV)
test = load_env(TEST_ENV)
pw = test["APP_PASSWORD"]
tenant = test.get("APP_TENANT", "tuanvudev")

salt = secrets.token_bytes(32)
dk = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, 10000, 32)
pw_hash = base64.b64encode(salt + dk).decode()

ROLES = {
    "qa-rec-r": ["rec_r"],
    "qa-rec-cu": ["rec_cu"],
    "qa-cusdeb-hx": ["cusdeb_hx"],
    "qa-rec-debt-balance": ["rec_debt_balance"],
    "qa-prd-r": ["prd_r"],
    "qa-do-cu": ["do_cu"],
    "qa-do-di": ["do_di"],
    "qa-diso-cu": ["diso_cu"],
    "qa-diso-r": ["diso_r"],
    "qa-diso-d": ["diso_d"],
    "qa-vehr-cu": ["vehr_cu"],
    "qa-supdeb-rc": ["supdeb_hx", "supdeb_rc"],
    "qa-supdeb-open": ["supdeb_hx", "supdeb_open"],
    "qa-supdeb-hx": ["supdeb_hx"],
    "qa-usr-r": ["usr_r"],
    "qa-usr-cu": ["usr_cu"],
    "qa-usr-cu-role-cu": ["usr_cu", "role_cu"],
    "qa-role-cu": ["role_cu"],
    "qa-role-r": ["role_r"],
    "qa-supdeb-hx-raw": ["supdeb_hx"],
}

if "--only" in sys.argv:
    keep = sys.argv[sys.argv.index("--only") + 1]
    ROLES = {k: v for k, v in ROLES.items() if k == keep}

sql = ["BEGIN;"]
for code, perms in ROLES.items():
    rid = "01QAROLE" + hashlib.sha1(code.encode()).hexdigest()[:18].upper()
    sql.append(
        f"""INSERT INTO public.role (id, tenant_id, code, name, search_name, permissions, is_active, is_deleted, created_at, modified_at)
SELECT '{rid}', t.id, '{code}', '{code}', '{code}', '{json.dumps(perms)}'::jsonb, true, false, now(), now()
FROM public.tenant t WHERE t.code = lower(trim('{tenant}'))
ON CONFLICT (tenant_id, code) DO UPDATE
SET permissions = EXCLUDED.permissions, is_active = true, is_deleted = false, modified_at = now();"""
    )
    uid = "01QAUSER" + hashlib.sha1(code.encode()).hexdigest()[:18].upper()
    sql.append(
        f"""INSERT INTO public."user" (id, tenant_id, username, password, name, search_name, is_active, is_admin, is_deleted, created_at, modified_at, role_users)
SELECT '{uid}', t.id, '{code}', '{pw_hash}', '{code}', '{code}', true, false, false, now(), now(), r.id
FROM public.tenant t JOIN public.role r ON r.tenant_id = t.id AND r.code = '{code}'
WHERE t.code = lower(trim('{tenant}'))
ON CONFLICT (tenant_id, username) DO UPDATE
SET password = EXCLUDED.password, is_active = true, is_deleted = false, modified_at = now(), role_users = EXCLUDED.role_users;"""
    )
sql.append("COMMIT;")

env = dict(os.environ, PGHOST="localhost", PGPORT="5436",
           PGUSER=be.get("POSTGRES_USER", "fms_staging"),
           PGDATABASE=be.get("POSTGRES_DB", "tms_staging"),
           PGPASSWORD=be["POSTGRES_PASSWORD"])
proc = subprocess.run(["psql", "-q", "-v", "ON_ERROR_STOP=1", "-f", "-"],
                      input="\n".join(sql), text=True, env=env, capture_output=True)
if proc.returncode != 0:
    sys.exit(f"psql failed: {proc.stderr}")
print(f"seeded {len(ROLES)} roles/users for tenant {tenant}")
if "--print" in sys.argv:
    for code, perms in ROLES.items():
        print(f"{code}: {perms}")
