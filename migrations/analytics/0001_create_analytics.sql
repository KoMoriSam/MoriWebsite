CREATE TABLE analytics_totals (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  total_visits INTEGER NOT NULL DEFAULT 0 CHECK (total_visits >= 0),
  total_reads INTEGER NOT NULL DEFAULT 0 CHECK (total_reads >= 0),
  started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO analytics_totals (id) VALUES (1);

CREATE TABLE analytics_daily (
  stat_date TEXT PRIMARY KEY,
  visits INTEGER NOT NULL DEFAULT 0 CHECK (visits >= 0),
  reads INTEGER NOT NULL DEFAULT 0 CHECK (reads >= 0),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) WITHOUT ROWID;

CREATE TABLE analytics_content (
  content_type TEXT NOT NULL CHECK (content_type IN ('article', 'novel')),
  content_id TEXT NOT NULL,
  reads INTEGER NOT NULL DEFAULT 0 CHECK (reads >= 0),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (content_type, content_id)
) WITHOUT ROWID;

CREATE TABLE analytics_events (
  id INTEGER PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('visit', 'read')),
  content_type TEXT NOT NULL DEFAULT '',
  content_id TEXT NOT NULL DEFAULT '',
  stat_date TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  CHECK (
    (event_type = 'visit' AND content_type = '' AND content_id = '')
    OR
    (
      event_type = 'read'
      AND content_type IN ('article', 'novel')
      AND length(content_id) BETWEEN 1 AND 128
    )
  ),
  UNIQUE (session_id, event_type, content_type, content_id)
);

CREATE TRIGGER analytics_visit_after_insert
AFTER INSERT ON analytics_events
WHEN NEW.event_type = 'visit'
BEGIN
  UPDATE analytics_totals
  SET
    total_visits = total_visits + 1,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = 1;

  INSERT INTO analytics_daily (stat_date, visits, reads)
  VALUES (NEW.stat_date, 1, 0)
  ON CONFLICT (stat_date) DO UPDATE SET
    visits = visits + 1,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');
END;

CREATE TRIGGER analytics_read_after_insert
AFTER INSERT ON analytics_events
WHEN NEW.event_type = 'read'
BEGIN
  UPDATE analytics_totals
  SET
    total_reads = total_reads + 1,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = 1;

  INSERT INTO analytics_daily (stat_date, visits, reads)
  VALUES (NEW.stat_date, 0, 1)
  ON CONFLICT (stat_date) DO UPDATE SET
    reads = reads + 1,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');

  INSERT INTO analytics_content (content_type, content_id, reads)
  VALUES (NEW.content_type, NEW.content_id, 1)
  ON CONFLICT (content_type, content_id) DO UPDATE SET
    reads = reads + 1,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');
END;
