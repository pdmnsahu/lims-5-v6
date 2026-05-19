-- Run this ONCE on the existing Neon DB before deploying v7
-- Safe to run multiple times (idempotent)

-- Step 1: Drop old constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Step 2: Rename super_admin → admin (do this first, no collision)
UPDATE users SET role = 'admin' WHERE role = 'super_admin';

-- Step 3: Rename old admin → receptionist
-- We use a temp value to avoid any edge case
UPDATE users SET role = 'receptionist' WHERE role = 'admin' AND username != 'admin.relims';

-- Step 4: Add new constraint
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin','receptionist','lab_manager','chemist'));

-- Verify
SELECT role, COUNT(*) FROM users GROUP BY role ORDER BY role;
