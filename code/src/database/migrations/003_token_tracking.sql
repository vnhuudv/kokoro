-- Add token usage columns to case_library for Inochi carbon footprint tracking
ALTER TABLE case_library
  ADD COLUMN IF NOT EXISTS input_tokens  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS output_tokens INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS llm_provider  TEXT;
