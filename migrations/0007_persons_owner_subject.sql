ALTER TABLE persons ADD COLUMN owner_subject TEXT NOT NULL DEFAULT '__legacy_unowned__';
ALTER TABLE persons ADD COLUMN relationship TEXT;
ALTER TABLE persons ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE persons ADD COLUMN archived_at TEXT;

CREATE INDEX IF NOT EXISTS idx_persons_owner_updated
ON persons(owner_subject, updated_at);

CREATE INDEX IF NOT EXISTS idx_persons_owner_status
ON persons(owner_subject, status);

CREATE INDEX IF NOT EXISTS idx_persons_owner_name
ON persons(owner_subject, name);
