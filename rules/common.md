# Rules chung — mọi bot TMS

Áp cho `sm-tms`, `ba-tms`, `dev-tms`, `qa-tms` ở mọi project trong `projects/*.json`. Quy ước workspace ở `AGENTS.md`; contract bàn giao ở `FLOW.md`; mô hình Scrum ở `SCRUM.md` — file này không nhắc lại, chỉ nêu phần vận hành.

## 1. Sự thật nằm trên đĩa

- File là bằng chứng duy nhất. Không nhận "đã xong", "đã test" nói trong chat hay trong tin bot khác.
- Trước khi tin một bước đã hoàn tất: `test -f <artifact>` hoặc `rg <KEY> reports/<proj>` — sai đường dẫn/thiếu file = bước đó chưa xong.
- Report key phải khớp ticket key: `ITMS-378` → `reports/tms/*/ITMS-378/`, không `reports/itms/...` (AGENTS.md §5 Naming).

## 2. Thứ tự đọc khi vào việc

1. `AGENTS.md`
2. `rules/common.md` (file này)
3. `rules/<vai>.md` — `sm.md` / `ba.md` / `dev.md` / `qa.md`
4. `projects/<proj>.json` — Jira, repo, base branch, stack, gate
5. `FLOW.md` khi cần nội dung bắt buộc của artifact mình sắp ghi

## 3. Suy project từ ticket key

- `ITMS-` → `tms`; `CB-` → `chatbotx`.
- Jira TMS: `orca jira` (fumysolution). Jira CB: MCP `jira-vtx` (`mcp__jira_vtx_jira_*`) — `orca jira` chưa lưu site vtxsolution.
- FMS chưa có department riêng: không nhận task FMS, không gộp vào `tms` (AGENTS.md §1 Ràng buộc).

## 4. Nhịp làm việc

- WIP = 1 task/bot. Xong task hiện tại (có artifact của mình trên đĩa) mới nhận task kế.
- Chạy song song chỉ khi Điều phối đã kiểm phụ thuộc (cùng file/module, cùng migration, cùng base branch, chung lockfile) và kết luận độc lập; mỗi nhánh riêng.
- Gom nhóm task thì kết quả cuối là **một PR** cho cả nhóm (PO chốt 2026-11-20), không tách PR lẻ.

## 5. Artifact và trạng thái

- Mọi artifact điền từ `templates/` (`ba-spec`, `dev-handoff`, `qa-report`, `orchestrator-run`); giữ đúng heading/field, điền `<placeholder>`, không xoá field. Template gốc chỉ đọc.
- Nhãn trạng thái đúng `templates/orchestrator-run.md`: ⏳ chờ clear → 📋 BA spec → 💻 Dev → 🔍 QA → ✅ PASS / ❌ FAIL / 🚫 BLOCKED.
- Prose tiếng Việt; giữ nguyên ID/path/ticket key/thuật ngữ; folder `kebab-case`.

## 6. Stack local

- Chỉ chạy stack qua wrapper có lock của workspace: `scripts/stack.sh` (tms) và `scripts/stack-chatbotx.sh` (chatbotx, nó gọi `dev-up.sh`). Lệnh gốc trong `projects/<proj>.json` → `stack.run` chỉ dùng khi PO yêu cầu.
- Có lock (`~/.local/state/*-stack/lock.json`): stack đang bị bot khác giữ thì chờ hoặc báo Điều phối, không tự đổi port.
- Dùng xong phải nhả stack trước khi bàn giao.
- Không chạy `next`, `go`, `nohup` trực tiếp; không đổi port; không start/stop/kill docker container của owner (AGENTS.md §7, `projects/chatbotx.json` → `stack.notes`).

## 7. Secrets

- Chỉ nằm trong `.env` đã git-ignore (`tests/tms/.env`, `tms_application/.env`, `/home/vif/workspace/ChatbotX/.env`).
- Không commit, không copy giá trị vào report/comment/chat; dùng `.env.example` làm mẫu.

## 8. Evidence

- Nhẹ (`.md`, `.json`, `.txt`, `.png` nhỏ): commit trong `evidence/`.
- Nặng (`webm/mp4/xlsx/pdf/sql/archive/db/har/doc*/ppt*/csv`, thư mục `video/`): git-ignored, giữ trên đĩa, ghi **đường dẫn tuyệt đối** trong `verdict.md`.
- Thiếu bằng chứng tái tạo được = FAIL, không phải PASS (FLOW.md Evidence, AGENTS.md §8).

## 9. Đổi convention

- Sửa `AGENTS.md` / `FLOW.md` / `SCRUM.md` / `templates/` / `rules/` phải có PO duyệt, và sửa tài liệu + template liên quan **trong cùng một commit**.
- Không thêm folder/bot/template "phòng khi" (AGENTS.md §5).
