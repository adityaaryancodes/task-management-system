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

CREATE INDEX IF NOT EXISTS idx_policy_alerts_org_detected_at
  ON policy_alerts (org_id, detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_policy_alerts_org_unresolved
  ON policy_alerts (org_id, resolved_at, detected_at DESC);
