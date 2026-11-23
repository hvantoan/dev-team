import openpyxl, collections, glob
rng=[l.strip().split("|") for l in open("ranges.tsv") if l.strip()]
db=collections.defaultdict(set)
for cust,code,price,frm,to in rng: db[(cust,code)].add((price,frm,to))
od={}
for l in open("orders.tsv"):
    oid,code,cust,s,e=l.strip().split("|"); od[(cust,code)]=(s,e)
no_range_ok=0; range_ok=0; bad=[]
for path in sorted(glob.glob("all-detail/*.xlsx")):
    cust=path.split("/")[-1][:-5]
    ws=openpyxl.load_workbook(path).active
    cur=None; seen=collections.defaultdict(list)
    for r in range(1,ws.max_row+1):
        code=ws.cell(r,4).value
        if isinstance(code,str) and code.startswith("DGH-"): cur=code
        if not cur: continue
        price=ws.cell(r,11).value; frm=ws.cell(r,5).value; to=ws.cell(r,6).value
        if price is None or not frm or not to: continue
        seen[(cust,cur)].append((str(int(round(float(price)))),str(frm),str(to)))
    for key,vals in seen.items():
        if key in db:
            for v in vals:
                if v in db[key]: range_ok+=1
                else: bad.append(("period-not-matching-range",key,v,sorted(db[key])))
        else:
            exp=od.get(key)
            for v in vals:
                if exp and (v[1],v[2])==exp: no_range_ok+=1
                else: bad.append(("fallback-wrong",key,v,exp))
print(f"lines matching their price range: {range_ok}")
print(f"lines with no range falling back to order dates: {no_range_ok}")
print("bad:",len(bad))
for b in bad[:8]: print(b)
