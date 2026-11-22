---
name: orca-dispatch
description: "Giao việc code/test cho Orca worker qua `mausbot-orca` bridge (vendored tại /home/vif/tuanvu/dev-team/tools/mausbot-orca). Dùng khi dev-tms hoặc qa-tms cần dispatch một task ra worker riêng: submit non-blocking, watcher lo Run/Task/Dispatch/wait/gate/retry, milestone card về room. Không gọi `orca orchestration` trực tiếp, không tự poll."
---

# orca-dispatch

Bot gọi `mausbot-orca submit` để giao việc cho một Orca worker, rồi tiếp tục việc khác — watcher (systemd `mausbot-orca.service`) tự dispatch, chờ, gate, retry và gửi milestone card (`✅/⚠️/❓/🔒`) vào `--thread` đã chọn. Không chờ kết quả trong cùng lượt.

## Project registry

```bash
mausbot-orca projects    # name  agent  repo  check
```

Hiện có:

| Project | Bot dùng | Repo Orca | Check (gate) |
|---|---|---|---|
| `tms-dev` | dev-tms | `path:/home/vif/tuan-vu/tms-web` (base `dev`) | `pnpm run build` |
| `tms-qa` | qa-tms | `path:/home/vif/tuanvu/dev-team` (base `main`), scope `tests/tms/**` | `cd tests/tms && pnpm install --prefer-offline && pnpm test` |
| `dev-team` | mọi bot, việc workspace | `path:/home/vif/tuanvu/dev-team` (base `main`) | `test -f AGENTS.md` |

Không đoán project ngoài registry; mơ hồ thì hỏi Điều phối.

## Submit

```bash
mausbot-orca submit \
  --thread channel:e59a7168-fda8-42a4-98e4-815924de3d3c \
  --project <tms-dev|tms-qa|dev-team> \
  --spec-file - <<'JSON'
{
  "objective": "<một câu mô tả kết quả, tham chiếu KEY>",
  "context": ["reports/tms/ba/<KEY>/spec.md", "reports/tms/dev/<KEY>/handoff.md"],
  "scope": {"allow": ["<glob>"], "deny": ["<glob>"]},
  "non_goals": ["<điều không được làm>"],
  "done_when": ["<lệnh kiểm chứng>"],
  "max_attempts": 2
}
JSON
```

- `--thread`: `channel:e59a7168-fda8-42a4-98e4-815924de3d3c` = room `TMS — Delivery` — milestone cards đi vào room để cả team + PO thấy. Prefix `channel:` bắt buộc cho room id; `thread:<id>` hoặc bare id dùng cho conversation thường.
- `context` trỏ **file artifact** trong workspace (`reports/tms/<bot>/<KEY>/`, `docs/tms/...`) — worker đọc file, không nhét prose vào `objective`.
- `scope`: tms-qa giới hạn `tests/tms/**`; deny luôn thắng. dev-tms deny `**/*.env*`, `**/migrations/**` mặc định.
- **Quyền giữ stack:** Orca worker chỉ build và chạy unit/static check trong worktree của nó — **không gọi `scripts/stack.sh`** và không tự bật server. Chỉ bot `dev-tms` / `qa-tms` được gọi `scripts/stack.sh up|down`.
- Không đưa secret/token vào spec. Không tự đặt `--request-id` (CLI derive ổn định).
- Exit codes: `0` đã tạo; `2` project/spec sai (báo Điều phối, không tự sửa rồi retry); `3` request đã có (trả task cũ); `4` watcher chưa chạy (báo "hệ thống chưa sẵn sàng").

Trả JSON:

```json
{"ok":true,"duplicate":false,"requestId":"…","taskId":"task_…","runId":"run_…"}
```

Ghi `taskId`/`runId`/`requestId` vào `handoff.md` (dev-tms) hoặc `verdict.md` (qa-tms) để truy vết.

## Precondition tms-qa

- Trước khi submit `tms-qa`, `qa-tms` phải dựng stack đúng commit từ `handoff.md` bằng `./scripts/stack.sh up qa-tms <KEY> <commit>` và kiểm `./scripts/stack.sh status` khớp commit FE/BE cần test (tránh trường hợp stack đang chạy sai commit hoặc thuộc bot khác).
- Worker chạy trong worktree mới của dev-team: `pnpm install` tự lo qua check, nhưng `tests/tms/.env` là git-ignored và `.env.example` không chứa credential thật — bot phải đảm bảo `.env` thật đã được copy vào worktree (từ `tests/tms/.env` gốc hoặc nguồn ngoài git) trước khi submit, nếu không check `pnpm test` sẽ fail.
- Sau khi `tms-qa` xong (dù PASS hay FAIL), `qa-tms` phải chạy `./scripts/stack.sh down` để nhả lock.

## Khi có câu hỏi/escalation về card `❓`/`⚠️`

```bash
mausbot-orca answer --thread channel:e59a7168-fda8-42a4-98e4-815924de3d3c --text "<câu trả lời nguyên văn>"
```

- Escalation `1) retry  2) dừng`: trả `1` hoặc `2`.
- Exit `2`: không có câu hỏi chờ — đây là input mới, không phải answer.

## Sau milestone card

- `✅ done`: bot đọc worktree path trên card, kiểm tra bằng chứng rồi ghi artifact (`handoff.md`/`verdict.md`) theo FLOW.md. Không merge/push thay worker.
- `⚠️/escalated`: quyết định retry hay stop bằng `answer`, hoặc để Điều phối/PO chọn.

## Không làm

- Không gọi `orca orchestration ...` trực tiếp — watcher sở hữu consumer binding; gọi tay gây `consumer_fenced`.
- Không để Orca worker gọi `scripts/stack.sh` hoặc tự bật server trong worktree.
- Không `mausbot-orca status` để poll trong cùng lượt; watcher tự gửi mốc.
- Không tạo assignment thứ hai cho cùng việc khi exit `3`.
- Không sửa `tools/mausbot-orca/` khi đang làm task khác — đó là infra, không phải scope task.
