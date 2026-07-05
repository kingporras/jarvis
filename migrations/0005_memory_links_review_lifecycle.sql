ALTER TABLE memory_items ADD COLUMN review_due_at TEXT;
ALTER TABLE memory_items ADD COLUMN last_reviewed_at TEXT;

CREATE INDEX IF NOT EXISTS idx_memory_items_owner_review_due
ON memory_items(owner_subject, review_due_at);

CREATE INDEX IF NOT EXISTS idx_memory_links_memory
ON memory_links(source_memory_id);

CREATE INDEX IF NOT EXISTS idx_memory_links_target
ON memory_links(target_type, target_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_memory_links_unique_target
ON memory_links(source_memory_id, target_type, target_id);
