-- Fixed local QA seed for TMS (tenant tuanvudev + QA accounts).
-- Credentials must NEVER be hardcoded here; pass via psql -v from tests/tms/.env:
--   app_tenant, app_username, app_password_hash,
--   qa_viewer_username, qa_viewer_password_hash

BEGIN;

INSERT INTO public.tenant (id, code, name, is_active, expired_date)
VALUES (
  '01SEEDTENANTTUANVUDEV00001',
  lower(trim(:'app_tenant')),
  'Tuan Vu Dev (Local QA)',
  true,
  '2099-12-31T23:59:59Z'::timestamptz
)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  is_active = true,
  expired_date = EXCLUDED.expired_date;

INSERT INTO public.role (
  id, tenant_id, code, name, search_name, permissions,
  is_active, is_deleted, created_at, modified_at
)
SELECT
  '01SEEDROLEADMIN00000000001',
  t.id,
  'admin',
  'Admin',
  'admin',
  '["*"]'::jsonb,
  true,
  false,
  now(),
  now()
FROM public.tenant t
WHERE t.code = lower(trim(:'app_tenant'))
ON CONFLICT (tenant_id, code) DO UPDATE
SET
  name = EXCLUDED.name,
  search_name = EXCLUDED.search_name,
  permissions = EXCLUDED.permissions,
  is_active = true,
  is_deleted = false,
  modified_at = now();

INSERT INTO public.role (
  id, tenant_id, code, name, search_name, permissions,
  is_active, is_deleted, created_at, modified_at
)
SELECT
  '01SEEDROLEQAVIEWER00000001',
  t.id,
  'qa-viewer',
  'QA Viewer',
  'qa viewer',
  '["do_r","diso_r","cusdeb_r"]'::jsonb,
  true,
  false,
  now(),
  now()
FROM public.tenant t
WHERE t.code = lower(trim(:'app_tenant'))
ON CONFLICT (tenant_id, code) DO UPDATE
SET
  name = EXCLUDED.name,
  search_name = EXCLUDED.search_name,
  permissions = EXCLUDED.permissions,
  is_active = true,
  is_deleted = false,
  modified_at = now();

INSERT INTO public."user" (
  id, tenant_id, username, password, name, search_name,
  is_active, is_admin, is_deleted, created_at, modified_at, role_users
)
SELECT
  '01SEEDUSERQAADMIN000000001',
  t.id,
  lower(trim(:'app_username')),
  :'app_password_hash',
  'QA Admin',
  'qa admin',
  true,
  true,
  false,
  now(),
  now(),
  r.id
FROM public.tenant t
JOIN public.role r ON r.tenant_id = t.id AND r.code = 'admin'
WHERE t.code = lower(trim(:'app_tenant'))
ON CONFLICT (tenant_id, username) DO UPDATE
SET
  password = EXCLUDED.password,
  is_active = true,
  is_admin = true,
  is_deleted = false,
  modified_at = now(),
  role_users = EXCLUDED.role_users;

INSERT INTO public."user" (
  id, tenant_id, username, password, name, search_name,
  is_active, is_admin, is_deleted, created_at, modified_at, role_users
)
SELECT
  '01SEEDUSERQAVIEWER00000001',
  t.id,
  lower(trim(:'qa_viewer_username')),
  :'qa_viewer_password_hash',
  'QA Viewer',
  'qa viewer',
  true,
  false,
  false,
  now(),
  now(),
  r.id
FROM public.tenant t
JOIN public.role r ON r.tenant_id = t.id AND r.code = 'qa-viewer'
WHERE t.code = lower(trim(:'app_tenant'))
ON CONFLICT (tenant_id, username) DO UPDATE
SET
  password = EXCLUDED.password,
  is_active = true,
  is_admin = false,
  is_deleted = false,
  modified_at = now(),
  role_users = EXCLUDED.role_users;

COMMIT;
