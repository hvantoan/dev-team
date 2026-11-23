# FLOW — contract giao tiếp giữa các bot

Nguyên tắc: **bot sau đọc file của bot trước, không tin lời kể trong chat.** Mỗi mũi bàn giao là một file trong `reports/<proj>/`, ghi đúng folder của bot sở hữu nó (xem `AGENTS.md` mục 2). Sprint, event và cách PO giao tiếp với team: `SCRUM.md`.

## Luồng một task

```mermaid
flowchart LR
    U[Anh Toàn / Chat] --> C[Scrum Master]
    C -->|plan.md + brief| B[BA]
    B -->|spec.md| C
    C -->|clear + giao| D[Dev]
    D -->|handoff.md| Q[QA]
    Q -->|verdict.md + evidence/| C
    Q -->|PASS| B2[BA cập nhật SRS/ADR]
    C -->|status.md| U
```

## Contract từng bước

| Bước | File | Bot đọc tiếp | Nội dung bắt buộc |
|---|---|---|---|
| 1. Điều phối mở run | `reports/<proj>/orchestrator/<RUN>/plan.md` | BA | ticket key, mục tiêu, link context |
| 2. BA chuẩn hóa | `reports/<proj>/ba/<KEY>/spec.md` | Điều phối → PO duyệt | AC rõ, steps, rule nghiệp vụ, non-goals |
| 3. Điều phối giao Dev | brief trong `plan.md`/`status.md` | Dev | commit base, scope allow/deny, done_when |
| 4. Dev bàn giao | `reports/<proj>/dev/<KEY>/handoff.md` | QA | branch/commit, cách chạy, API thay đổi, điểm cần QA chú ý |
| 5. QA verify | `reports/<proj>/qa/<KEY>/verdict.md` + `evidence/` | Điều phối, Dev | PASS/FAIL/BLOCKED theo từng done-condition, bằng chứng tự tái tạo (ảnh/video/script — file nặng ghi đường dẫn) |
| 6. QA PASS → BA cập nhật | `docs/<proj>/srs/*.md`, `docs/<proj>/adr/*.md` | team | rule thay đổi, hành vi mới, tham chiếu KEY |
| 7. Điều phối báo cáo | `reports/<proj>/orchestrator/<RUN>/status.md` | anh Toàn | trạng thái từng task, link verdict |

## Ranh giới

- Một task chỉ **xong** khi: code xong + test/build pass tại chỗ + QA `verdict.md` PASS. Mới qua task tiếp theo.
- QA trả BLOCKED: ghi rõ điều kiện môi trường thiếu trong `verdict.md`; Điều phối quyết định retry hay trả PO.
- Dev sửa sau FAIL: commit mới → update `handoff.md` (ghi lần retry) → QA chạy lại trên cùng folder KEY.
- Mọi task phải được anh Toàn clear trước khi Dev nhận — Điều phối không thay PO phê duyệt.

## PO ↔ team

Chi tiết ở `SCRUM.md` §5. Tóm tắt:

| Khi nào | Kênh | PO cho |
|---|---|---|
| Giao/đổi ưu tiên | chat Scrum Master (`SM`) + comment Jira | thứ tự, mục tiêu, ràng buộc |
| Planning | chat Scrum Master | duyệt Sprint Goal + KEY cam kết |
| Clear task | **comment Jira trên ticket** | "clear" + scope allow/deny |
| Giữa sprint | item `needs-you` | trả lời quyết định |
| Review | chat Scrum Master + `review.md` | accept / trả lại / ưu tiên sprint sau |

Quyết định chỉ có hiệu lực khi nằm trong artifact — comment Jira, `goal.md`, hoặc câu trả lời trên item. Bot đọc file, không đọc chat.

## Evidence

- Kết quả nhẹ (`.md`, `.json`, `.txt`, `.png` nhỏ): commit trong `evidence/`.
- Nhị phân nặng (`.webm`, `.mp4`, `.xlsx`, `.pdf`, dump SQL `.sql`, archive `.tar*`/`.7z`/`.rar`, DB `.db`/`.sqlite*`, `.har`, `.mov`/`.avi`/`.mkv`, `.doc*`/`.ppt*`, `.csv`, thư mục `video/`): git-ignored — lưu tại `evidence/` trên đĩa, `verdict.md` ghi **đường dẫn tuyệt đối** hoặc link ngoài. Ngoại lệ: `tests/**/seed/**` commit seed SQL nhỏ.
