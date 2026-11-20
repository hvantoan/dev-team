// QA probe cho AC-03: replay đúng payload tRPC mà UI gửi (bắt từ phiên admin), bằng session của user truyền vào.
// Usage: node qa-ac03-probe.cjs <user> <pass> <outDir>
const { chromium } = require('/home/vif/tuan-vu/tms-test/node_modules/@playwright/test');
const fs = require('fs');
const path = require('path');
const BASE = process.env.QA_BASE || 'http://tuanvudev.localhost:4700/tms';
const USER = process.argv[2] || 'hvantoan';
const PASS = process.argv[3] || '123';
const OUT = process.argv[4] || '/home/vif/tuanvu/tms-team/reports/qa/ITMS-378/evidence/qa-run';
const PAYLOADS = {
 "customerDebt.exportDetail": "\"[{\\\"startDate\\\":1,\\\"endDate\\\":4,\\\"isCount\\\":7,\\\"isAll\\\":8,\\\"searchText\\\":9,\\\"sort\\\":10,\\\"pageIndex\\\":3,\\\"pageSize\\\":11,\\\"customerId\\\":12,\\\"type\\\":13,\\\"customerCode\\\":14},{\\\"seconds\\\":2,\\\"nanos\\\":3},1791997200,0,{\\\"seconds\\\":5,\\\"nanos\\\":6},1795193999,999000000,true,false,\\\"\\\",{\\\"sortDirection\\\":3,\\\"sortPropertyName\\\":9},20,\\\"01KWR3AKDK44Y42WBS1PW8TRB1\\\",\\\"in_period\\\",\\\"KH-05\\\"]\"",
 "customerDebt.exportExcel": "\"[{\\\"startDate\\\":1,\\\"endDate\\\":4,\\\"isCount\\\":7,\\\"isAll\\\":8,\\\"searchText\\\":9,\\\"sort\\\":10,\\\"pageIndex\\\":3,\\\"pageSize\\\":11,\\\"customerId\\\":9,\\\"type\\\":12},{\\\"seconds\\\":2,\\\"nanos\\\":3},1791997200,0,{\\\"seconds\\\":5,\\\"nanos\\\":6},1795193999,999000000,true,false,\\\"\\\",{\\\"sortDirection\\\":3,\\\"sortPropertyName\\\":9},20,\\\"in_period\\\"]\""
};

(async () => {
  const b = await chromium.launch({ headless: true, args: ['--host-resolver-rules=MAP tuanvudev.localhost 127.0.0.1'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.waitForTimeout(1500);
  await p.getByRole('textbox', { name: 'Tên đăng nhập' }).fill(USER);
  await p.getByRole('textbox', { name: 'Mật khẩu' }).fill(PASS);
  await p.getByRole('button', { name: 'Đăng Nhập' }).click();
  await p.waitForTimeout(5000);
  await p.waitForFunction(() => !location.pathname.endsWith('/login'), null, { timeout: 40000, polling: 500 }).catch(() => {});
  const s = await p.evaluate(() => fetch('/tms/api/auth/session').then((r) => r.json()).catch(() => null));
  console.log('[probe] login', USER, JSON.stringify(s?.user ?? null));
  const out = [];
  for (const proc of Object.keys(PAYLOADS)) {
    const r = await p.evaluate(async ({ proc, body }) => {
      const res = await fetch('/tms/api/trpc/' + proc, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
      const t = await res.text();
      return { status: res.status, len: t.length, head: t.slice(0, 300) };
    }, { proc, body: PAYLOADS[proc] });
    out.push({ proc, ...r });
    console.log('[probe]', proc, 'status=', r.status, 'len=', r.len, 'head=', r.head.slice(0, 200));
    await p.screenshot({ path: path.join(OUT, USER + '-ac03-' + proc.split('.')[1] + '.png') }).catch(() => {});
  }
  fs.writeFileSync(path.join(OUT, USER + '-ac03-result.json'), JSON.stringify(out, null, 1));
  await ctx.close();
  await b.close();
})();
