-- Migration 0001: Initial schema for Fisk Media backend
-- Run with: wrangler d1 migrations apply fisk-media-db [--local]

-- -------------------------------------------------------
-- folders
-- Mirrors the Google Drive root folders (13 folders).
-- sort_order: global display position (admin-controlled).
-- visible: soft-hide from students without deleting.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS folders (
  id          TEXT PRIMARY KEY,          -- Google Drive folder ID
  name        TEXT NOT NULL,             -- Display name shown to students
  drive_name  TEXT NOT NULL,             -- Original Drive folder name
  kind        TEXT NOT NULL CHECK (kind IN ('audio', 'video')),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  visible     INTEGER NOT NULL DEFAULT 1 CHECK (visible IN (0, 1)),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- -------------------------------------------------------
-- subfolders
-- Subfolders discovered inside each root folder.
-- path_key: slash-joined path relative to root (e.g. "Unit 1 / Track 01")
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS subfolders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  folder_id   TEXT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  path_key    TEXT NOT NULL,             -- e.g. "Unit 1 / Lessons"
  name        TEXT NOT NULL,             -- last segment of the path
  sort_order  INTEGER NOT NULL DEFAULT 0,
  visible     INTEGER NOT NULL DEFAULT 1 CHECK (visible IN (0, 1)),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (folder_id, path_key)
);

-- -------------------------------------------------------
-- videos
-- Individual media files (audio and video) from Drive.
-- drive_file_id: the Google Drive file ID for streaming.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS videos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  drive_file_id TEXT NOT NULL UNIQUE,    -- Google Drive file ID
  folder_id     TEXT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  subfolder_id  INTEGER REFERENCES subfolders(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,           -- Display title
  drive_name    TEXT NOT NULL,           -- Original file name from Drive
  mime_type     TEXT NOT NULL DEFAULT '',
  kind          TEXT NOT NULL CHECK (kind IN ('audio', 'video')),
  size_bytes    INTEGER,                 -- NULL if unknown
  modified_time TEXT,                   -- ISO string from Drive
  sort_order    INTEGER NOT NULL DEFAULT 0,
  visible       INTEGER NOT NULL DEFAULT 1 CHECK (visible IN (0, 1)),
  metadata      TEXT NOT NULL DEFAULT '{}',  -- JSON blob for extra Drive metadata
  available     INTEGER NOT NULL DEFAULT 1 CHECK (available IN (0, 1)),  -- false = removed from Drive
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_videos_folder_id ON videos(folder_id);
CREATE INDEX IF NOT EXISTS idx_videos_drive_file_id ON videos(drive_file_id);
CREATE INDEX IF NOT EXISTS idx_videos_kind ON videos(kind);

-- -------------------------------------------------------
-- sync_jobs
-- History of Drive synchronisation runs.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_jobs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  status          TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  triggered_by    TEXT NOT NULL DEFAULT 'admin',  -- 'admin' | 'cron'
  started_at      TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at     TEXT,
  files_processed INTEGER NOT NULL DEFAULT 0,
  files_added     INTEGER NOT NULL DEFAULT 0,
  files_removed   INTEGER NOT NULL DEFAULT 0,
  errors          TEXT NOT NULL DEFAULT '[]',      -- JSON array of error strings
  summary         TEXT NOT NULL DEFAULT '{}'       -- JSON blob with stats
);

-- -------------------------------------------------------
-- access_codes
-- Monthly student access PINs.
-- The raw PIN is never stored here; only its bcrypt hash.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS access_codes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code_hash   TEXT NOT NULL,             -- hash of the 4-digit PIN
  valid_from  TEXT NOT NULL,             -- ISO date, first day of month
  valid_until TEXT NOT NULL,             -- ISO date, first day of next month
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_access_codes_active ON access_codes(active, valid_until);

-- -------------------------------------------------------
-- admins
-- Backend admin accounts (separate from student PINs).
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,           -- bcrypt hash
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- -------------------------------------------------------
-- rate_limits
-- Simple in-DB rate limiting for PIN validation endpoint.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS rate_limits (
  key         TEXT NOT NULL,             -- e.g. "pin:127.0.0.1"
  attempts    INTEGER NOT NULL DEFAULT 0,
  window_start TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (key)
);
