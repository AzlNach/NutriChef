-- Update users table to add first_name and last_name columns
-- Run this SQL to update your existing database

USE foodvision_db;

-- Add first_name and last_name columns to users table
ALTER TABLE users 
ADD COLUMN first_name VARCHAR(50) AFTER password_hash,
ADD COLUMN last_name VARCHAR(50) AFTER first_name;

-- Update existing users - split full_name into first_name and last_name if full_name exists
UPDATE users 
SET first_name = SUBSTRING_INDEX(full_name, ' ', 1),
    last_name = CASE 
        WHEN LOCATE(' ', full_name) > 0 
        THEN SUBSTRING(full_name, LOCATE(' ', full_name) + 1)
        ELSE ''
    END
WHERE full_name IS NOT NULL AND full_name != '';

-- For users without full_name, set default values
UPDATE users 
SET first_name = 'User',
    last_name = CONCAT('', id)
WHERE (first_name IS NULL OR first_name = '') 
   OR (last_name IS NULL OR last_name = '');

-- Show updated table structure
DESCRIBE users;
