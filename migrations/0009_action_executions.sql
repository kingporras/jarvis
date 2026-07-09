CREATE TABLE IF NOT EXISTS action_executions (
  id TEXT PRIMARY KEY,
  owner_subject TEXT NOT NULL,
  action_type TEXT NOT NULL,
  source_request_id TEXT,
  proposal_id TEXT,
  status TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  summary TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  result_json TEXT,
  warnings_json TEXT,
  error_code TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_action_executions_owner_created
ON action_executions(owner_subject, created_at);

CREATE INDEX IF NOT EXISTS idx_action_executions_owner_type
ON action_executions(owner_subject, action_type);
