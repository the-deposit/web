-- Fase 4: Make accounts_payable more flexible for manual entries and CxP module
-- source_type / source_id can now be null for manually created payables

ALTER TABLE accounts_payable
  ALTER COLUMN source_type DROP NOT NULL,
  ALTER COLUMN source_id DROP NOT NULL;

-- Add notes column for manual observations
ALTER TABLE accounts_payable
  ADD COLUMN IF NOT EXISTS notes TEXT;
