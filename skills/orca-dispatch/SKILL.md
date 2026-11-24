---
name: orca-dispatch
description: "Giao việc code/test cho Orca worker qua `orca orchestration worker-start` (bot chạy native trên Orca). Dùng khi dev hoặc qa cần dispatch một task ra worker riêng: khởi động worker trong worktree mới, không chờ kết quả trong cùng lượt — kết quả về qua worker mail."
---

# orca-dispatch

Bot gọi `orca orchestration worker-start` để giao việc cho một Orca worker trong worktree riêng, rồi tiếp tục việc khác — kết quả của worker về qua mail và đánh thức bot. Không poll, không chờ trong cùng lượt.

## Project mapping

| Việc | Bot dùng | `--repo` | Base |
|---|---|---|---|
| Code TMS FE/BE | dev | `name:tms-web` (FE) hoặc `name:tms_application` (BE) | `dev` / `main` |
| Code ChatbotX | dev | `name:ChatbotX` | `main` |
| Suite test TMS | qa | `name:dev-team`, scope `tests/tms/**` | `main` |
| Suite test ChatbotX | qa | `name:dev-team`, scope `tests/chatbotx/**` | `main` |
| Việc workspace dev-team | mọi bot | `name:dev-team` | `main` |

Không đoán repo ngoài mapping; mơ hồ thì hỏi Điều phối. Repo không đổi mà không qua anh Toàn.

## Precondition: coalesce handle (bắt buộc)

Bot chạy trong session OpenMausBot **không** có `ORCA_TERMINAL_HANDLE`, nên mọi lệnh `orca orchestration` fail `no_active_sender_terminal`. Phải tự tạo một terminal coordinator và truyền handle của nó:

```bash
H=$(orca terminal create --worktree path:/home/vif/tuanvu/dev-team --title coord-dev --json | jq -r '.result.terminal.handle')
```

- Mọi lệnh có `--from` (`worker-start`, `send`, `reply`, `ask`) dùng `--from $H`.
- Mọi lệnh đọc mail dùng `--terminal $H`; xem lại mail đã đọc thì `inbox --terminal run:<runId>`. KHÔNG dùng `--from` (`check`/`inbox` không nhận `--from`).
- Xong việc: `orca terminal close --terminal $H`. Terminal sót lại thành rác trong danh sách tab của anh Toàn.

## Không dùng heredoc

`orca skills get orchestration` cấm heredoc (`<<`) — shell treo. Ghi spec ra file bằng công cụ file rồi `--spec-file /tmp/<key>-spec.md`. Block `<<'EOF'` trong ví dụ dưới là **nội dung file**, không phải lệnh shell.

## Tên nhánh: Orca tự prefix `hvantoan/`

`worker-start --worktree new-child` sinh nhánh `hvantoan/<name>` — **sai rule** `fix/ITMS-<id>-<slug>`. Muốn tên nhánh đúng:

```bash
orca worktree create --repo name:tms_application --name <slug> \
  --branch fix/ITMS-<id>-<slug> --base-branch main
orca orchestration worker-start --from $H --worktree branch:fix/ITMS-<id>-<slug> --agent pi \
  --task-title "<KEY> — <ngắn>" --spec-file /tmp/<key>-spec.md
```

`orca worktree create` là đường duy nhất đặt được `--branch`; `worker-start` chỉ nhận worktree có sẵn. Đã kiểm chứng trên `tms_application`: branch ra đúng `fix/ITMS-9999-orca-learn`, head = `origin/main` mới nhất (`9c370b2`).

## Submit

Ghi spec ra file trước (`/tmp/<key>-spec.md`), rồi:

```bash
H=$(orca terminal create --worktree path:/home/vif/tuanvu/dev-team --title coord-dev --json | jq -r '.result.terminal.handle')

orca orchestration worker-start --environment local --from $H \
  --worktree branch:<branch-đã-tạo> \
  --agent pi \
  --task-title "<KEY> — <ngắn>" \
  --spec-file /tmp/<key>-spec.md
```

Nội dung spec:

