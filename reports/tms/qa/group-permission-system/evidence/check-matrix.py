#!/usr/bin/env python3
"""AC1/AC2: so matrix v3 (docs) với permission_matrix.json nhúng trong BE.
AC3 (phần registry): so 90 cạnh dependency của matrix với getActionRelations() parse từ registry.go.
Chạy: python3 check-matrix.py <matrix-v3.json> <be-permission_matrix.json> <registry.go> <out.json>
"""
import json, re, sys

def read_text(path):
    try:
        with open(path, encoding="utf-8") as f:
            return f.read()
    except OSError as exc:
        raise SystemExit(f"cannot read {path}: {exc}") from exc


mtx_path, be_path, reg_path, out_path = sys.argv[1:5]
mtx = json.loads(read_text(mtx_path))
be = json.loads(read_text(be_path))
reg_src = read_text(reg_path)
res = {}

# --- AC1: đúng 1 quyền module sở hữu, trừ 5 ngoại lệ E2/E3 ---
multi = [e for e in mtx["endpoints"] if len(e.get("allowAnyOf") or []) > 1]
res["ac1"] = {
    "endpoints_total": len(mtx["endpoints"]),
    "allowAnyOf_gt1": len(multi),
    "allowAnyOf_gt1_detail": [
        {"endpoint": e["endpoint"], "allowAnyOf": e["allowAnyOf"], "exception": e.get("exception")}
        for e in multi
    ],
    "all_have_exception": all(e.get("exception") for e in multi),
    "no_allOf_multi": [e["endpoint"] for e in mtx["endpoints"] if len(e.get("allOf") or []) > 1],
    "needs_decision": mtx.get("needs_decision"),
}

# --- AC2: BE matrix == docs matrix trên (endpoint, module, allowAnyOf, allOf) ---
def key(e):
    return e["endpoint"]

docs = {key(e): e for e in mtx["endpoints"]}
bes = {key(e): e for e in be["endpoints"]}
diffs, missing, extra = [], sorted(set(docs) - set(bes)), sorted(set(bes) - set(docs))
for k in sorted(set(docs) & set(bes)):
    d, b = docs[k], bes[k]
    row = {}
    for f in ("module", "allowAnyOf", "allOf"):
        dv, bv = d.get(f), b.get(f)
        if f in ("allowAnyOf", "allOf"):
            dv, bv = sorted(dv or []), sorted(bv or [])
        if dv != bv:
            row[f] = {"docs": d.get(f), "be": b.get(f)}
    if row:
        diffs.append({"endpoint": k, "diff": row})
be_multi = [e for e in be["endpoints"] if len(e.get("allowAnyOf") or []) > 1]
res["ac2"] = {
    "docs_count": len(docs),
    "be_count": len(bes),
    "missing_in_be": missing,
    "extra_in_be": extra,
    "field_diffs": diffs,
    "be_allowAnyOf_gt1": len(be_multi),
    "be_allowAnyOf_gt1_detail": [
        {"endpoint": e["endpoint"], "allowAnyOf": e["allowAnyOf"], "exception": e.get("exception")}
        for e in be_multi
    ],
    "PASS": not missing and not extra and not diffs and len(be_multi) == 5,
}

# --- AC3 (registry): 90 cạnh matrix vs getActionRelations() ---
# registry.go: WithCheck(Action_X, Action_Y).WithDescription(...)
block = reg_src.split("func getActionRelations()", 1)[1]
edges = set()
# mỗi quan hệ là một chuỗi add(enum.X)....WithUncheck(...).WithCheck(...): tách theo "add("
chunks = block.split("\tadd(")[1:]
edges = set()
for ch in chunks:
    src_m = re.match(r"enum\.(Action_\w+)", ch)
    if not src_m:
        continue
    src = src_m.group(1)
    for wc in re.finditer(r"WithCheck\(([^)]*)\)", ch, re.S):
        for dst in re.findall(r"enum\.(Action_\w+)", wc.group(1)):
            edges.add((src, dst))
# enum tên Go -> key: đọc permission_keys.go (PermissionKeys map)
keys_src = read_text(sys.argv[5]) if len(sys.argv) > 5 else ""
enum_map = dict(re.findall(r"enum\.(Action_\w+):\s*\"(\w+)\"", keys_src))
reg_edges = {(enum_map.get(a, a), enum_map.get(b, b)) for a, b in edges}
mtx_edges = {(d["from"], d["to"]) for d in mtx["dependencies"]}
res["ac3_registry"] = {
    "raw_edges_found": len(edges),
    "mapped_edges": len(reg_edges),
    "matrix_edges": len(mtx_edges),
    "unmapped_enums": sorted({x for e in edges for x in e if x not in enum_map}),
    "missing_in_registry": sorted(mtx_edges - reg_edges),
    "extra_in_registry": sorted(reg_edges - mtx_edges),
    "PASS": len(reg_edges) == len(mtx_edges) == 90 and reg_edges == mtx_edges,
}
print(json.dumps(res, ensure_ascii=False, indent=2))
with open(out_path, "w", encoding="utf-8") as fh:
    fh.write(json.dumps(res, ensure_ascii=False, indent=2))
