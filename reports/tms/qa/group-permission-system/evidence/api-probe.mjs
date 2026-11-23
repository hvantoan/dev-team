// QA probe HTTP cho group-permission-system (BE db69aee) — chạy trên stack local.
// Mỗi case: login mới (session Redis mới) → GET /users/permissions (quyền tại thời điểm gọi)
// → gọi endpoint thật → ghi status + body rút gọn.
// Dùng: QA_PW=<mật khẩu QA> node api-probe.mjs <outDir> [label]
import { writeFileSync } from 'node:fs';

const BASE = 'http://127.0.0.1:8081';
const PW = process.env.QA_PW;
if (!PW) {
  console.error('QA_PW is required');
  process.exit(2);
}
const outDir = process.argv[2] || '.';
const label = process.argv[3] || 'run';

const CUSTOMER_ID = '01QA00000000000000000000';
const TARGET_ROLE_ID = process.env.QA_ROLE_ID || '01QA00000000000000000000';
const SUPPLIER_ID = '01QA00000000000000000001';
const PARTNER_ID = '01QA00000000000000000002';

const CASES = [
  // AC7 — CustomerDebtService/Get chỉ còn cusdeb_hx
  { id: 'ac7.1-rec_r', user: 'qa-rec-r', method: 'GET', path: `/api/v1/customer-debts/${CUSTOMER_ID}`, expect: 403 },
  { id: 'ac7.2-rec_cu', user: 'qa-rec-cu', method: 'GET', path: `/api/v1/customer-debts/${CUSTOMER_ID}`, expect: 403 },
  { id: 'ac7.3-cusdeb_hx', user: 'qa-cusdeb-hx', method: 'GET', path: `/api/v1/customer-debts/${CUSTOMER_ID}`, expect: 'not403' },
  { id: 'ac7.4-rec_debt_balance', user: 'qa-rec-debt-balance', method: 'GET', path: `/api/v1/customer-debts/${CUSTOMER_ID}`, expect: 'not403' },
  // AC6 — ListPartner
  { id: 'ac6.1-prd_r', user: 'qa-prd-r', method: 'POST', path: '/api/v1/partners/list', body: { pagination: { page: 1, pageSize: 1 } }, expect: 403 },
  { id: 'ac6.2-do_cu', user: 'qa-do-cu', method: 'POST', path: '/api/v1/partners/list', body: { pagination: { page: 1, pageSize: 1 } }, expect: 'not403' },
  // AC8 — ListAdUnit = authenticated
  { id: 'ac8.1-with-token', user: 'qa-cusdeb-hx', method: 'POST', path: '/api/v1/resources/ad-units/list', body: {}, expect: 200 },
  { id: 'ac8.2-no-token', user: null, method: 'POST', path: '/api/v1/resources/ad-units/list', body: {}, expect: 401 },
  // AC9 — chốt cũ
  { id: 'ac9.1-supdeb_rc-recalculate', user: 'qa-supdeb-rc', method: 'POST', path: '/api/v1/supplier-debts/recalculate', body: { supplierId: SUPPLIER_ID }, expect: 'not403' },
  { id: 'ac9.2-no-supdeb_rc-recalculate', user: 'qa-prd-r', method: 'POST', path: '/api/v1/supplier-debts/recalculate', body: { supplierId: SUPPLIER_ID }, expect: 403 },
  { id: 'ac9.3-supdeb_open-save', user: 'qa-supdeb-open', method: 'POST', path: `/api/v1/partners/${PARTNER_ID}/opening-balance/supplier`, body: { amount: 0 }, expect: 'not403' },
  { id: 'ac9.4-no-supdeb_open-save', user: 'qa-prd-r', method: 'POST', path: `/api/v1/partners/${PARTNER_ID}/opening-balance/supplier`, body: { amount: 0 }, expect: 403 },
  { id: 'ac9.5-getmodules-role_r', user: 'qa-role-r', method: 'GET', path: '/api/v1/roles/modules', expect: 200 },
  { id: 'ac9.6-getmodules-role_cu', user: 'qa-role-cu', method: 'GET', path: '/api/v1/roles/modules', expect: 200 },
  { id: 'ac9.7-getmodules-usr_cu', user: 'qa-usr-cu', method: 'GET', path: '/api/v1/roles/modules', expect: 200 },
  { id: 'ac9.8-getmodules-prd_r', user: 'qa-prd-r', method: 'GET', path: '/api/v1/roles/modules', expect: 403 },
  { id: 'ac9.9-di-do_di', user: 'qa-do-di', method: 'GET', path: `/api/v1/delivery-instructions/${CUSTOMER_ID}`, expect: 'not403' },
  { id: 'ac9.10-di-diso_cu', user: 'qa-diso-cu', method: 'GET', path: `/api/v1/delivery-instructions/${CUSTOMER_ID}`, expect: 'not403' },
  { id: 'ac9.11-di-diso_r', user: 'qa-diso-r', method: 'GET', path: `/api/v1/delivery-instructions/${CUSTOMER_ID}`, expect: 'not403' },
  { id: 'ac9.12-di-prd_r', user: 'qa-prd-r', method: 'GET', path: `/api/v1/delivery-instructions/${CUSTOMER_ID}`, expect: 403 },
  { id: 'ac9.13-deleteimage-authenticated', user: 'qa-cusdeb-hx', method: 'DELETE', path: '/api/v1/images/01QA00000000000000000003', expect: 'not401' },
  // AC9 — SaveUser có roleId: usr_cu đơn → phải bị chặn vì thiếu role_cu (cả nhánh tạo mới)
  { id: 'ac9.14-saveuser-usr_cu-roleid', user: 'qa-usr-cu', method: 'POST', path: '/api/v1/users', body: { username: `qa-tmp-usr-cu-${Date.now()}`, password: 'Qa!passw0rd', name: 'QA tmp', roleId: TARGET_ROLE_ID, isActive: true }, expect: 'rolePermissionRequired' },
  { id: 'ac9.15-saveuser-usr_cu-role_cu', user: 'qa-usr-cu-role-cu', method: 'POST', path: '/api/v1/users', body: { username: `qa-tmp-usr-cu-role-cu-${Date.now()}`, password: 'Qa!passw0rd', name: 'QA tmp', roleId: TARGET_ROLE_ID, isActive: true }, expect: 'notRolePermissionRequired' },
  // AC10 — catalog: không còn 10304
  { id: 'ac10.catalog', user: 'qa-role-r', method: 'GET', path: '/api/v1/roles/modules', expect: 'catalog', fullBody: true },
];

