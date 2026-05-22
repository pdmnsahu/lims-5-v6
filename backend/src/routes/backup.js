// backup.js — Full data export and import for admin
// Export: GET  /api/backup/export  → Excel file download
// Import: POST /api/backup/import  → Excel file upload → upsert missing records

import { Router }  from 'express';
import multer      from 'multer';
import * as XLSX   from 'xlsx';
import bcrypt      from 'bcryptjs';
import { sql }     from '../db/client.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logAction, getIP } from '../lib/audit.js';

const router = Router();
router.use(authenticate, authorize('admin'));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype.includes('spreadsheet') ||
                file.mimetype.includes('excel') ||
                file.originalname.endsWith('.xlsx');
    cb(null, ok ? true : new Error('Only .xlsx files allowed'));
  },
});

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toISOString().replace('T', ' ').slice(0, 19);
}

// ── EXPORT ────────────────────────────────────────────────────────────────────
router.get('/export', async (req, res) => {
  try {
    // Fetch all data in parallel
    const [
      users, clients, groups, samples,
      testResults, ambient, settings,
    ] = await Promise.all([
      sql`SELECT id, name, username, role, is_active, created_at FROM users ORDER BY created_at`,
      sql`SELECT * FROM clients ORDER BY name`,
      sql`
        SELECT sg.*, c.name AS client_name, u.name AS collected_by_name
        FROM sample_groups sg
        LEFT JOIN clients c ON c.id = sg.client_id
        LEFT JOIN users u   ON u.id = sg.collected_by
        ORDER BY sg.created_at
      `,
      sql`
        SELECT s.*, sg.group_ref_id, c.name AS client_name
        FROM samples s
        JOIN sample_groups sg ON sg.id = s.sample_group_id
        JOIN clients c        ON c.id  = sg.client_id
        ORDER BY s.created_at
      `,
      sql`
        SELECT
          st.id, st.status, st.result_value, st.result_notes,
          st.rejection_reason, st.submitted_at, st.reviewed_at, st.created_at,
          td.name AS test_name, td.unit AS test_unit,
          s.sample_ref_id, s.lab_internal_id,
          sg.group_ref_id,
          c.name  AS client_name,
          ch.name AS chemist_name, ch.username AS chemist_username,
          ab.name AS assigned_by_name
        FROM sample_tests st
        JOIN test_definitions td ON td.id = st.test_definition_id
        JOIN samples s           ON s.id  = st.sample_id
        JOIN sample_groups sg    ON sg.id = s.sample_group_id
        JOIN clients c           ON c.id  = sg.client_id
        LEFT JOIN users ch       ON ch.id = st.assigned_chemist_id
        LEFT JOIN users ab       ON ab.id = st.assigned_by
        ORDER BY s.lab_internal_id, td.name
      `,
      sql`
        SELECT ar.*, u.name AS recorded_by_name
        FROM ambient_readings ar
        LEFT JOIN users u ON u.id = ar.recorded_by
        ORDER BY ar.reading_date
      `,
      sql`SELECT id, lab_name, lab_address, lab_phone, lab_email, lab_website, corp_office, updated_at FROM lab_settings WHERE id = 'default'`,
    ]);

    const wb = XLSX.utils.book_new();

    // Sheet 1: Users
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      users.map(u => ({
        Name: u.name, Username: u.username, Role: u.role,
        Active: u.is_active ? 'Yes' : 'No', Created: fmtDate(u.created_at),
      }))
    ), 'Users');

    // Sheet 2: Clients
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      clients.map(c => ({
        Name: c.name, Contact: c.contact_person || '', Email: c.email || '',
        Phone: c.phone || '', Address: c.address || '', Created: fmtDate(c.created_at),
      }))
    ), 'Clients');

    // Sheet 3: Sample Groups
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      groups.map(g => ({
        'Group Ref ID': g.group_ref_id, Client: g.client_name,
        'Collected By': g.collected_by_name || '', Status: g.status,
        Created: fmtDate(g.created_at),
      }))
    ), 'Sample Groups');

    // Sheet 4: Samples
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      samples.map(s => ({
        'Sample Ref ID': s.sample_ref_id, 'Lab Internal ID': s.lab_internal_id || '',
        'Group Ref ID': s.group_ref_id, Client: s.client_name,
        Description: s.description || '', Created: fmtDate(s.created_at),
      }))
    ), 'Samples');

    // Sheet 5: Test Results
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      testResults.map(t => ({
        'Lab Internal ID': t.lab_internal_id || '', 'Sample Ref ID': t.sample_ref_id,
        'Group Ref ID': t.group_ref_id, Client: t.client_name,
        'Test Name': t.test_name, Unit: t.test_unit || '',
        'Result Value': t.result_value || '', Status: t.status,
        'Chemist': t.chemist_name || '', 'Chemist Username': t.chemist_username || '',
        'Assigned By': t.assigned_by_name || '',
        Notes: t.result_notes || '', 'Rejection Reason': t.rejection_reason || '',
        'Submitted At': fmtDate(t.submitted_at), 'Reviewed At': fmtDate(t.reviewed_at),
        Created: fmtDate(t.created_at),
      }))
    ), 'Test Results');

    // Sheet 6: Ambient Readings
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      ambient.map(a => ({
        Date: a.reading_date ? new Date(a.reading_date).toISOString().slice(0, 10) : '',
        'Temperature (°C)': a.temperature ?? '', 'Humidity (% RH)': a.humidity ?? '',
        Notes: a.notes || '', 'Recorded By': a.recorded_by_name || '',
        Updated: fmtDate(a.updated_at),
      }))
    ), 'Ambient Readings');

    // Sheet 7: Lab Settings
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      settings.map(s => ({
        'Lab Name': s.lab_name || '', 'Lab Address': s.lab_address || '',
        'Lab Phone': s.lab_phone || '', 'Lab Email': s.lab_email || '',
        'Lab Website': s.lab_website || '', 'Corporate Office': s.corp_office || '',
        'Last Updated': fmtDate(s.updated_at),
      }))
    ), 'Lab Settings');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `CoalLIMS_Export_${new Date().toISOString().slice(0,10)}.xlsx`;

    await logAction({ user: req.user, action: 'EXPORT_DATA', entityType: 'backup',
      detail: {
        users: users.length, clients: clients.length, groups: groups.length,
        samples: samples.length, test_results: testResults.length,
        ambient: ambient.length,
      }, ip: getIP(req) });

    res.set({
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      buf.length,
    });
    res.send(buf);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: err.message || 'Export failed' });
  }
});

