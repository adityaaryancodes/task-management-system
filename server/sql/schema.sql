-- Multi-tenant Hybrid Workforce Intelligence schema
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'manager', 'employee')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_users_org FOREIGN KEY (org_id) REFERENCES organizations(org_id),
  CONSTRAINT uq_users_org_email UNIQUE (org_id, email)
);

CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  user_id UUID NOT NULL,
  device_identifier VARCHAR(255) NOT NULL,
  device_name VARCHAR(120) NOT NULL,
  os_version VARCHAR(120),
  cpu_percent NUMERIC(5,2),
  memory_percent NUMERIC(5,2),
  last_seen_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_devices_org FOREIGN KEY (org_id) REFERENCES organizations(org_id),
  CONSTRAINT fk_devices_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT uq_devices_org_identifier UNIQUE (org_id, device_identifier)
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  assignee_user_id UUID NOT NULL,
  created_by_user_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed')),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_tasks_org FOREIGN KEY (org_id) REFERENCES organizations(org_id),
  CONSTRAINT fk_tasks_assignee FOREIGN KEY (assignee_user_id) REFERENCES users(id),
  CONSTRAINT fk_tasks_creator FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  user_id UUID NOT NULL,
  device_id UUID NOT NULL,
  login_at TIMESTAMPTZ NOT NULL,
  logout_at TIMESTAMPTZ,
  session_seconds INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_attendance_org FOREIGN KEY (org_id) REFERENCES organizations(org_id),
  CONSTRAINT fk_attendance_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_attendance_device FOREIGN KEY (device_id) REFERENCES devices(id)
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  user_id UUID NOT NULL,
  device_id UUID NOT NULL,
  event_at TIMESTAMPTZ NOT NULL,
  app_name VARCHAR(255) NOT NULL,
  window_title VARCHAR(255),
  activity_type VARCHAR(20) NOT NULL CHECK (activity_type IN ('active', 'idle')),
  idle_seconds INT NOT NULL DEFAULT 0,
  duration_seconds INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_activity_org FOREIGN KEY (org_id) REFERENCES organizations(org_id),
  CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_activity_device FOREIGN KEY (device_id) REFERENCES devices(id)
);

CREATE TABLE IF NOT EXISTS screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  user_id UUID NOT NULL,
  device_id UUID NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL,
  s3_key TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  file_size_bytes INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_screenshots_org FOREIGN KEY (org_id) REFERENCES organizations(org_id),
  CONSTRAINT fk_screenshots_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_screenshots_device FOREIGN KEY (device_id) REFERENCES devices(id)
);

CREATE TABLE IF NOT EXISTS plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  plan_name VARCHAR(80) NOT NULL,
  max_users INT NOT NULL DEFAULT 100,
  screenshot_interval_minutes INT NOT NULL DEFAULT 15,
  activity_retention_days INT NOT NULL DEFAULT 90,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_plan_org FOREIGN KEY (org_id) REFERENCES organizations(org_id),
  CONSTRAINT uq_plan_org UNIQUE (org_id)
);

CREATE TABLE IF NOT EXISTS user_refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  user_id UUID NOT NULL,
  device_id UUID NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_refresh_org FOREIGN KEY (org_id) REFERENCES organizations(org_id),
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_refresh_device FOREIGN KEY (device_id) REFERENCES devices(id)
);

CREATE TABLE IF NOT EXISTS daily_productivity_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  user_id UUID NOT NULL,
  summary_date DATE NOT NULL,
  active_seconds INT NOT NULL,
  idle_seconds INT NOT NULL,
  total_events INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_daily_org FOREIGN KEY (org_id) REFERENCES organizations(org_id),
  CONSTRAINT fk_daily_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT uq_daily_org_user_date UNIQUE (org_id, user_id, summary_date)
);

CREATE TABLE IF NOT EXISTS policy_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  user_id UUID NOT NULL,
  device_id UUID NOT NULL,
  app_name VARCHAR(255) NOT NULL,
  window_title VARCHAR(255),
  detected_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_policy_alerts_org FOREIGN KEY (org_id) REFERENCES organizations(org_id),
  CONSTRAINT fk_policy_alerts_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_policy_alerts_device FOREIGN KEY (device_id) REFERENCES devices(id)
);

CREATE INDEX IF NOT EXISTS idx_users_org_role ON users(org_id, role);
CREATE INDEX IF NOT EXISTS idx_devices_org_user ON devices(org_id, user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org_assignee_status ON tasks(org_id, assignee_user_id, status);
CREATE INDEX IF NOT EXISTS idx_attendance_org_user_login_at ON attendance(org_id, user_id, login_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_org_user_event_at ON activity_logs(org_id, user_id, event_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_org_device_event_at ON activity_logs(org_id, device_id, event_at DESC);
CREATE INDEX IF NOT EXISTS idx_screenshots_org_user_captured_at ON screenshots(org_id, user_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_org_date ON daily_productivity_summaries(org_id, summary_date DESC);
CREATE INDEX IF NOT EXISTS idx_policy_alerts_org_detected_at ON policy_alerts(org_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_policy_alerts_org_unresolved ON policy_alerts(org_id, resolved_at, detected_at DESC);
