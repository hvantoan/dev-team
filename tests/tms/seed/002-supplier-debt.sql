-- QA seed: dữ liệu công nợ NCC tối thiểu cho màn /supplier-debt (tenant tuanvudev).
--
-- Mục đích: mở được dialog "Lịch sử giao dịch" (nơi chứa nút "Tính lại công nợ NCC",
-- ProtectedElement supdeb_rc) để QA kiểm ẩn/hiện nút theo quyền — xem AC11 trong
-- reports/tms/qa/group-permission-system/verdict.md.
--
-- Vì sao chọn opening balance (3 bảng, ít nhất mà vẫn đúng nghiệp vụ):
--   - Phiếu chi (PaymentVoucher) hoặc hợp đồng phụ (Subcontract) kéo theo nhiều
--     bảng/FK khác (phương thức thanh toán, đơn hàng, dòng chi tiết, trạng thái duyệt).
--   - Opening balance chỉ cần: partner (nhóm Supplier) -> partner_opening_balance
--     -> supplier_tracking (document_type='OpeningBalance').
--   - BẮT BUỘC phải có cả partner_opening_balance: worker reconcile
--     (supplier_debt.reconcile.go) suy row canonical 'OpeningBalance' TỪ bảng này —
--     nếu chỉ có supplier_tracking lẻ, một lần recalc có thể coi nó là row mồ côi.
--   - supplier_tracking insert sẵn is_updated=true + before/after đã tính = trạng
--     thái sau khi worker tính xong, vì List/History chỉ đọc row is_updated=true.
--
-- Ngày chứng từ = đầu tháng chạy seed (date_trunc('month', now())): filter mặc định
-- của màn là "đầu tháng hiện tại -> cuối hôm nay" + type='in_period', nên row luôn
-- lọt kỳ đang xem. Lần chạy lại sau này không đổi ngày đã ghi (ON CONFLICT bỏ qua).
--
-- Idempotent tuyệt đối: mọi INSERT đều ON CONFLICT ... DO NOTHING; không UPDATE,
-- không DELETE, không đụng dữ liệu có sẵn. Chạy lại N lần chỉ báo skip.
--
-- Cách chạy (sau khi đã chạy 001):
--   set -a && . tests/tms/.env && set +a
--   psql "$DATABASE_URL" -v app_tenant="$APP_TENANT" -f tests/tms/seed/002-supplier-debt.sql
-- (biến app_tenant giống seed 001; chỉ cần tenant tồn tại — file tự resolve tenant_id
--  theo tenant.code, KHÔNG cần user/password).
--
-- Kết quả mong đợi trên UI: list có 1 NCC "QA-NCC-01 - NCC QA Công nợ (seed)",
-- nợ đầu/phát sinh/cuối kỳ = 15.000.000; click dòng -> dialog lịch sử có 1 dòng
-- chứng từ "DK-QA-NCC-01" loại OpeningBalance.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Partner nhóm Supplier (list chỉ đọc partner có groups @> '["Supplier"]').
--    Unique thật: (tenant_id, code). Pin cả id để các bước sau chỉ gắn vào đúng
--    partner fixture này — nếu code đã bị chiếm bởi id khác thì skip sạch, không lỗi.
-- ---------------------------------------------------------------------------
INSERT INTO public.partner (
  id, tenant_id, code, name,
  search_code, search_name, groups,
  description, is_deleted,
  created_at, created_by, modified_at, modified_by
)
SELECT
  '01SEEDNCCSUPPLIER000000001',
  t.id,
  'QA-NCC-01',
  'NCC QA Công nợ (seed)',
  'qa-ncc-01',
  'ncc qa cong no (seed)',
  '["Supplier"]'::jsonb,
  'Fixture QA: supplier tối thiểu cho màn /supplier-debt (AC11 supdeb_rc).',
  false,
  now(), '01SEEDUSERQAADMIN000000001',
  now(), '01SEEDUSERQAADMIN000000001'
FROM public.tenant t
WHERE t.code = lower(trim(:'app_tenant'))
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2) Opening balance phía Supplier của partner đó.
--    Unique thật: (tenant_id, partner_id, partner_type). partner_type='Supplier',
--    balance_type='DEBT' (enum OpeningBalanceType_Debt => phát sinh cột debt).
-- ---------------------------------------------------------------------------
INSERT INTO public.partner_opening_balance (
  id, tenant_id, partner_id,
  partner_type, balance_type, amount, tracking_date,
  note, is_deleted,
  created_at, created_by, modified_at, modified_by
)
SELECT
  '01SEEDPOBSUPPLIER000000001',
  p.tenant_id,
  p.id,
  'Supplier',
  'DEBT',
  15000000,
  date_trunc('month', now()),
  'QA seed: số dư đầu kỳ NCC cho fixture /supplier-debt.',
  false,
  now(), '01SEEDUSERQAADMIN000000001',
  now(), '01SEEDUSERQAADMIN000000001'
FROM public.partner p
JOIN public.tenant t ON t.id = p.tenant_id
WHERE t.code = lower(trim(:'app_tenant'))
  AND p.code = 'QA-NCC-01'
  AND p.id = '01SEEDNCCSUPPLIER000000001'
ON CONFLICT (tenant_id, partner_id, partner_type) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3) Dòng ledger supplier_tracking 'OpeningBalance' đã settle (is_updated=true).
--    Unique thật: (tenant_id, document_type, document_id, partner_id).
--    document_id trỏ đúng pob id, document_code='DK-<code>' — y hệt BE ghi.
--    debt=15.000.000 (balance_type DEBT), before=0 -> after=15.000.000;
--    balance_* = 0. Row này làm supplier hiện ở mọi bộ lọc (kể cả in_period).
-- ---------------------------------------------------------------------------
INSERT INTO public.supplier_tracking (
  id, tenant_id, partner_id,
  document_type, document_id, document_code, source_id, date,
  debt_before, debt, debt_after,
  balance_before, balance, balance_after,
  is_updated, is_deleted, retry_count, last_error,
  created_at, created_by, modified_at, modified_by
)
SELECT
  '01SEEDSUPTRACKING000000001',
  pob.tenant_id,
  pob.partner_id,
  'OpeningBalance',
  pob.id,
  'DK-' || p.code,
  NULL,
  pob.tracking_date,
  0, 15000000, 15000000,
  0, 0, 0,
  true, false, 0, NULL,
  now(), '01SEEDUSERQAADMIN000000001',
  now(), '01SEEDUSERQAADMIN000000001'
FROM public.partner_opening_balance pob
JOIN public.partner p ON p.id = pob.partner_id
WHERE pob.id = '01SEEDPOBSUPPLIER000000001'
  AND pob.is_deleted = false
ON CONFLICT (tenant_id, document_type, document_id, partner_id) DO NOTHING;

COMMIT;
