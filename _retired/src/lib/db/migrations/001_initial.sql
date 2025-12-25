-- Initial schema for Foundry SQLite database
-- Tracks workflow state, decisions, history, and analysis results

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Workflow checkpoints (for pause/resume)
CREATE TABLE workflow_checkpoints (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  workflow_id TEXT NOT NULL,          -- 'cpo-phase', 'clarify-phase', 'cto-phase', 're-workflow', 'actualize-workflow'
  current_step_id TEXT NOT NULL,
  status TEXT NOT NULL,               -- 'running', 'paused', 'waiting_user', 'completed', 'failed'

  -- Topic/question tracking (for Q&A workflows)
  current_topic_index INTEGER DEFAULT 0,
  current_question_index INTEGER DEFAULT 0,
  topic_question_counts TEXT,         -- JSON: {"problem-statement": 3, "target-users": 2}

  -- Accumulated data
  answers TEXT NOT NULL,              -- JSON of collected answers
  skipped_questions TEXT,             -- JSON array of skipped question IDs
  data TEXT NOT NULL,                 -- JSON of workflow-specific accumulated data

  -- Clarify phase state (when active)
  clarify_state TEXT,                 -- JSON: {ambiguities, currentIndex, resolvedCount, deferredCount, status}

  -- Execution history
  step_history TEXT NOT NULL,         -- JSON array of StepExecution records

  -- Checkpoint metadata
  checkpoint TEXT NOT NULL,           -- Serialized checkpoint data

  -- Timestamps
  started_at TEXT NOT NULL,
  last_activity_at TEXT NOT NULL,
  paused_at TEXT,
  completed_at TEXT,

  -- Error tracking
  last_error TEXT,                    -- Error message if status='failed'
  retry_count INTEGER DEFAULT 0
);

CREATE INDEX idx_checkpoint_session ON workflow_checkpoints(session_id);
CREATE INDEX idx_checkpoint_project ON workflow_checkpoints(project_id);
CREATE INDEX idx_checkpoint_status ON workflow_checkpoints(status);
CREATE INDEX idx_checkpoint_workflow ON workflow_checkpoints(workflow_id);

-- Prevent multiple running workflows per project (race condition protection)
CREATE UNIQUE INDEX idx_checkpoint_active_project
  ON workflow_checkpoints(project_id)
  WHERE status = 'running';

-- Step execution log (detailed history for debugging)
CREATE TABLE step_executions (
  id TEXT PRIMARY KEY,
  checkpoint_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  step_type TEXT NOT NULL,            -- 'code', 'llm', 'question', 'conditional', 'loop', 'nested_workflow'
  status TEXT NOT NULL,               -- 'completed', 'failed', 'skipped'
  started_at TEXT NOT NULL,
  completed_at TEXT,
  input_data TEXT,                    -- JSON of step input
  output_data TEXT,                   -- JSON of step output
  error TEXT,                         -- Error message if failed
  llm_tokens_used INTEGER,            -- Token count for LLM steps
  duration_ms INTEGER,                -- Execution time
  FOREIGN KEY (checkpoint_id) REFERENCES workflow_checkpoints(id) ON DELETE CASCADE
);

CREATE INDEX idx_step_checkpoint ON step_executions(checkpoint_id);
CREATE INDEX idx_step_status ON step_executions(status);
CREATE INDEX idx_step_type ON step_executions(step_type);

-- Undo/Redo history
CREATE TABLE undo_actions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  action_type TEXT NOT NULL,          -- 'create', 'update', 'delete'
  target_type TEXT NOT NULL,          -- 'project', 'module', 'feature', 'schema', 'api', 'component', etc.
  target_id TEXT NOT NULL,
  before_state TEXT,                  -- JSON snapshot before action
  after_state TEXT,                   -- JSON snapshot after action
  description TEXT NOT NULL,          -- Human-readable description
  created_at TEXT NOT NULL,
  undone_at TEXT                      -- NULL if not undone, timestamp if undone
);

CREATE INDEX idx_undo_project ON undo_actions(project_id);
CREATE INDEX idx_undo_created ON undo_actions(created_at);
CREATE INDEX idx_undo_target ON undo_actions(target_type, target_id);

-- Analysis results cache
CREATE TABLE analysis_results (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  scope TEXT NOT NULL,                -- 'full', 'module:auth', 'feature:login'
  status TEXT NOT NULL,               -- 'valid', 'warnings', 'errors'
  results TEXT NOT NULL,              -- JSON of analysis findings
  created_at TEXT NOT NULL,
  expires_at TEXT                     -- Cache expiration
);

