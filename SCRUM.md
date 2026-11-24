# SCRUM — mô hình vận hành của team bot

Áp dụng cho mọi project trong `projects/*.json`. Contract bàn giao giữa bot vẫn ở `FLOW.md`; file này nói **ai quyết gì, sprint chạy thế nào, PO giao tiếp ở đâu**.

## 1. Vai

| Vai | Là ai | Chịu trách nhiệm |
|---|---|---|
| PO | anh Văn Toàn (một người, không phải committee) | giá trị: thứ tự backlog, clear task, duyệt merge, accept Increment, huỷ sprint |
| Scrum Master | bot `SM` | thiết lập Scrum, hiệu quả team, gỡ impediment, bảo đảm event đúng timebox |
| Developers | bot `BA` (spec, docs), `Dev` (code + verify local + PR), `QA` (verify độc lập) | biến PBI thành Increment đạt DoD |

SM **không** quyết định làm gì (PO) và **không** quyết định làm thế nào (Developers).

## 2. Sprint

- Nhịp mặc định **1 tuần (Mon–Fri)**. PO đổi nhịp thì ghi `reports/<proj>/scrum/config.md` và nêu ngày bắt đầu sprint kế tiếp.
- Artifact mỗi sprint: `reports/<proj>/scrum/sprint-<YYYY-Www>/` gồm `goal.md`, `board.md`, `review.md`, `retro.md`.
- `reports/<proj>/scrum/impediments.md` là sổ chặn của project, không reset theo sprint.
- Sprint bắt đầu khi `goal.md` có Sprint Goal; kết thúc khi `retro.md` có hành động + owner. Chỉ PO được huỷ sprint.

## 3. Event và timebox

| Event | Timebox (sprint 1 tuần) | Kết quả ghi vào |
|---|---|---|
| Sprint Planning | ≤2h | `goal.md`: Sprint Goal một câu + danh sách KEY cam kết |
| Daily | 15' (async, không họp) | `board.md` + báo PO 3 dòng: đang làm / chờ ai / đang chặn |
| Sprint Review | ≤1h | `review.md`: KEY đạt DoD, link `verdict.md`/PR, quyết định accept/trả lại |
| Sprint Retrospective | ≤45' | `retro.md`: giữ / đổi / bỏ, mỗi mục một owner; carry-over ghi lý do |

## 4. Artifact và DoD

| Scrum | Trong team |
|---|---|
| Product Backlog | ticket Jira READY TO DEVELOP / IN DEVELOP assign Văn Toàn + item `orca bot item` chưa đóng. Thứ tự do PO; SM chỉ phản ánh. |
| Sprint Backlog | `goal.md` (Sprint Goal + KEY) + `board.md` (backlog → refining → spec → clear → dev → qa → pr → staging) |
| Increment | task đạt DoD: code + gate local của project (`projects/<proj>.json` → `stack.gate.local`) + test case chức năng PASS + CI green + `verdict.md` PASS (+ PR merge khi PO duyệt) |
| Definition of Done | cổng `spec clear → handoff.md → verdict PASS` + gate local + test case chức năng + CI green; không đạt thì không trình Review |
| Outcome Done | PO xác nhận sau release — SM không tự tuyên bố |

## 5. PO ↔ team: 5 điểm chạm

| Khi nào | Kênh | PO cho | PO nhận |
|---|---|---|---|
| Refine backlog (liên tục) | Jira ticket + comment | ưu tiên, mục tiêu, ràng buộc | PBI đủ rõ để cam kết |
| Sprint Planning | chat `SM` | duyệt Sprint Goal + danh sách KEY | đề xuất cam kết từ dữ liệu sprint trước |
| Clear task | **comment Jira trên ticket** | "clear" + scope allow/deny | `spec.md` do BA viết |
| Giữa sprint | item `needs-you` + daily 3 dòng | trả lời quyết định (nút `--option` hoặc tự viết) | đang làm / chờ ai / đang chặn |
| Sprint Review | chat `SM` + `review.md` | accept, trả lại, đổi ưu tiên | Increment đạt DoD + metric flow |

**Quy tắc bắt buộc:** một quyết định chỉ có hiệu lực khi nó nằm trong artifact — comment Jira, dòng trong `goal.md`, hoặc câu trả lời trên item. Bot đọc file, không đọc chat; nói miệng mà không ghi = không tính.

Nói riêng với `ba`/`dev`/`qa` thì việc vẫn chưa tính là giao cho tới khi `sm` biết và artifact có trên đĩa.

## 6. Đo lường và cải tiến

- `review.md` mỗi sprint: throughput (KEY xong), cycle time (mở run → verdict PASS), carry-over %, số lần FAIL/BLOCKED, thời gian chờ PO.
- `retro.md` chọn **một** cải tiến vào Sprint Backlog sprint sau; cải tiến không owner = không tính.
- Số liệu để inspect, không thay empiricism: quyết định dựa trên artifact quan sát được.

## 7. Không làm

- SM không code, không verify, không duyệt merge, không clear task thay PO.
- Không bịa sprint/board trên Jira: `orca jira` không có API sprint — sprint sống bằng file.
- Không nhận output của bot/worker vì "nó nói đã xong": mọi output phải qua DoD (gate local + CI + QA độc lập).
- Không đổi `AGENTS.md`/`FLOW.md`/`templates/` ngoài một commit có PO duyệt.