```text
<objective: một câu mô tả kết quả, tham chiếu KEY>

Context đọc từ file artifact (đường dẫn tuyệt đối):
- /home/vif/tuanvu/dev-team/reports/<proj>/ba/<KEY>/spec.md
- /home/vif/tuanvu/dev-team/reports/<proj>/dev/<KEY>/handoff.md (nếu có)

Scope:
- allow: <glob>
- deny: <glob> (deny luôn thắng; dev luôn deny **/*.env*, **/migrations/**)

Non-goals: <điều không được làm>
Done when: <lệnh kiểm chứng>

Bạn sở hữu pull request mình mở cho tới khi sẵn sàng merge: theo dõi checks/reviews, sửa cái hỏng hoặc được yêu cầu, rồi báo cáo.
```

- `context` trỏ **file artifact** trong workspace — worker đọc file, không nhét prose vào spec.
- Receipt trả về một dòng `dispatchId=ctx_… taskId=task_… runId=run_…` — ghi `dispatch:<id>` vào `handoff.md` (dev) hoặc `verdict.md` (qa) để truy vết. **`runId` phải giữ lại**: đó là mailbox để đọc kết quả.
- Sau khi start, kết thúc lượt: kết quả worker về bằng mail, bot xử lý khi mail đánh thức — không `sleep`/poll.
- Receipt có thể kèm `warning="Orca could not make it discoverable"` — vô hại, worker vẫn chạy; không retry.

## Gate theo project

- **TMS:** `pnpm run build` / test harness trong `tests/tms` theo `projects/tms.json`.
- **ChatbotX:** `pnpm lint`, `pnpm check-types` (không dùng bare `turbo check-types`) — **không chạy `pnpm test` local**: suite do CI `.github/workflows/ci.yml` chạy trên mọi PR. **Test case chức năng theo AC vẫn bắt buộc**: Dev chạy trước handoff (thủ công/curl/script tạm, ghi evidence), QA chạy độc lập khi verdict. `next build` bỏ qua lỗi TS nên `check-types` là cổng type duy nhất.

## Quyền giữ stack

- Orca worker chỉ build và chạy unit/static check trong worktree của nó — **không gọi stack script** (`scripts/stack.sh` hoặc `scripts/dev-up.sh`), không tự bật server, không đổi port. Ghi rõ điều này trong mọi spec.
- Chỉ bot `dev` / `qa` được gọi lệnh `stack.run` của project.

## Precondition stack (QA)

- **TMS QA:** trước khi dispatch suite test, `qa` dựng stack đúng commit từ `handoff.md`: `./scripts/stack.sh up qa <KEY> <commit>`, kiểm `./scripts/stack.sh status` khớp commit FE/BE. `tests/tms/.env` git-ignored nên phải copy `.env` thật vào worktree của worker. Xong phải `./scripts/stack.sh down`.
- **ChatbotX QA:** dựng stack bằng `cd /home/vif/workspace/ChatbotX && ./scripts/dev-up.sh` (builder `:3123`, demo login), copy `.env` / `apps/builder/.env` cần thiết vào worktree worker nếu test cần. Xong phải `./scripts/dev-up.sh --stop` (và `docker compose stop` nếu không dùng tiếp).
- Một stack local cho mỗi project: kiểm `status` trước khi dựng, không dựng chồng.

## Đọc kết quả, trả lời worker, chạy lại sau FAIL

**Đọc kết quả** — dùng **handle coordinator đang sống**, không dùng `run:<runId>` cho lệnh tiêu thụ:

```bash
orca orchestration check --terminal $H                     # mail chưa đọc, đánh dấu đã đọc
orca orchestration inbox --terminal run:<runId> --limit 20  # xem lại mail đã đọc, kể cả sau khi đóng $H
orca orchestration worker-show --dispatch ctx_<id>         # state/liveness/terminal
orca orchestration worker-read --dispatch ctx_<id>         # transcript chi tiết
```

Đường đọc tiêu thụ thật là `--terminal $H`: mail của run chuyển vào hộp coordinator, `check` đánh dấu handled luôn. `check --terminal run:<runId>` (không `--peek`) fail `stable_pane_required: no live pane` — run mailbox không có pane. Đã đọc rồi thì `--peek` trả `No messages`; muốn xem lại dùng `inbox --terminal run:<runId>` (chạy được cả sau khi đóng `$H`).

`worker_done` mang `payload: taskId=… dispatchId=… outcome=succeeded|failed`. Outcome là nguồn sự thật, không phải tiêu đề.

