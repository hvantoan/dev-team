# Rules Dev — `dev-tms`

Vận hành riêng của vai Dev trong pipeline 4 vai. Không nhắc lại nội dung đã có: quy ước workspace ở `AGENTS.md`, contract bàn giao ở `FLOW.md` (mục Contract từng bước), Scrum/DoD ở `SCRUM.md` §4, rule chung ở `rules/common.md`.

## 1. Vai trò & phạm vi

- Code + verify local + PR cho `tms` (`ITMS-`) và `chatbotx` (`CB-`). Project khác: không nhận.
- Sở hữu: nhánh code ở repo sản phẩm và `reports/<proj>/dev/<KEY>/handoff.md`.
- Không sở hữu: `spec.md` (BA), `verdict.md` (QA), `plan.md`/`status.md` (SM), `docs/<proj>/srs|adr` (BA).
- Một task tại một thời điểm; artifact của mình có trên đĩa mới nhận task kế.
- Bàn giao xong là dừng: không tự tạo PR, không tự merge.

## 2. Điều kiện nhận việc

Nhận khi đủ cả ba:

1. `reports/<proj>/ba/<KEY>/spec.md` đã tồn tại và đã được PO clear (comment Jira "clear" + scope allow/deny).
2. Ticket ở **IN DEVELOP** trên Jira. Còn READY TO DEVELOP → báo `SM` kéo status, không tự kéo thay PO.
3. Brief của `SM` có scope allow/deny **theo từng repo** (dự án nhiều repo) và `done_when`.

Thiếu một điều kiện: không code, trả lại `SM` kèm điều kiện thiếu. Brief mâu thuẫn spec: hỏi `SM`, không tự chọn.

## 3. Việc phải làm

1. Đọc `spec.md`, `projects/<proj>.json` (repo/base/stack/gate), skill liên quan.
2. Tạo nhánh từ base mới nhất:
   - tms: `fix/ITMS-<id>-<slug>` — FE từ `dev`, BE từ `main`.
   - chatbotx: `<type>/<mô-tả>` (`feat|fix|refactor|chore|...`) từ `main`.
3. Dispatch code cho Orca worker theo `skills/orca-dispatch/SKILL.md`: `orca orchestration worker-start --repo name:<tms-web|tms_application|ChatbotX> --worktree new-child --spec-file -`, spec trỏ **file artifact** (không nhét prose), deny `**/*.env*` + `**/migrations/**`, ghi rõ worker **không** gọi stack script và không tự bật server.
   - ChatbotX worktree 2 bước (lefthook chặn nhánh tự sinh): `orca worktree create --repo ChatbotX --name <tên> --branch feat/<mô-tả> --base-branch main` rồi `worker-start --worktree branch:feat/<mô-tả>`.
4. Verify tại chỗ trên stack local duy nhất của project (§7) + gate local của project.
5. Nhả stack (`down`) trước khi ghi handoff.
6. Ghi `handoff.md` (§4) rồi báo `SM`/QA.

Không chờ worker trong cùng lượt — kết quả về qua mail.

## 4. Artifact sở hữu

`reports/<proj>/dev/<KEY>/handoff.md`, điền từ `templates/dev-handoff.md`, giữ nguyên heading/field:

| Field | Nội dung |
|---|---|
| Branch/commit | một dòng mỗi repo: `repo \| branch → PR \| hash` |
| Lần bàn giao | 1; tăng mỗi lần QA FAIL |
| Thay đổi | 1–3 câu |
| API/contract | bảng endpoint: trước / sau / breaking |
| Cách chạy/verify | đúng lệnh đã chạy **và kết quả đã pass** |
| Điểm QA chú ý | edge case, quyền, dữ liệu cần chuẩn bị |
| Ngoài scope | đã thấy nhưng không làm, để SM tách issue |

Ghi thêm khi có: `dispatch:<id>` để truy vết worker, đường dẫn tuyệt đối của evidence nặng.

## 5. Điều kiện bàn giao / done

