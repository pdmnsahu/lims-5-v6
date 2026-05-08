import { sql } from './client.js';
import bcrypt from 'bcryptjs';

async function setup() {
  console.log('🔌 Connecting to Neon PostgreSQL (v6)...');

  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('super_admin','admin','lab_manager','chemist')),
      is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now()
    )
  `;

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

  // New status values: on_the_way | tests_ongoing | completed
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

  // Migrate old status values if upgrading
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

  // Daily ambient readings (temperature + humidity)
  await sql`
    CREATE TABLE IF NOT EXISTS ambient_readings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reading_date DATE NOT NULL UNIQUE,
      temperature NUMERIC(5,2),
      humidity NUMERIC(5,2),
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

  console.log('✅ Tables created / verified');

  const superUsername = 'superadmin.relims';
  const superHash = await bcrypt.hash(superUsername, 10);
  await sql`
    INSERT INTO users (name, username, password_hash, role)
    VALUES ('Super Admin', ${superUsername}, ${superHash}, 'super_admin')
    ON CONFLICT (username) DO NOTHING
  `;
  console.log(`✅ Super admin → ${superUsername} / ${superUsername}`);

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
  console.log('✅ 6 test definitions seeded: GCV, Moisture ADB, Ash ADB, VM ADB, Moisture EQ, Total Moisture TM');
  console.log('\n🎉 Database setup complete! (v6)');
  process.exit(0);
}

setup().catch(err => { console.error('❌ Setup failed:', err); process.exit(1); });
