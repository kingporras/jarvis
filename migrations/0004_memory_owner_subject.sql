ALTER TABLE memory_items ADD COLUMN owner_subject TEXT NOT NULL DEFAULT '__legacy_unowned__';
ALTER TABLE memory_items ADD COLUMN archived_at TEXT;

CREATE INDEX IF NOT EXISTS idx_memory_items_owner_updated
ON memory_items(owner_subject, updated_at);

CREATE INDEX IF NOT EXISTS idx_memory_items_owner_status
ON memory_items(owner_subject, status);

CREATE INDEX IF NOT EXISTS idx_memory_items_owner_type
ON memory_items(owner_subject, type);

CREATE INDEX IF NOT EXISTS idx_memory_items_owner_priority
ON memory_items(owner_subject, priority);
