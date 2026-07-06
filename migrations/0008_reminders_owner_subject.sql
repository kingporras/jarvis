ALTER TABLE reminders ADD COLUMN owner_subject TEXT NOT NULL DEFAULT '__legacy_unowned__';
ALTER TABLE reminders ADD COLUMN due_at TEXT;
ALTER TABLE reminders ADD COLUMN priority TEXT NOT NULL DEFAULT 'P2';
ALTER TABLE reminders ADD COLUMN completed_at TEXT;
ALTER TABLE reminders ADD COLUMN dismissed_at TEXT;

UPDATE reminders
SET due_at = remind_at
WHERE due_at IS NULL
  AND remind_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reminders_owner_due
ON reminders(owner_subject, due_at);

CREATE INDEX IF NOT EXISTS idx_reminders_owner_status
ON reminders(owner_subject, status);

CREATE INDEX IF NOT EXISTS idx_reminders_owner_priority
ON reminders(owner_subject, priority);

CREATE INDEX IF NOT EXISTS idx_reminders_owner_updated
ON reminders(owner_subject, updated_at);
