---
name: orca-dispatch
description: "Giao việc code/test cho Orca worker qua `orca orchestration worker-start` (bot chạy native trên Orca). Dùng khi dev-tms hoặc qa-tms cần dispatch một task ra worker riêng: khởi động worker trong worktree mới, không chờ kết quả trong cùng lượt — kết quả về qua worker mail."
---

# orca-dispatch

Bot gọi `orca orchestration worker-start` để giao việc cho một Orca worker trong worktree riêng, rồi tiếp tục việc khác — kết quả của worker về qua mail và đánh thức bot. Không poll, không chờ trong cùng lượt.

## Project mapping

| Việc | Bot dùng | `--repo` | Base |
|---|---|---|---|
| Code TMS FE/BE | dev-tms | `name:tms-web` (FE) hoặc `name:tms_application` (BE) | `dev` / `main` |
| Code ChatbotX | dev-tms | `name:ChatbotX` | `main` |
| Suite test TMS | qa-tms | `name:dev-team`, scope `tests/tms/**` | `main` |
| Suite test ChatbotX | qa-tms | `name:dev-team`, scope `tests/chatbotx/**` | `main` |
| Việc workspace dev-team | mọi bot | `name:dev-team` | `main` |

Không đoán repo ngoài mapping; mơ hồ thì hỏi Điều phối. Repo không đổi mà không qua anh Toàn.

## Submit

```bash
orca orchestration worker-start \
  --repo name:<tms-web|tms_application|ChatbotX|dev-team> \
  --worktree new-child \
  --agent pi \
  --task-title "<KEY> — <ngắn>" \
  --spec-file - <<'EOF'
<objective: một câu mô tả kết quả, tham chiếu KEY>

Context đọc từ file artifact (đường dẫn tuyệt đối):
- /home/vif/tuanvu/dev-team/reports/<proj>/ba/<KEY>/spec.md
- /home/vif/tuanvu/dev-team/reports/<proj>/dev/<KEY>/handoff.md (nếu có)

Scope:
- allow: <glob>
- deny: <glob> (deny luôn thắng; dev-tms luôn deny **/*.env*, **/migrations/**)

Non-goals: <điều không được làm>
Done when: <lệnh kiểm chứng>

Bạn sở hữu pull request mình mở cho tới khi sẵn sàng merge: theo dõi checks/reviews, sửa cái hỏng hoặc được yêu cầu, rồi báo cáo.
EOF
```

- `context` trỏ **file artifact** trong workspace — worker đọc file, không nhét prose vào spec.
- Kết quả in ra dispatch id (`dispatch:<id>`) — ghi vào `handoff.md` (dev-tms) hoặc `verdict.md` (qa-tms) để truy vết.
- Sau khi start, kết thúc lượt: kết quả worker về bằng mail, bot xử lý khi mail đánh thức — không `bg_status`/`sleep` để chờ.

## Gate theo project

- **TMS:** `pnpm run build` / test harness trong `tests/tms` theo `projects/tms.json`.
- **ChatbotX:** `pnpm lint`, `pnpm check-types` (không dùng bare `turbo check-types`), `pnpm test`; targeted: `pnpm --filter <workspace> test`. `next build` bỏ qua lỗi TS nên `check-types` là cổng type duy nhất.

## Quyền giữ stack

- Orca worker chỉ build và chạy unit/static check trong worktree của nó — **không gọi stack script** (`scripts/stack.sh` hoặc `scripts/dev-up.sh`), không tự bật server, không đổi port. Ghi rõ điều này trong mọi spec.
- Chỉ bot `dev-tms` / `qa-tms` được gọi lệnh `stack.run` của project.

## Precondition

- **TMS QA:** trước khi dispatch suite test, `qa-tms` dựng stack đúng commit từ `handoff.md`: `./scripts/stack.sh up qa-tms <KEY> <commit>`, kiểm `./scripts/stack.sh status` khớp commit FE/BE. `tests/tms/.env` git-ignored nên phải copy `.env` thật vào worktree của worker. Xong phải `./scripts/stack.sh down`.
- **ChatbotX QA:** dựng stack bằng `cd /home/vif/workspace/ChatbotX && ./scripts/dev-up.sh` (builder `:3123`, demo login), copy `.env` / `apps/builder/.env` cần thiết vào worktree worker nếu test cần. Xong phải `./scripts/dev-up.sh --stop` (và `docker compose stop` nếu không dùng tiếp).
- Một stack local cho mỗi project: kiểm `status` trước khi dựng, không dựng chồng.

## Khi cần sửa / trả lời worker

```bash
orca orchestration send --to dispatch:<id> --type question --subject "..." --body "..."
```

Gửi follow-up cho worker đang chạy. Kết quả cuối cùng của nó vẫn về qua mail.

## Sau khi worker xong

- Đọc worktree path/kết quả trong mail, kiểm chứng bằng chứng rồi ghi artifact (`handoff.md`/`verdict.md`) theo FLOW.md. Không merge/push thay worker trừ khi spec giao.
- FAIL: dispatch lại với spec sửa trên cùng folder KEY, tăng "Lần bàn giao"/attempt trong artifact.

## Không làm

- Không dùng bridge ngoài Orca: mọi dispatch đi qua `orca orchestration worker-start`.
- Không để worker gọi stack script hoặc tự bật server trong worktree.
- Không poll trạng thái worker trong cùng lượt.
- Không tạo worker thứ hai cho cùng một việc khi worker cũ còn chạy.
- Không đưa secret/token vào spec.
