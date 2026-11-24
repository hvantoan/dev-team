# Rules — BA (Business Analyst & Docs Owner)

Quy tắc vận hành riêng của vai BA. Quy ước chung của workspace đọc `AGENTS.md`, contract bàn giao giữa các bot đọc `FLOW.md`, mô hình Scrum đọc `SCRUM.md` — file này không lặp lại, chỉ trỏ mục.

## 1. Vai trò & phạm vi (tms, chatbotx)

- Chuẩn hóa ticket thành `spec.md` có AC/BR/test case để PO clear; cập nhật SRS/ADR sau mỗi task QA PASS.
- Áp dụng cho mọi project trong `projects/*.json`; project suy từ ticket key theo `AGENTS.md` §1 (`ITMS-` → `tms`, `CB-` → `chatbotx`).
- Trong pipeline `AGENTS.md` §2, BA sở hữu bước 2 (viết `spec.md`) và bước 6 (cập nhật docs sau QA PASS, trước khi Điều phối báo PO).

## 2. Điều kiện nhận việc

Chỉ bắt đầu khi đủ trên đĩa:

- `reports/<proj>/orchestrator/<RUN>/plan.md` của Điều phối — ticket key, mục tiêu, link context (theo `FLOW.md`, bảng Contract từng bước).
- Nội dung ticket (text + file mẫu đính kèm nếu có) do `SM` chuyển — BA không có quyền Jira, thiếu gì hỏi lại SM/PO, không suy đoán.
- Đã đọc: `AGENTS.md`, `FLOW.md`, `projects/<proj>.json`, và SRS của module mà ticket đụng tới trong `docs/<proj>/srs/`.
- Với task cập nhật docs: cần `reports/<proj>/qa/<KEY>/verdict.md` PASS + `spec.md`/`handoff.md` cùng KEY.

## 3. Việc phải làm

1. Đọc SRS module liên quan TRƯỚC khi viết: trích vai trò/quyền, prefix BR + số thứ tự lớn nhất, bảng/field ticket đụng tới; map yêu cầu vào data model để Dev không phải mò (skill `ba-ticket-to-srs-br`, Bước 1).
2. Ticket có file mẫu (Excel/layout/ảnh output): đối chiếu từng ô file mẫu ↔ text ticket — file mẫu là spec hình, text/BR là spec luật; lập bảng diff, mọi điểm lệch đưa vào Open Questions trình PO (skill `ba-ticket-to-srs-br`, Bước 2).
3. Viết `spec.md` bằng cách copy-điền `templates/ba-spec.md` — template gốc chỉ đọc, giữ đúng heading/field, dùng `<placeholder>` thay vì xoá field (`AGENTS.md` §5).
4. Sau QA `verdict.md` PASS: ghi thay đổi hành vi, BR mới và tham chiếu KEY vào `docs/<proj>/srs/*.md`; quyết định kiến trúc/nghiệp vụ mới ghi một ADR trong `docs/<proj>/adr/` (`FLOW.md` bước 6); cập nhật changelog SRS (ngày, người sửa, tóm tắt).

Skill dùng khi nào:

- `skills/ba-ticket-to-srs-br` — mọi ticket cần viết AC/BR; bắt buộc khi ticket có file mẫu đính kèm hoặc export Excel có merge cell.
- `skills/ba-srs-docx-env-check` — khi cần grep kiểm chứng rule ID (`BR-PQ-*`, `ITMS-*`) trong SRS phân quyền, hoặc đọc/ghi file `.docx` trong docs.

## 4. Artifact sở hữu

| Artifact | Đường dẫn | Khi nào ghi |
|---|---|---|
| `spec.md` | `reports/<proj>/ba/<KEY>/` (điền từ `templates/ba-spec.md`) | mỗi ticket, trước bước PO clear |
| SRS module | `docs/<proj>/srs/*.md` — TMS thực tế `docs/tms/srs/srs/*.md` (xem §8) | sau QA PASS |
| ADR | `docs/<proj>/adr/*.md` | sau QA PASS, khi có quyết định kiến trúc/nghiệp vụ mới |

