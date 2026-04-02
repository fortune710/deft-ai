-- Cleanup Schema Migration
-- 1. Change user_content_profile.question_1_niche from text to jsonb
-- 2. Drop ai_context and system_prompt columns from user_content_profile
-- 3. Drop content_plans table
-- 4. Drop plan_id column from content_items

-- Step 1: Handle question_1_niche column change
ALTER TABLE user_content_profile 
  ALTER COLUMN question_1_niche TYPE jsonb USING 
    CASE 
      WHEN question_1_niche::text ~ '^\x20*[\{\[\"].*[\}\]\"]\x20*$' THEN question_1_niche::text::jsonb 
      ELSE to_jsonb(question_1_niche::text) 
    END;

-- Step 2: Drop unused columns from user_content_profile
ALTER TABLE user_content_profile 
  DROP COLUMN IF EXISTS ai_context,
  DROP COLUMN IF EXISTS system_prompt;

-- Step 3: Drop content_items foreign key and column referencing content_plans
ALTER TABLE content_items 
  DROP COLUMN IF EXISTS plan_id;

-- Step 4: Drop content_plans table
DROP TABLE IF EXISTS content_plans CASCADE;
