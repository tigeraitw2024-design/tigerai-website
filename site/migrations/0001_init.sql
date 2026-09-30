-- TigerAI 官網後台：資料表。
-- 這個檔是 node tools/schema-sql.mjs 從 src/api 的 schema 產生的，不要手改。
-- 要改資料表結構，去改對應的 src/api/modules/*.ts，再重新產生一次。
--
-- 正常安裝流程不需要跑這個檔：/api/auth/bootstrap 會自己照 schema 建表。
-- 產生時間：2026-09-30T18:17:46.174Z

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,            -- admin | member
  subject_id TEXT NOT NULL,      -- users.id 或 members.id
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  ip TEXT,
  agent TEXT
);

CREATE INDEX IF NOT EXISTS ix_sessions_subject ON sessions(subject_id);

CREATE INDEX IF NOT EXISTS ix_sessions_expires ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS carts (
  id TEXT PRIMARY KEY,
  member_id TEXT,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_carts_member ON carts(member_id);

CREATE TABLE IF NOT EXISTS tokens (
  id TEXT PRIMARY KEY,
  purpose TEXT NOT NULL,
  subject TEXT NOT NULL,
  payload TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_tokens_expires ON tokens(expires_at);

CREATE TABLE IF NOT EXISTS rate_limit (
  k TEXT PRIMARY KEY,
  hits INTEGER NOT NULL DEFAULT 0,
  reset_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mail_queue (
  id TEXT PRIMARY KEY,
  to_addr TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'queued',
  tries INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  sent_at TEXT
);

CREATE INDEX IF NOT EXISTS ix_mail_state ON mail_queue(state);

CREATE TABLE IF NOT EXISTS home (
  id TEXT PRIMARY KEY,
  sort INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_home_sort ON home(sort);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  sort INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  f_slug TEXT
);

CREATE INDEX IF NOT EXISTS ix_courses_sort ON courses(sort);

CREATE UNIQUE INDEX IF NOT EXISTS ux_courses_slug ON courses(f_slug);

CREATE TABLE IF NOT EXISTS course_sessions (
  id TEXT PRIMARY KEY,
  sort INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  f_course TEXT
);

CREATE INDEX IF NOT EXISTS ix_course_sessions_sort ON course_sessions(sort);

CREATE INDEX IF NOT EXISTS ix_course_sessions_course ON course_sessions(f_course);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sort INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  f_slug TEXT
);

CREATE INDEX IF NOT EXISTS ix_products_sort ON products(sort);

CREATE UNIQUE INDEX IF NOT EXISTS ux_products_slug ON products(f_slug);

CREATE TABLE IF NOT EXISTS consultants (
  id TEXT PRIMARY KEY,
  sort INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_consultants_sort ON consultants(sort);

CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  sort INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_cases_sort ON cases(sort);

CREATE TABLE IF NOT EXISTS dept_cases (
  id TEXT PRIMARY KEY,
  sort INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_dept_cases_sort ON dept_cases(sort);

CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,
  sort INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_workflows_sort ON workflows(sort);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  sort INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  f_slug TEXT,
  f_published_at TEXT
);

CREATE INDEX IF NOT EXISTS ix_posts_sort ON posts(sort);

CREATE UNIQUE INDEX IF NOT EXISTS ux_posts_slug ON posts(f_slug);

CREATE INDEX IF NOT EXISTS ix_posts_publishedAt ON posts(f_published_at);

CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  sort INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  f_slug TEXT
);

CREATE INDEX IF NOT EXISTS ix_resources_sort ON resources(sort);

CREATE UNIQUE INDEX IF NOT EXISTS ux_resources_slug ON resources(f_slug);

CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY,
  sort INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_partners_sort ON partners(sort);

CREATE TABLE IF NOT EXISTS banners (
  id TEXT PRIMARY KEY,
  sort INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_banners_sort ON banners(sort);

CREATE TABLE IF NOT EXISTS booking_slots (
  id TEXT PRIMARY KEY,
  sort INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  f_start_at TEXT
);

CREATE INDEX IF NOT EXISTS ix_booking_slots_sort ON booking_slots(sort);

CREATE INDEX IF NOT EXISTS ix_booking_slots_startAt ON booking_slots(f_start_at);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  sort INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  f_code TEXT,
  f_slot TEXT,
  f_email TEXT
);

CREATE INDEX IF NOT EXISTS ix_bookings_sort ON bookings(sort);

CREATE UNIQUE INDEX IF NOT EXISTS ux_bookings_code ON bookings(f_code);

CREATE INDEX IF NOT EXISTS ix_bookings_slot ON bookings(f_slot);

CREATE INDEX IF NOT EXISTS ix_bookings_email ON bookings(f_email);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  sort INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  f_email TEXT
);

CREATE INDEX IF NOT EXISTS ix_leads_sort ON leads(sort);

CREATE UNIQUE INDEX IF NOT EXISTS ux_leads_email ON leads(f_email);

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  sort INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  f_email TEXT
);

CREATE INDEX IF NOT EXISTS ix_members_sort ON members(sort);

CREATE UNIQUE INDEX IF NOT EXISTS ux_members_email ON members(f_email);

CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  sort INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  f_member TEXT,
  f_course TEXT,
  f_session TEXT
);

CREATE INDEX IF NOT EXISTS ix_enrollments_sort ON enrollments(sort);

CREATE INDEX IF NOT EXISTS ix_enrollments_member ON enrollments(f_member);

CREATE INDEX IF NOT EXISTS ix_enrollments_course ON enrollments(f_course);

CREATE INDEX IF NOT EXISTS ix_enrollments_session ON enrollments(f_session);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  sort INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  f_code TEXT,
  f_member TEXT,
  f_buyer_email TEXT
);

CREATE INDEX IF NOT EXISTS ix_orders_sort ON orders(sort);

CREATE UNIQUE INDEX IF NOT EXISTS ux_orders_code ON orders(f_code);

CREATE INDEX IF NOT EXISTS ix_orders_member ON orders(f_member);

CREATE INDEX IF NOT EXISTS ix_orders_buyerEmail ON orders(f_buyer_email);

CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  sort INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  f_code TEXT
);

CREATE INDEX IF NOT EXISTS ix_coupons_sort ON coupons(sort);

CREATE UNIQUE INDEX IF NOT EXISTS ux_coupons_code ON coupons(f_code);

CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  sort INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  f_key TEXT,
  f_folder TEXT
);

CREATE INDEX IF NOT EXISTS ix_media_sort ON media(sort);

CREATE UNIQUE INDEX IF NOT EXISTS ux_media_key ON media(f_key);

CREATE INDEX IF NOT EXISTS ix_media_folder ON media(f_folder);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  sort INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  f_email TEXT
);

CREATE INDEX IF NOT EXISTS ix_users_sort ON users(sort);

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email ON users(f_email);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  sort INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  f_at TEXT
);

CREATE INDEX IF NOT EXISTS ix_audit_log_sort ON audit_log(sort);

CREATE INDEX IF NOT EXISTS ix_audit_log_at ON audit_log(f_at);

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  sort INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_settings_sort ON settings(sort);
