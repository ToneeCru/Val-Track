-- Insert Admin Account
-- Run this in your Supabase SQL Editor

INSERT INTO profiles (
    full_name,
    email,
    password,
    role,
    status
) VALUES (
    'System Administrator',
    'admin@valtrack.com',
    'admin123',
    'admin',
    'active'
);

-- Verify the insertion
SELECT * FROM profiles WHERE role = 'admin';
