-- Add account_expiration_date column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS account_expiration_date TIMESTAMP WITH TIME ZONE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_expiration ON profiles(account_expiration_date);

-- Set default expiration for existing non-admin users (7 days from creation)
UPDATE profiles
SET account_expiration_date = created_at + INTERVAL '7 days'
WHERE account_expiration_date IS NULL
  AND email NOT IN ('kleber.zumiotti@iprocesso.com', 'angelomarchi05@gmail.com');

-- Admin users get NULL (no expiration)
UPDATE profiles
SET account_expiration_date = NULL
WHERE email IN ('kleber.zumiotti@iprocesso.com', 'angelomarchi05@gmail.com');
