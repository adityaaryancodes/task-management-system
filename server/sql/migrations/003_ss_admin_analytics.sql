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

CREATE INDEX IF NOT EXISTS idx_screenshots_org_user_captured_at ON screenshots(org_id, user_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_org_date ON daily_productivity_summaries(org_id, summary_date DESC);
