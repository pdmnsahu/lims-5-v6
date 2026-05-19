import { sql } from './client.js';
import bcrypt from 'bcryptjs';

async function setup() {
  console.log('🔌 Connecting to Neon PostgreSQL (v7)...');

  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

  // Users table — new CHECK constraint with renamed roles
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin','receptionist','lab_manager','chemist')),
      is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now()
    )
  `;

  // v7 role migration — runs safely on existing DBs
  // Step 1: drop old constraint so UPDATE can proceed
  await sql`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`.catch(() => {});
  // Step 2: rename super_admin → admin first (no collision risk)
  await sql`UPDATE users SET role = 'admin' WHERE role = 'super_admin'`.catch(() => {});
  // Step 3: rename old admin → receptionist
  await sql`UPDATE users SET role = 'receptionist' WHERE role = 'admin' AND created_at < now() AND role = 'admin'`.catch(() => {});
  // Step 4: re-add constraint with new values
  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
      ) THEN
        ALTER TABLE users ADD CONSTRAINT users_role_check
          CHECK (role IN ('admin','receptionist','lab_manager','chemist'));
      END IF;
    END $$
  `.catch(() => {});

  await sql`
    CREATE TABLE IF NOT EXISTS clients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL, contact_person TEXT, email TEXT, phone TEXT, address TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS test_definitions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE, unit TEXT, description TEXT,
      is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS sample_groups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_ref_id TEXT NOT NULL UNIQUE,
      client_id UUID REFERENCES clients(id),
      collected_by UUID REFERENCES users(id),
      status TEXT DEFAULT 'on_the_way',
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `;

  await sql`UPDATE sample_groups SET status = 'on_the_way'    WHERE status = 'collected'`.catch(() => {});
  await sql`UPDATE sample_groups SET status = 'tests_ongoing' WHERE status = 'in_progress'`.catch(() => {});

  await sql`
    CREATE TABLE IF NOT EXISTS samples (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sample_group_id UUID REFERENCES sample_groups(id) ON DELETE CASCADE,
      sample_ref_id TEXT NOT NULL, lab_internal_id TEXT UNIQUE, description TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(sample_group_id, sample_ref_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS sample_tests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sample_id UUID REFERENCES samples(id) ON DELETE CASCADE,
      test_definition_id UUID REFERENCES test_definitions(id),
      assigned_chemist_id UUID REFERENCES users(id),
      assigned_by UUID REFERENCES users(id),
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','submitted','approved','rejected')),
      result_value TEXT, result_notes TEXT, image_url TEXT, rejection_reason TEXT,
      submitted_at TIMESTAMPTZ, reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(sample_id, test_definition_id)
    )
  `;
  await sql`ALTER TABLE sample_tests ADD COLUMN IF NOT EXISTS image_url TEXT`;

  await sql`
    CREATE TABLE IF NOT EXISTS ambient_readings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reading_date DATE NOT NULL UNIQUE,
      temperature NUMERIC(5,2), humidity NUMERIC(5,2),
      recorded_by UUID REFERENCES users(id),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_ambient_date ON ambient_readings(reading_date DESC)`;

  await sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
      actor_name TEXT, actor_role TEXT, action TEXT NOT NULL,
      entity_type TEXT NOT NULL, entity_id TEXT, entity_label TEXT,
      detail JSONB, ip_address TEXT, created_at TIMESTAMPTZ DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_actor   ON audit_logs(actor_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_entity  ON audit_logs(entity_type)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC)`;

  await sql`
    CREATE TABLE IF NOT EXISTS lab_settings (
      id            TEXT PRIMARY KEY DEFAULT 'default',
      lab_name      TEXT DEFAULT 'Ravi Energie Laboratory',
      lab_address   TEXT DEFAULT 'Plot No-14, Astankar Bhavan, Behind Tukaram Sabhagruha, SuyogNagar, District Nagpur - 440015, Maharashtra, India.',
      lab_phone     TEXT DEFAULT '+91 8320021741',
      lab_email     TEXT DEFAULT 'lab@ravienergie.com',
      lab_website   TEXT DEFAULT 'www.ravienergie.com',
      corp_office   TEXT DEFAULT 'S15 A/B India Bulls Mega Mall, Jetalpur Road, Vadodara - 390 020, India',
      logo_url      TEXT, accreditation_url TEXT, stamp_url TEXT, signature_url TEXT,
      updated_at    TIMESTAMPTZ DEFAULT now()
    )
  `;
  await sql`INSERT INTO lab_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING`;

  console.log('✅ Tables created / verified');

  // Seed admin user (previously superadmin.relims)
  const adminUsername = 'admin.relims';
  const adminHash = await bcrypt.hash(adminUsername, 10);
  await sql`
    INSERT INTO users (name, username, password_hash, role)
    VALUES ('Admin', ${adminUsername}, ${adminHash}, 'admin')
    ON CONFLICT (username) DO NOTHING
  `;
  console.log(`✅ Admin → ${adminUsername} / ${adminUsername}`);

  const tests = [
    { name: 'Gross Calorific Value', unit: 'kCal/kg', description: 'GCV via Parr calorimeter — attach snapshot' },
    { name: 'Moisture (ADB)',        unit: '%',       description: 'Moisture on Air Dried Basis' },
    { name: 'Ash (ADB)',             unit: '%',       description: 'Ash content on Air Dried Basis' },
    { name: 'Volatile Matter (ADB)', unit: '%',       description: 'Volatile Matter on Air Dried Basis' },
    { name: 'Moisture (EQ)',         unit: '%',       description: 'Moisture on Equilibrated Basis (60% RH, 40°C)' },
    { name: 'Total Moisture (TM)',   unit: '%',       description: 'Total Moisture content' },
  ];
  for (const t of tests) {
    await sql`
      INSERT INTO test_definitions (name, unit, description)
      VALUES (${t.name}, ${t.unit}, ${t.description})
      ON CONFLICT (name) DO NOTHING
    `;
  }
  console.log('✅ 6 test definitions seeded');
  console.log('\n🎉 Database setup complete! (v7)');
  process.exit(0);
}

setup().catch(err => { console.error('❌ Setup failed:', err); process.exit(1); });
