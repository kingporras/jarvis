ALTER TABLE projects ADD COLUMN owner_subject TEXT NOT NULL DEFAULT '__legacy_unowned__';
ALTER TABLE projects ADD COLUMN completed_at TEXT;
ALTER TABLE projects ADD COLUMN archived_at TEXT;

ALTER TABLE tasks ADD COLUMN owner_subject TEXT NOT NULL DEFAULT '__legacy_unowned__';
ALTER TABLE tasks ADD COLUMN completed_at TEXT;

CREATE INDEX IF NOT EXISTS idx_projects_owner_updated
ON projects(owner_subject, updated_at);

CREATE INDEX IF NOT EXISTS idx_projects_owner_status_priority
ON projects(owner_subject, status, priority);

CREATE INDEX IF NOT EXISTS idx_tasks_owner_updated
ON tasks(owner_subject, updated_at);

CREATE INDEX IF NOT EXISTS idx_tasks_owner_status_priority
ON tasks(owner_subject, status, priority);

CREATE INDEX IF NOT EXISTS idx_tasks_owner_project
ON tasks(owner_subject, project_id);