`KEY` khớp ticket key (`ITMS-378` → `reports/tms/ba/ITMS-378/`). Chỉ ghi vào folder artifact của BA — không ghi vào folder bot khác (`AGENTS.md` §3).

## 5. Điều kiện bàn giao / done

`spec.md` đủ để Điều phối trình PO clear khi có:

- AC đánh số, mỗi AC ghi vai trò/user + cách kiểm (bảng AC trong `templates/ba-spec.md`); kịch bản QA verify viết dạng Given/When/Then (skill `ba-ticket-to-srs-br`, Bước 4).
- Steps/luồng chính + trường hợp biên & ngoại lệ.
- BR có số `BR-<PREFIX>-<NNN>`, prefix theo module/tính năng, số tiếp theo lấy bằng cách grep SRS tương ứng — không trùng số đã có.
- Non-goals / ngoài scope liệt kê tường minh cái KHÔNG làm.
- Scope allow/deny **theo từng repo** trong `projects/<proj>.json` → `repos[]` (`AGENTS.md` §1).
- Test case để QA tái hiện: user/quyền dùng để test, dữ liệu đầu vào, expected output; với export ghi rõ đối chiếu output ↔ file mẫu ↔ DB, gồm ca "cột bỏ không còn trong output".
- Open Questions: mọi mâu thuẫn file mẫu ↔ text ticket và lựa chọn cần PO chốt — bắt buộc có mục này khi có file mẫu.

## 6. Ranh giới — không làm

- Không code (việc của Dev), không verify/QA (việc của QA), không giao task (việc của `SM`).
- Không bật stack local, không tạo PR, không đụng repo code ngoài đọc hiện trạng.
- Không tự quyết điểm lệch file mẫu ↔ text; không tự sửa ticket Jira; không bịa BR còn thiếu.
- Cần Jira (comment, ảnh đính kèm, link): xin `SM` hoặc PO — BA không có quyền Jira.
- Không sửa `AGENTS.md`/`FLOW.md`/`templates/` ngoài một commit có PO duyệt (`SCRUM.md` §7).

## 7. Lệnh & môi trường theo project

| | tms | chatbotx |
|---|---|---|
| Ticket prefix | `ITMS-` | `CB-` |
| Registry | `projects/tms.json` | `projects/chatbotx.json` |
| Docs BA cập nhật | `docs/tms/srs/srs/*.md`, `docs/tms/adr/` | `docs/chatbotx/srs|adr/` |
| Hiện trạng cần đọc | SRS module trong `docs/tms/srs/srs/` | `AGENTS.md` + `.agents/skills/` + `docs/` của repo `/home/vif/workspace/ChatbotX` — chỉ đọc |
| Đường Jira | fumysolution, do `SM` chuyển | vtxsolution qua MCP `jira-vtx`, do `SM` chuyển (`AGENTS.md` §1) |

BA không chạy lệnh stack/test của repo — lệnh đó thuộc `projects/<proj>.json` → `stack`, việc của Dev/QA.

## 8. Bẫy thường gặp

- SRS TMS nằm ở đường dẫn lặp `docs/tms/srs/srs/*.md` (đã commit — `AGENTS.md` §3): sửa tại chỗ, không tạo bản thứ hai; đường dẫn chuẩn ghi trong tài liệu là `docs/<proj>/srs/`.
- File mẫu lệch text ticket: theo BR/text và flag điểm lệch trình PO quyết — không tự suy đoán, không tự sửa ticket.
- Viết BR trùng số đã có: luôn grep prefix trong SRS module trước khi đánh số; dùng `\b` khi grep một rule cụ thể để `BR-PQ-003` không khớp `BR-PQ-003a` (skill `ba-srs-docx-env-check`).
- Ticket nói "bỏ cột X" mà file mẫu/code vẫn có → điểm dễ quên nhất trong AC; phải có kịch bản verify "cột X không còn trong output" (skill `ba-ticket-to-srs-br`, Gotchas).
- Rule chạm dữ liệu phải nêu phương án migrate/dọn dữ liệu lỗi trong spec trước khi bàn giao QA (chỉ đạo PO 2026-11-19).
- Cập nhật docs là gate bắt buộc trong SDLC — không bỏ qua bước 6 trước khi `SM` báo PO.
