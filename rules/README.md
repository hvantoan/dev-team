# rules/ — rule vận hành theo vai

`rules/` là **source of truth của rule vai**. Soul (standing instructions) của từng bot là bản rút gọn của file tương ứng ở đây — khi hai bên lệch nhau, file trong repo là chuẩn và bot phải báo PO, không tự sửa.

`rules/` **không thay thế** tài liệu cũ:

- `AGENTS.md` — quy ước workspace (layout, artifact, naming, evidence, stack).
- `FLOW.md` — contract bàn giao giữa các bot (file nào, ai ghi, nội dung bắt buộc).
- `SCRUM.md` — mô hình Scrum (vai, sprint, event, DoD, điểm chạm PO ↔ team).

## Thứ tự đọc khi vào việc

1. `AGENTS.md`
2. `rules/common.md`
3. `rules/<vai>.md`
4. `projects/<proj>.json`
5. `FLOW.md` (khi cần nội dung bắt buộc của artifact mình sắp ghi)

## File — chủ sở hữu — đọc khi nào

| File | Chủ sở hữu | Đọc khi nào |
|---|---|---|
| `rules/README.md` | Scrum Master (`SM`) | Lần đầu vào workspace, hoặc khi cần biết rule nào nằm ở đâu |
| `rules/common.md` | Scrum Master (`SM`) | Mọi việc, trước `rules/<vai>.md` |
| `rules/sm.md` | Scrum Master (`SM`) | Mở run, giao task, chuyển cổng, chạy event sprint, báo PO |
| `rules/ba.md` | BA TMS | Nhận ticket, viết `spec.md`, cập nhật SRS/ADR sau QA PASS |
| `rules/dev.md` | Dev TMS | Nhận brief, implement, verify local, ghi `handoff.md`, tạo PR |
| `rules/qa.md` | QA TMS | Nhận `handoff.md`, verify độc lập, ghi `verdict.md` |

## Nội dung mỗi file vai

Cùng một khung 8 heading để đối chiếu được giữa các vai:

1. Vai trò & phạm vi (project nào)
2. Điều kiện nhận việc (input gate — file nào phải tồn tại trước)
3. Việc phải làm (bước + lệnh self-check `test -f ...`)
4. Artifact sở hữu (đường dẫn chính xác + template nguồn)
5. Điều kiện bàn giao / done
6. Ranh giới — không làm
7. Lệnh & môi trường theo project (tms / chatbotx)
8. Bẫy thường gặp

Mỗi file ≤120 dòng, câu ngắn, bullet/bảng. Không copy lại nội dung `AGENTS.md`/`FLOW.md`/`SCRUM.md` — trỏ bằng đường dẫn + số mục.

## Đổi rule

Sửa file trong `rules/` là đổi convention: cần PO duyệt và phải cập nhật soul bot tương ứng + bảng ở `AGENTS.md` §6 trong cùng một commit.