// ── IMPORT ────────────────────────────────────────────────────────────────────
router.post('/import', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const summary = {
    users:    { imported: 0, skipped: 0 },
    clients:  { imported: 0, skipped: 0 },
    groups:   { imported: 0, skipped: 0 },
    samples:  { imported: 0, skipped: 0 },
    tests:    { imported: 0, skipped: 0 },
    ambient:  { imported: 0, skipped: 0 },
  };

  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });

    const sheet = (name) => {
      const ws = wb.Sheets[name];
      if (!ws) return [];
      return XLSX.utils.sheet_to_json(ws, { defval: '' });
    };

    const users   = sheet('Users');
    const clients = sheet('Clients');
    const groups  = sheet('Sample Groups');
    const samples = sheet('Samples');
    const tests   = sheet('Test Results');
    const ambient = sheet('Ambient Readings');

    // ── 1. USERS ──────────────────────────────────────────────────────────────
    for (const row of users) {
      const username = String(row['Username'] || '').trim().toLowerCase();
      const name     = String(row['Name']     || '').trim();
      const role     = String(row['Role']     || '').trim();
      const active   = String(row['Active']   || 'Yes').trim() !== 'No';

      if (!username || !name || !role) { summary.users.skipped++; continue; }
      if (!['admin','receptionist','lab_manager','chemist'].includes(role)) { summary.users.skipped++; continue; }

      const [existing] = await sql`SELECT id FROM users WHERE username = ${username}`;
      if (existing) { summary.users.skipped++; continue; }

      // Default password = username
      const hash = await bcrypt.hash(username, 10);
      await sql`
        INSERT INTO users (name, username, password_hash, role, is_active)
        VALUES (${name}, ${username}, ${hash}, ${role}, ${active})
        ON CONFLICT (username) DO NOTHING
      `;
      summary.users.imported++;
    }

    // ── 2. CLIENTS ────────────────────────────────────────────────────────────
    for (const row of clients) {
      const name    = String(row['Name']    || '').trim();
      const contact = String(row['Contact'] || '').trim();
      const email   = String(row['Email']   || '').trim();
      const phone   = String(row['Phone']   || '').trim();
      const address = String(row['Address'] || '').trim();

      if (!name) { summary.clients.skipped++; continue; }

      const [existing] = await sql`SELECT id FROM clients WHERE name = ${name}`;
      if (existing) { summary.clients.skipped++; continue; }

      await sql`
        INSERT INTO clients (name, contact_person, email, phone, address)
        VALUES (${name}, ${contact || null}, ${email || null}, ${phone || null}, ${address || null})
      `;
      summary.clients.imported++;
    }

    // ── 3. SAMPLE GROUPS ──────────────────────────────────────────────────────
    for (const row of groups) {
      const groupRefId    = String(row['Group Ref ID'] || '').trim();
      const clientName    = String(row['Client']       || '').trim();
      const collectedName = String(row['Collected By'] || '').trim();
      const status        = String(row['Status']       || 'on_the_way').trim();

      if (!groupRefId || !clientName) { summary.groups.skipped++; continue; }

      const [existing] = await sql`SELECT id FROM sample_groups WHERE group_ref_id = ${groupRefId}`;
      if (existing) { summary.groups.skipped++; continue; }

      const [client] = await sql`SELECT id FROM clients WHERE name = ${clientName}`;
      if (!client) { summary.groups.skipped++; continue; }

      const [collector] = collectedName
        ? await sql`SELECT id FROM users WHERE name = ${collectedName} LIMIT 1`
        : [null];

      await sql`
        INSERT INTO sample_groups (group_ref_id, client_id, collected_by, status)
        VALUES (${groupRefId}, ${client.id}, ${collector?.id ?? null}, ${status})
        ON CONFLICT (group_ref_id) DO NOTHING
      `;
      summary.groups.imported++;
    }

    // ── 4. SAMPLES ────────────────────────────────────────────────────────────
    for (const row of samples) {
      const sampleRefId   = String(row['Sample Ref ID']   || '').trim();
      const labInternalId = String(row['Lab Internal ID'] || '').trim() || null;
      const groupRefId    = String(row['Group Ref ID']    || '').trim();
      const description   = String(row['Description']     || '').trim() || null;

      if (!sampleRefId || !groupRefId) { summary.samples.skipped++; continue; }

      const [group] = await sql`SELECT id FROM sample_groups WHERE group_ref_id = ${groupRefId}`;
      if (!group) { summary.samples.skipped++; continue; }

      const [existing] = await sql`
        SELECT id FROM samples WHERE sample_group_id = ${group.id} AND sample_ref_id = ${sampleRefId}
      `;
      if (existing) { summary.samples.skipped++; continue; }

      await sql`
        INSERT INTO samples (sample_group_id, sample_ref_id, lab_internal_id, description)
        VALUES (${group.id}, ${sampleRefId}, ${labInternalId}, ${description})
        ON CONFLICT DO NOTHING
      `;
      summary.samples.imported++;
    }

    // ── 5. TEST RESULTS ───────────────────────────────────────────────────────
    for (const row of tests) {
      const labInternalId = String(row['Lab Internal ID'] || '').trim();
      const sampleRefId   = String(row['Sample Ref ID']  || '').trim();
      const groupRefId    = String(row['Group Ref ID']   || '').trim();
      const testName      = String(row['Test Name']      || '').trim();
      const resultValue   = String(row['Result Value']   || '').trim() || null;
      const status        = String(row['Status']         || 'pending').trim();
      const notes         = String(row['Notes']          || '').trim() || null;
      const rejReason     = String(row['Rejection Reason'] || '').trim() || null;
      const chemistUser   = String(row['Chemist Username'] || '').trim();

      if (!sampleRefId || !groupRefId || !testName) { summary.tests.skipped++; continue; }

      // Find sample
      const [group] = await sql`SELECT id FROM sample_groups WHERE group_ref_id = ${groupRefId}`;
      if (!group) { summary.tests.skipped++; continue; }

      const [sample] = await sql`
        SELECT id FROM samples WHERE sample_group_id = ${group.id} AND sample_ref_id = ${sampleRefId}
      `;
      if (!sample) { summary.tests.skipped++; continue; }

      // Find test definition
      const [td] = await sql`SELECT id FROM test_definitions WHERE name = ${testName}`;
      if (!td) { summary.tests.skipped++; continue; }

      // Check duplicate
      const [existing] = await sql`
        SELECT id FROM sample_tests WHERE sample_id = ${sample.id} AND test_definition_id = ${td.id}
      `;
      if (existing) { summary.tests.skipped++; continue; }

      // Find chemist
      const [chemist] = chemistUser
        ? await sql`SELECT id FROM users WHERE username = ${chemistUser} LIMIT 1`
        : [null];

      await sql`
        INSERT INTO sample_tests
          (sample_id, test_definition_id, assigned_chemist_id, status, result_value, result_notes, rejection_reason)
        VALUES
          (${sample.id}, ${td.id}, ${chemist?.id ?? null}, ${status},
           ${resultValue}, ${notes}, ${rejReason})
        ON CONFLICT (sample_id, test_definition_id) DO NOTHING
      `;
      summary.tests.imported++;
    }

    // ── 6. AMBIENT READINGS ───────────────────────────────────────────────────
    for (const row of ambient) {
      const date        = String(row['Date']             || '').trim();
      const temperature = row['Temperature (°C)'] !== '' ? parseFloat(row['Temperature (°C)']) : null;
      const humidity    = row['Humidity (% RH)']  !== '' ? parseFloat(row['Humidity (% RH)'])  : null;
      const notes       = String(row['Notes']            || '').trim() || null;

      if (!date) { summary.ambient.skipped++; continue; }

      const [existing] = await sql`SELECT id FROM ambient_readings WHERE reading_date = ${date}::date`;
      if (existing) { summary.ambient.skipped++; continue; }

      await sql`
        INSERT INTO ambient_readings (reading_date, temperature, humidity, notes)
        VALUES (${date}::date, ${temperature}, ${humidity}, ${notes})
        ON CONFLICT (reading_date) DO NOTHING
      `;
      summary.ambient.imported++;
    }

    await logAction({ user: req.user, action: 'IMPORT_DATA', entityType: 'backup',
      detail: summary, ip: getIP(req) });

    res.json({ success: true, summary });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: err.message || 'Import failed' });
  }
});

export default router;
