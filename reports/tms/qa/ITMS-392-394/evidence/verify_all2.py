import json, subprocess, openpyxl, collections, glob
rows=[l.strip().split("|") for l in open("ranges.tsv") if l.strip()]
db=collections.defaultdict(set)
for cust,code,price,frm,to in rows: db[(cust,code)].add((price,frm,to))
bad=[]; orders=0; split=0; lines=0; checked_rows=0
for path in sorted(glob.glob("all-detail/*.xlsx")):
    cust=path.split("/")[-1].replace(".xlsx","")
    ws=openpyxl.load_workbook(path).active
    cur=None; seen=collections.defaultdict(list)
    for r in range(1,ws.max_row+1):
        code=ws.cell(r,4).value
        if isinstance(code,str) and code.startswith("DGH-"): cur=code
        if not cur: continue
        price=ws.cell(r,11).value; frm=ws.cell(r,5).value; to=ws.cell(r,6).value
        if price is None or not frm or not to: continue
        p=str(int(round(float(price))))
        seen[(cust,cur)].append((p,str(frm),str(to)))
    for key,vals in seen.items():
        orders+=1; lines+=len(vals)
        if len(vals)>1: split+=1
        for v in vals:
            checked_rows+=1
            if v not in db[key]:
                bad.append((key,v,sorted(db[key])))
print(f"orders in files={orders}, price-lines={lines}, split-price orders={split}, rows checked={checked_rows}, NOT-IN-DB={len(bad)}")
for b in bad[:10]: print("BAD",b)
