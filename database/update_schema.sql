-- Update database schema to add full_name column and remove first_name, last_name
-- Run this script to update existing database

USE foodvision_db;

-- Add full_name column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS full_name VARCHAR(100) AFTER email;

-- If you have existing data with first_name and last_name, migrate them
-- Uncomment the following lines if you need to migrate existing data:
-- UPDATE users 
-- SET full_name = CONCAT(IFNULL(first_name, ''), ' ', IFNULL(last_name, ''))
-- WHERE full_name IS NULL OR full_name = '';

-- Optional: Remove old columns if they exist
-- ALTER TABLE users DROP COLUMN IF EXISTS first_name;
-- ALTER TABLE users DROP COLUMN IF EXISTS last_name;

-- Show updated table structure
DESCRIBE users;
