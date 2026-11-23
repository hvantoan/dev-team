import json, subprocess, openpyxl, collections, os, sys
tok=json.load(open("login-8081.json"))["token"]
rows=[l.strip().split("|") for l in open("ranges.tsv") if l.strip()]
db=collections.defaultdict(set)
for cust,code,price,frm,to in rows:
    db[(cust,code)].add((price, frm, to))
custs=sorted({c for c,_,_,_,_ in rows})
os.makedirs("all-detail",exist_ok=True)
fails=[]; checked=0; files=0
for cust in custs:
    out=f"all-detail/{cust}.xlsx"
    r=subprocess.run(["curl","-s","-o",out,"-w","%{http_code}","-X","POST",
        f"http://127.0.0.1:8081/api/v1/customer-debts/{cust}/export",
        "-H",f"Authorization: Bearer {tok}","-H","Content-Type: application/json",
        "-d",'{"pagination":{"startDate":"2026-01-01T00:00:00Z","endDate":"2026-11-30T23:59:59Z","isAll":true}}'],capture_output=True,text=True)
    if r.stdout!="200": fails.append((cust,"http",r.stdout)); continue
    files+=1
    ws=openpyxl.load_workbook(out).active
    cur=None; got=collections.defaultdict(set)
    for rw in range(1,ws.max_row+1):
        code=ws.cell(rw,4).value; 
        if isinstance(code,str) and code.startswith("DGH-"): cur=code
        if not cur: continue
        price=ws.cell(rw,11).value; frm=ws.cell(rw,5).value; to=ws.cell(rw,6).value
        if price is None or not frm: continue
        try: p=str(int(round(float(price))))
        except: continue
        got[(cust,cur)].add((p,str(frm),str(to)))
    for key,expect in db.items():
        if key[0]!=cust: continue
        # only compare orders present in the file
        if key not in got: continue
        checked+=1
        if got[key]!=expect:
            fails.append((key,sorted(expect),sorted(got[key])))
print("customers exported:",files,"orders compared:",checked,"mismatches:",len(fails))
for f in fails[:10]: print("MISMATCH",f)
