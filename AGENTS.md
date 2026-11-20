# dev-team — quy ước workspace chung

Đây là **layer orchestration**: chứa quy ước, templates, định nghĩa team (MausBot department) và artifacts các bot sinh ra. **Không chứa code dự án** — code nằm ở repo riêng của từng project, trỏ trong `projects/<proj>.md`.

Mọi bot/agent khi làm việc trong workspace này PHẢI đọc file này trước, rồi đọc `projects/<proj>.md` của project đang xử lý, và `FLOW.md` cho contract giao tiếp giữa các bot.

## 1. Projects

| Project | Folder | Ticket prefix | Key nếu không có ticket |
|---|---|---|---|
| TMS | `tms/` | `ITMS-*` (Jira) | — |
| FMS | `fms/` | `IFMS-*` (dự kiến) | — |
| Cá nhân | `ca-nhan/` | — | slug `YYYY-MM-DD-<ten-viec>` |

Khi thêm project mới: tạo `projects/<proj>.md`, thêm hàng vào bảng này, tạo cây `reports|docs|tests` tương ứng.

## 2. Bot → folder → Done-artifact

| Bot | Ghi vào | Done-artifact (file phải có) |
|---|---|---|
| Điều phối (orchestrator) | `reports/<proj>/orchestrator/<RUN-id>/` | `plan.md`, `status.md` |
| BA | `reports/<proj>/ba/<KEY>/`; docs chính thức ở `docs/<proj>/srs|adr/` | `spec.md` (draft) / SRS, ADR cập nhật |
| Dev | `reports/<proj>/dev/<KEY>/` | `handoff.md` (+ `notes.md` nếu cần) |
| QA | `reports/<proj>/qa/<KEY>/` | `verdict.md` + `evidence/` |

`KEY` = ticket key (`ITMS-378`) hoặc slug (`2026-11-20-doanh-thu`). `RUN-id` = `YYYY-MM-DD-<muc-tieu>`.

Templates điền-sẵn nằm trong `templates/` — bot copy, điền, không sửa template gốc. Test code của project ở `tests/<proj>/`.

## 3. Naming rules

- Folder/file: `kebab-case`, không dấu, không khoảng trắng.
- Ticket key giữ nguyên prefix hoa (`ITMS-378`), folder project là chữ thường (`tms/`).
- Report key phải khớp ticket key — đừng đoán: `ITMS-378` → `reports/tms/qa/ITMS-378/`, KHÔNG phải `reports/itms/...`.
- Evidence nhị phân nặng (`*.webm`, `*.mp4`, `*.xlsx`, `*.pdf`, `*/video/`) KHÔNG vào git — giữ trong `evidence/` ở filesystem, report ghi đường dẫn tuyệt đối hoặc link ngoài.

## 4. team-config/

`team-config/` chứa định nghĩa MausBot department (team.md + skills/) — **source of truth nằm ở repo này**. Khi sửa souls/skills/flow ở đây, bots đang chạy trong MausBot chỉ nhận bản mới sau khi **re-import** department. Mọi đường dẫn hardcode trong team.md/skills phải trỏ `/home/vif/tuanvu/dev-team/` và layout theo project.

## 5. Quy tắc update convention

- Quy ước sống trong repo: thay convention = sửa `AGENTS.md`/`FLOW.md` + template liên quan **trong cùng một commit**.
- Không thêm folder/bot/template "phòng khi" — thêm khi bot đó tồn tại thật.
- Không checkout repo dự án vào `projects/` hoặc bất kỳ đâu trong dev-team.

## 6. Cây thư mục

```text
dev-team/
├── AGENTS.md            # file này
├── FLOW.md              # contract giao tiếp giữa các bot
├── templates/           # mẫu điền-sẵn: qa-report, dev-handoff, ba-spec, orchestrator-run
├── team-config/         # MausBot department: team.md + skills/
├── projects/            # <proj>.md: trỏ repo thật, env, ticket pattern
├── reports/<proj>/<bot>/<KEY|RUN>/   # artifacts của từng lần chạy
├── docs/<proj>/srs|adr|research/     # tài liệu chính thức
└── tests/<proj>/        # test code (vd playwright)
```