async function call(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text.slice(0, 4000), full: text };
}

async function login(username) {
  const r = await call('/api/v1/auth/login', { method: 'POST', body: { tenantCode: 'tuanvudev', username, password: PW } });
  if (r.status !== 200) throw new Error(`login ${username} failed: ${r.status} ${r.body}`);
  return JSON.parse(r.body).token;
}

const results = [];
for (const c of CASES) {
  const rec = { id: c.id, user: c.user, method: c.method, path: c.path, expect: c.expect };
  try {
    let token;
    if (c.user) {
      token = await login(c.user);
      const perms = await call('/api/v1/users/permissions', { token });
      rec.permissionsAtCall = perms.status === 200 ? JSON.parse(perms.body) : perms;
    }
    const res = await call(c.path, { method: c.method, body: c.body, token });
    if (c.fullBody) rec.fullBody = (await call(c.path, { method: c.method, body: c.body, token, raw: true })).full;
    rec.status = res.status;
    rec.body = res.body;
    rec.pass =
      c.expect === 'not403' ? res.status !== 403
      : c.expect === 'not401' ? res.status !== 401
      : c.expect === 'rolePermissionRequired' ? /role_cu|role_permission|Phân quyền/i.test(res.body)
      : c.expect === 'notRolePermissionRequired' ? !/role_cu|role_permission|Phân quyền/i.test(res.body)
      : c.expect === 'catalog' ? res.status === 200 && !/"10304"/.test(res.full) && /"actionId":\s*10602,\s*"key":"vehr_cu"/.test(res.full)
      : res.status === c.expect;
  } catch (err) {
    rec.error = String(err);
    rec.pass = false;
  }
  results.push(rec);
  console.log(`${rec.pass ? 'PASS' : 'FAIL'} ${rec.id} status=${rec.status ?? '-'} expect=${c.expect}`);
}

const out = { label, generatedAt: new Date().toISOString(), base: BASE, results };
writeFileSync(`${outDir}/api-probe-${label}.json`, JSON.stringify(out, null, 2));
const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} PASS → ${outDir}/api-probe-${label}.json`);
process.exit(failed === 0 ? 0 : 1);
