---
title: TMS single local stack and operational gates
date: 2026-11-22
summary: "Implemented scripts/stack.sh with lock/port guards, fixed QA seed, projects/tms.json be/ports config, and updated skills/team.md gates"
---

# TMS single local stack and operational gates

## What happened
- Registered `tms_application` (`be`, base `main`) and local ports (`fe: 4700`, `be: 50051`, `be_http: 8081`, `postgres: 5436`, `redis: 6380`) in `projects/tms.json`, removing the stale `GRPC_HOST` staging note.
- Added `scripts/stack.sh` (`up`/`down`/`status`/`reset-db`) with `~/.local/state/tms-stack/lock.json`, stale-PID recovery, strict port-conflict failure (no alternate port switching), isolated git worktrees, `migrate up`, fixed SQL seeding, and `/tms/login` 200 readiness check.
- Added `tests/tms/seed/001-tenant-and-users.sql` reading credentials via `psql -v` from `tests/tms/.env` (PBKDF2-SHA256 matching `pkg/pw/pw.go`).
- Updated `qa-verify-export-local`, `tms-excel-export-verify`, `orca-dispatch`, `tms-delivery-coordination`, `team-config/team.md`, and `AGENTS.md` to enforce `scripts/stack.sh` and disk artifact gates.

## Verification & Open Decisions
- Verified `bash -n scripts/stack.sh`, `jq` schema validation on `projects/*.json`, zero `nohup|next start|next dev` matches in `team-config/skills`, `team.md` YAML/body alignment, `mausbot-orca` tests (63/63 passed), lock-busy rejection, and port-busy detection on `:50051` / `:8081`.
- Remaining actions require PO confirmation: killing rogue `vif` processes (`1852404`, `2952143`, `1973974/1974019`, `2953565/2953622`; note PID `395781` belongs to user `username`), rotating `fms_staging` DB password (`config.yaml` was pushed to `origin` in `tms_application`), creating `tests/tms/.env`, re-importing `team-config/team.md`, and running a real ticket end-to-end.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