**Worker hỏi (question)** — trả lời bằng `reply --from $H --id <msg_id> --body "..."`. Không trả lời = worker treo tới hết turn.

**Gửi thêm việc / chạy lại sau QA FAIL** — `send` mở lại worker đã settle thành task mới:

```bash
orca orchestration send --from $H --to dispatch:ctx_<id> --type handoff \
  --subject "<KEY> vòng 2" --body-file /tmp/<key>-fix2.md
```

Receipt trả `delivery=follow_up dispatchId=ctx_<mới> taskId=task_<mới>` — **dispatch id mới**, ghi vào `handoff.md`. Cùng worktree/nhánh nên commit mới nằm đúng nhánh (rule dev §5).

**Dọn tài nguyên** — worker không tự xoá worktree/terminal:

```bash
orca orchestration worker-release --dispatch ctx_<id>            # đóng terminal, giữ transcript
orca worktree rm --worktree path:<path> --force --delete-branch  # chỉ khi không cần nhánh nữa
orca terminal close --terminal $H
```

`worker-release` trả `retained reason=ownership_transferred` khi `send` đã chuyển quyền terminal cho task mới — bình thường, không phải lỗi.

## Jira qua orca

Bot không có `mcp-atlassian`. Mọi thao tác Jira TMS đi qua `orca jira`, **phải chỉ định site** (mặc định đang trỏ `dtc-vif`, không phải fumysolution):

```bash
SITE=uzBpLCpVbNAUuJOzz1vwivWT   # fumysolution
orca jira issue ITMS-411 --site $SITE
orca jira status list ITMS-411 --site $SITE
orca jira status set ITMS-411 --site $SITE --to "IN DEVELOP"
orca jira comment add ITMS-411 --site $SITE --body-file /tmp/cmt.md
```

Không có `--site`: trả `Issue does not exist or you do not have permission to see it` — gây hiểu sai là không có quyền.

## Sau khi worker xong

- Đọc worktree path/kết quả trong mail, kiểm chứng bằng chứng rồi ghi artifact (`handoff.md`/`verdict.md`) theo FLOW.md. Không merge/push thay worker trừ khi spec giao.
- FAIL: `send --type handoff` cho worker cũ (cùng worktree/nhánh), tăng "Lần bàn giao" và ghi dispatch id mới vào artifact. Không tạo worktree thứ hai.
- Xong task: `worker-release` từng dispatch, `worktree rm --delete-branch` nếu nhánh đã merge, `terminal close` handle coordinator.

## Bẫy đã gặp thật

| Triệu chứng | Nguyên nhân | Cách đúng |
|---|---|---|
| `no_active_sender_terminal` | session bot không có `ORCA_TERMINAL_HANDLE` | tự tạo terminal + `--from $H` (§Precondition) |
| Branch ra `hvantoan/<name>` | `worker-start --worktree new-child` tự prefix | `worktree create --branch fix/ITMS-…` trước |
| `check --from` → `invalid_argument` | `check`/`inbox` chỉ nhận `--terminal` | `--terminal $H` (tiêu thụ) hoặc `run:<runId> --peek` |
| `check --terminal run:<id>` → `stable_pane_required` | run mailbox không có pane sống | đọc tiêu thụ bằng `--terminal $H`; xem lại bằng `inbox --terminal run:<id>` |
| Jira báo không có quyền | thiếu `--site` (mặc định dtc-vif) | `--site uzBpLCpVbNAUuJOzz1vwivWT` |
| `worktree create --reference ITMS-411` fail `not-found` | cần site cho bare key | thêm `--reference-site $SITE`, hoặc bỏ reference (vô hại) |
| `worker-read` trả "No terminal output returned" | terminal đã release nhưng có transcript chưa index | `worker-show` trước; nội dung thật nằm trong mail `worker_done` |
| Receipt `warning=...could not make it discoverable` | chỉ là không focus được tab | bỏ qua, không retry |

## Không làm

- Không dùng bridge ngoài Orca: mọi dispatch đi qua `orca orchestration worker-start`.
- Không để worker gọi stack script hoặc tự bật server trong worktree.
- Không poll trạng thái worker trong cùng lượt.
- Không tạo worker thứ hai cho cùng một việc khi worker cũ còn chạy.
- Không đưa secret/token vào spec.
