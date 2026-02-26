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

CREATE INDEX IF NOT EXISTS idx_tasks_org_assignee_status ON tasks(org_id, assignee_user_id, status);
CREATE INDEX IF NOT EXISTS idx_attendance_org_user_login_at ON attendance(org_id, user_id, login_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_org_user_event_at ON activity_logs(org_id, user_id, event_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_org_device_event_at ON activity_logs(org_id, device_id, event_at DESC);
