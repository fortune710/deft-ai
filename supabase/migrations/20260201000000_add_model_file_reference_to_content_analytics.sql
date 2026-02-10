ALTER TABLE content_analytics
  ADD COLUMN IF NOT EXISTS model_file_reference text;
