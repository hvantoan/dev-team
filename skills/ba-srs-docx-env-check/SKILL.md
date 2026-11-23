---
name: ba-srs-docx-env-check
description: Prepare docx tooling (pandoc, python-docx) and grep business-rule IDs inside SRS-PhanQuyen-Permission.md before editing docs. Use when a BA TMS task needs to verify rule IDs (BR-PQ-*, ITMS-*) or generate/read .docx in the TMS docs folder.
---

# BA SRS docx env check

Steps captured from a real run on 2026-11-19. All commands succeeded; none failed.

## 1. Check tooling (run from /tmp)

```bash
cd /tmp && which pandoc python3; python3 -c "import docx" 2>&1 | head -1
```

## 2. Install python-docx if missing

```bash
pip3 install --quiet python-docx 2>&1 | tail -1; python3 -c "import docx; print('ok')"
```

## 3. Grep rule IDs in the permission SRS

```bash
grep -n "BR-PQ-003\|ITMS-384\|diso_cu\|diso_r\|do_r\|do_di" /home/vif/tuanvu/dev-team/docs/tms/srs/SRS-PhanQuyen-Permission.md | head -50
```

## 4. Narrow grep for a specific rule

```bash
grep -n "BR-PQ-003\b\|BR-PQ-003a\|registry.go:169" /home/vif/tuanvu/dev-team/docs/tms/srs/SRS-PhanQuyen-Permission.md
```

## Gotchas

- Run step 1 from `/tmp` (or any neutral dir) so a stray `docx/` folder or `docx.py` in a working directory does not shadow the real `python-docx` import.
- `which pandoc python3` prints each found path on its own line; a missing tool prints nothing for it — check output line count, not exit code.
- `\b` in the narrow grep (step 4) prevents `BR-PQ-003` from matching `BR-PQ-003a`; keep it when you mean the exact rule, drop it when listing a whole family.
- No command failed in the captured run; if `pip3 install` fails later, report the tail of its output rather than retrying silently.
