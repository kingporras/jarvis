ALTER TABLE decisions ADD COLUMN owner_subject TEXT NOT NULL DEFAULT '__legacy_unowned__';
ALTER TABLE decisions ADD COLUMN context TEXT;
ALTER TABLE decisions ADD COLUMN outcome TEXT;
ALTER TABLE decisions ADD COLUMN rationale TEXT;
ALTER TABLE decisions ADD COLUMN status TEXT NOT NULL DEFAULT 'decided';
ALTER TABLE decisions ADD COLUMN priority TEXT NOT NULL DEFAULT 'P2';
ALTER TABLE decisions ADD COLUMN archived_at TEXT;

CREATE INDEX IF NOT EXISTS idx_decisions_owner_updated
ON decisions(owner_subject, updated_at);

CREATE INDEX IF NOT EXISTS idx_decisions_owner_status
ON decisions(owner_subject, status);

CREATE INDEX IF NOT EXISTS idx_decisions_owner_priority
ON decisions(owner_subject, priority);

CREATE INDEX IF NOT EXISTS idx_decisions_owner_project
ON decisions(owner_subject, project_id);
