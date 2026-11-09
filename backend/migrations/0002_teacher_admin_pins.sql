-- Migration 0002: Add teacher and admin PIN system
-- Run with: wrangler d1 migrations apply fisk-media-db [--local]

-- -------------------------------------------------------
-- teacher_pins
-- PIN for teachers area (can be changed by admin).
-- Only one active PIN at a time.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS teacher_pins (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  pin_hash    TEXT NOT NULL,             -- hash of the 4-digit PIN
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_teacher_pins_active ON teacher_pins(active);

-- -------------------------------------------------------
-- admin_pin
-- PIN for admin area (fixed, only changed manually by admin).
-- Only one active PIN at a time.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_pin (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  pin_hash    TEXT NOT NULL,             -- hash of the 4-digit PIN
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_admin_pin_active ON admin_pin(active);

-- Drop the old admins table (username/password no longer needed)
DROP TABLE IF EXISTS admins;