CREATE INDEX idx_analysis_project ON analysis_results(project_id);
CREATE INDEX idx_analysis_scope ON analysis_results(scope);
CREATE INDEX idx_analysis_expires ON analysis_results(expires_at);

-- Decision Journal (Feature F17: Cognitive Load Reduction)
-- Records all decisions made during Q&A for timeline view and cascading undo
CREATE TABLE decisions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  feature_id TEXT,                    -- NULL for project-level decisions
  session_id TEXT NOT NULL,           -- Links to workflow session

  -- Question/Answer context
  question_id TEXT NOT NULL,          -- ID of the question answered
  question_text TEXT NOT NULL,        -- Full question text for display
  answer_given TEXT NOT NULL,         -- JSON: selected option(s) or text value
  alternatives TEXT,                  -- JSON: other options that were available

  -- Classification
  category TEXT NOT NULL,             -- 'product_scope', 'user_experience', 'data_model', 'api_design', 'technology', 'security', 'performance', 'integration'
  phase TEXT NOT NULL,                -- 'cpo', 'clarify', 'cto'
  batch_id TEXT,                      -- If answered as part of a batch

  -- Impact tracking
  artifacts_affected TEXT,            -- JSON: [{type: 'schema', id: 'users', changes: [...]}]
  spec_changes TEXT,                  -- JSON: [{section: '...', operation: 'add', path: '...'}]
  cascade_group TEXT,                 -- Groups related decisions for cascade undo

  -- Reversibility
  can_undo INTEGER DEFAULT 1,         -- 0 = irreversible (e.g., external API calls made)
  undone_at TEXT,                     -- NULL if not undone, timestamp if undone
  undone_by TEXT,                     -- Decision ID that triggered cascade undo

  -- AI recommendation tracking
  ai_recommendation TEXT,             -- JSON: {optionId, confidence, reasoning} if AI suggested
  recommendation_followed INTEGER,    -- 1 = user accepted, 0 = user chose different

  -- Rationale (captured or inferred)
  rationale_explicit TEXT,            -- User-provided reason (if any)
  rationale_inferred TEXT,            -- AI-inferred reason based on context
  rationale_confidence TEXT,          -- 'stated', 'inferred', 'unknown'

  -- Timestamps
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_decisions_project ON decisions(project_id);
CREATE INDEX idx_decisions_feature ON decisions(feature_id);
CREATE INDEX idx_decisions_session ON decisions(session_id);
CREATE INDEX idx_decisions_cascade ON decisions(cascade_group);
CREATE INDEX idx_decisions_phase ON decisions(phase);
CREATE INDEX idx_decisions_created ON decisions(created_at);
CREATE INDEX idx_decisions_category ON decisions(category);

-- Artifact history (per-artifact change tracking)
CREATE TABLE artifact_history (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  artifact_type TEXT NOT NULL,        -- 'feature', 'schema', 'api', 'component'
  artifact_id TEXT NOT NULL,
  version INTEGER NOT NULL,           -- Incremental version number
  change_type TEXT NOT NULL,          -- 'created', 'updated', 'deleted'
  changes TEXT NOT NULL,              -- JSON: DiffResult or description
  changed_by TEXT NOT NULL,           -- 'user' or 'ai' or 'workflow:{id}'
  session_id TEXT,                    -- Workflow session if applicable
  created_at TEXT NOT NULL
);

CREATE INDEX idx_history_artifact ON artifact_history(artifact_type, artifact_id);
CREATE INDEX idx_history_project ON artifact_history(project_id);
CREATE INDEX idx_history_created ON artifact_history(created_at);

-- Annotations (inline comments/notes on artifacts)
CREATE TABLE annotations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  artifact_type TEXT NOT NULL,        -- 'feature', 'schema', 'api', 'component'
  artifact_id TEXT NOT NULL,
  artifact_path TEXT,                 -- JSON path within artifact (e.g., 'business.acceptanceCriteria[0]')
  content TEXT NOT NULL,              -- Annotation text
  author TEXT NOT NULL,               -- 'user' or 'ai'
  annotation_type TEXT NOT NULL,      -- 'comment', 'todo', 'warning', 'suggestion'
  status TEXT NOT NULL,               -- 'open', 'resolved', 'dismissed'
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE INDEX idx_annotations_artifact ON annotations(artifact_type, artifact_id);
CREATE INDEX idx_annotations_project ON annotations(project_id);
CREATE INDEX idx_annotations_status ON annotations(status);
CREATE INDEX idx_annotations_type ON annotations(annotation_type);
