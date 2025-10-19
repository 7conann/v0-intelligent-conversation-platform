-- Add phone and last_access columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS last_access TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index on last_access for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_last_access ON profiles(last_access DESC);

-- Update existing users' last_access to their created_at date
UPDATE profiles
SET last_access = created_at
WHERE last_access IS NULL;
