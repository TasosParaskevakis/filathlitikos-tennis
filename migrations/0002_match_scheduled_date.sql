-- Adds an optional scheduled_date (YYYY-MM-DD string) to matches so the
-- admin can plan day-of-play and find all matches scheduled for a given day.
ALTER TABLE matches ADD COLUMN scheduled_date TEXT;
CREATE INDEX idx_matches_scheduled_date ON matches(scheduled_date);
