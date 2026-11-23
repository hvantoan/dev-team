# Scrum config — chatbotx

- Nhịp sprint: **1 tuần (Mon–Fri)** theo `SCRUM.md` §2.
- Sprint đầu: `2026-W48` — bắt đầu Mon 2026-11-23, kết thúc Fri 2026-11-27.
- PO: anh Văn Toàn. Chỉ PO đổi nhịp/ngày bắt đầu; mọi thay đổi ghi tại đây.
- Daily: async, cập nhật `sprint-<YYYY-Www>/board.md` + báo PO 3 dòng (đang làm / chờ ai / chặn) khi có thay đổi.
- Gate kiểm thử (PO duyệt 2026-11-23): local chỉ `pnpm lint` + `pnpm check-types`; **không** `pnpm test` local — test chạy trên CI `.github/workflows/ci.yml` mọi PR. `verdict.md` ghi link CI run; QA vẫn kiểm chứng độc lập UI/API/DB. Chỉ áp dụng chatbotx, TMS không đổi.
