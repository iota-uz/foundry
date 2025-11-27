-- Migration 003: Cost tracking tables
-- Token usage and budget configuration

-- Token usage tracking
CREATE TABLE IF NOT EXISTS token_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_id TEXT NOT NULL,
  operation_type TEXT NOT NULL,  -- 'cpo_workflow', 'cto_workflow', 'schema_gen', etc.
  project_id TEXT NOT NULL,
  session_id TEXT,  -- Link to workflow session if applicable
  model TEXT NOT NULL,  -- 'sonnet', 'opus', 'haiku'
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  estimated_cost REAL NOT NULL,  -- USD
  timestamp TEXT NOT NULL,
  archived INTEGER DEFAULT 0  -- For soft delete on monthly reset
);

CREATE INDEX IF NOT EXISTS idx_token_usage_project ON token_usage(project_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_timestamp ON token_usage(timestamp);
CREATE INDEX IF NOT EXISTS idx_token_usage_session ON token_usage(session_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_archived ON token_usage(archived);

-- Budget configuration per project
CREATE TABLE IF NOT EXISTS budget_config (
  project_id TEXT PRIMARY KEY,
  tier TEXT NOT NULL,  -- 'development', 'professional', 'enterprise', 'custom'
  monthly_limit INTEGER NOT NULL,  -- Max tokens per month
  warning_threshold INTEGER DEFAULT 80,  -- Warning percentage (e.g., 80%)
  disable_limits INTEGER DEFAULT 0,  -- 1 = disable budget enforcement
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