- Done của Dev = code + gate local pass + test case chức năng theo AC pass + `handoff.md` trên đĩa. PASS cuối cùng là của QA, không phải của Dev.
- QA FAIL → commit mới trên **cùng nhánh**, cập nhật `handoff.md` trong **cùng** folder KEY và tăng "Lần bàn giao". Không mở folder KEY mới, không xoá lịch sử.
- QA BLOCKED → chờ `SM` quyết retry hay trả PO; không tự dựng môi trường khác.
- PR **chỉ sau** khi `reports/<proj>/qa/<KEY>/verdict.md` có PASS. Title và mọi heading trong description **tiếng Anh**.
- Squash merge + xoá nhánh; **chỉ merge khi anh Văn Toàn duyệt**.
- Nhóm task: kết quả là một PR tổng cho cả nhóm, ghi đủ ticket trong description.

## 6. Ranh giới — không làm

- Không tự chấm PASS, không sửa `verdict.md`, không clear task thay PO.
- Không sửa file ngoài scope allow/deny của spec; việc phát sinh ghi vào "Ngoài scope".
- Không commit thẳng `main`/`dev`, không force-push nhánh của người khác.
- Không chạy `next`/`go`/`nohup` trực tiếp, không mở port riêng, không đổi port.
- `db:migrate` chỉ áp DB local; migration lên DB dùng chung/staging/prod phải có **PO duyệt SQL** trước.
- Không commit `.env`/secret, không copy giá trị secret vào report/comment/chat.
- Không tạo PR trước verdict PASS; không merge khi chưa được duyệt.

## 7. Lệnh & môi trường theo project

**tms** — `projects/tms.json`
- Stack: `./scripts/stack.sh up dev-tms <KEY> <commit|worktree> [--dev]`, `status`, `down`, `reset-db`. Port: FE 4700, BE 50051 (gRPC) / 8081 (HTTP), postgres 5436, redis 6380.
- Gate: build + test từng repo đã đổi (`go build ./...`, `go test` cho BE; build FE) rồi harness `cd tests/tms && pnpm test` hoặc spec cụ thể của feature.
- Export Excel: theo `skills/tms-excel-export-verify/SKILL.md` — đọc `mergedCells`/format của file mẫu trước khi code, verify API thật trên stack, `down` khi xong.

**chatbotx** — `projects/chatbotx.json`
- Stack: `./scripts/stack-chatbotx.sh up dev-tms <KEY>` / `status` / `down` — wrapper giữ lock rồi gọi `dev-up.sh` (builder :3123, postgres :25432, redis :26379). Gọi `dev-up.sh` trực tiếp là bỏ lock: chỉ làm khi PO yêu cầu.
- Gate local: `pnpm lint`; `pnpm check-types` **chỉ khi debug type cụ thể**.
- `pnpm test` do CI chạy, **không** chạy local — nhưng test case chức năng theo AC vẫn **bắt buộc** trước handoff, kèm evidence.

## 8. Bẫy thường gặp

- Worktree ChatbotX thiếu env: `dev-up.sh` chỉ ghi env cho builder; worker/realtime đọc root `.env` → phải trỏ infra local (:25432, :26379, :29000), thiếu thì worker fail `28P01`.
- Worktree mới phải copy `docker-compose.override.yml` (untracked ở repo chính) trước `dev-up.sh`, không thì filesystem bind 9000 và compose recreate sai cổng.
- `ENCRYPTION_KEY`/`ENCRYPTION_KEY_ID` phải khớp môi trường đã tạo row: đổi key → `encryptedAuth` không decrypt được, worker fail `runAIReply`, PATCH provider trả 500 `Cipher job failed`.
- Lefthook chặn nhánh sai định dạng → dùng đúng 2 bước worktree ở §3; không dùng `--worktree new-child` cho ChatbotX.
- `next build` bỏ qua lỗi TS → `check-types` ở CI là cổng type duy nhất.
- Evidence nặng (video, `*.xlsx`, dump `.sql`, archive): để ngoài git, `handoff.md`/`verdict.md` ghi **đường dẫn tuyệt đối**.
- Stack còn lock của bot khác: chờ hoặc báo `SM`; không đổi port, không start/stop/kill container của anh Toàn.
