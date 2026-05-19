import { Router } from 'express';
import { sql } from '../db/client.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logAction, getIP } from '../lib/audit.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { from, to, group_id, status } = req.query;

    let samples;
    if (!from && !to && !group_id && !status) {
      samples = await sql`
        SELECT s.*, sg.group_ref_id, sg.id AS sample_group_id, c.name AS client_name,
          COUNT(st.id)::int AS test_count,
          COUNT(CASE WHEN st.status = 'approved' THEN 1 END)::int AS approved_count,
          CASE
            WHEN s.lab_internal_id IS NULL THEN 'on_the_way'
            WHEN COUNT(st.id) = 0 THEN 'tests_ongoing'
            WHEN COUNT(st.id) > 0 AND COUNT(st.id) = COUNT(CASE WHEN st.status = 'approved' THEN 1 END) THEN 'completed'
            ELSE 'tests_ongoing'
          END AS sample_status
        FROM samples s
        JOIN sample_groups sg ON sg.id = s.sample_group_id
        JOIN clients c        ON c.id  = sg.client_id
        LEFT JOIN sample_tests st ON st.sample_id = s.id
        GROUP BY s.id, sg.group_ref_id, sg.id, c.name
        ORDER BY
          CASE WHEN s.lab_internal_id IS NOT NULL THEN 0 ELSE 1 END,
          s.lab_internal_id ASC NULLS LAST,
          s.created_at ASC
      `;
    } else {
      const { neon } = await import('@neondatabase/serverless');
      const rawSql = neon(process.env.DATABASE_URL);
      const conditions = []; const values = [];

      if (from)     { values.push(from);     conditions.push(`s.created_at::date >= $${values.length}::date`); }
      if (to)       { values.push(to);       conditions.push(`s.created_at::date <= $${values.length}::date`); }
      if (group_id) { values.push(group_id); conditions.push(`s.sample_group_id = $${values.length}::uuid`); }

      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      let havingClause = '';
      if (status) {
        values.push(status);
        havingClause = `HAVING (CASE
          WHEN s.lab_internal_id IS NULL THEN 'on_the_way'
          WHEN COUNT(st.id) = 0 THEN 'tests_ongoing'
          WHEN COUNT(st.id) > 0 AND COUNT(st.id) = COUNT(CASE WHEN st.status = 'approved' THEN 1 END) THEN 'completed'
          ELSE 'tests_ongoing' END) = $${values.length}`;
      }

      samples = await rawSql(`
        SELECT s.*, sg.group_ref_id, sg.id AS sample_group_id, c.name AS client_name,
          COUNT(st.id)::int AS test_count,
          COUNT(CASE WHEN st.status = 'approved' THEN 1 END)::int AS approved_count,
          CASE
            WHEN s.lab_internal_id IS NULL THEN 'on_the_way'
            WHEN COUNT(st.id) = 0 THEN 'tests_ongoing'
            WHEN COUNT(st.id) > 0 AND COUNT(st.id) = COUNT(CASE WHEN st.status = 'approved' THEN 1 END) THEN 'completed'
            ELSE 'tests_ongoing'
          END AS sample_status
        FROM samples s
        JOIN sample_groups sg ON sg.id = s.sample_group_id
        JOIN clients c        ON c.id  = sg.client_id
        LEFT JOIN sample_tests st ON st.sample_id = s.id
        ${whereClause}
        GROUP BY s.id, sg.group_ref_id, sg.id, c.name
        ${havingClause}
        ORDER BY
          CASE WHEN s.lab_internal_id IS NOT NULL THEN 0 ELSE 1 END,
          s.lab_internal_id ASC NULLS LAST,
          s.created_at ASC
      `, values);
    }

    res.json(samples);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const [sample] = await sql`
      SELECT s.*, sg.group_ref_id, sg.id AS sample_group_id, c.name AS client_name
      FROM samples s
      JOIN sample_groups sg ON sg.id = s.sample_group_id
      JOIN clients c        ON c.id  = sg.client_id
      WHERE s.id = ${req.params.id}
    `;
    if (!sample) return res.status(404).json({ error: 'Sample not found' });
    const tests = await sql`
      SELECT st.*, td.name AS test_name, td.unit AS test_unit, u.name AS chemist_name
      FROM sample_tests st
      JOIN test_definitions td ON td.id = st.test_definition_id
      LEFT JOIN users u         ON u.id = st.assigned_chemist_id
      WHERE st.sample_id = ${req.params.id}
      ORDER BY td.name ASC
    `;
    res.json({ ...sample, tests });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.patch('/:id/lab-id', authorize('lab_manager', 'admin'), async (req, res) => {
  try {
    const { lab_internal_id } = req.body;
    if (!lab_internal_id) return res.status(400).json({ error: 'lab_internal_id required' });

    const [sample] = await sql`SELECT * FROM samples WHERE id = ${req.params.id}`;
    if (!sample) return res.status(404).json({ error: 'Sample not found' });

    const [{ count }] = await sql`
      SELECT COUNT(*)::int AS count FROM sample_tests
      WHERE sample_id = ${req.params.id} AND status IN ('submitted','approved')
    `;
    if (count > 0)
      return res.status(409).json({ error: 'Cannot change Lab ID — results already submitted' });

    const [conflict] = await sql`
      SELECT id FROM samples WHERE lab_internal_id = ${lab_internal_id.trim()} AND id != ${req.params.id}
    `;
    if (conflict) return res.status(409).json({ error: `Lab ID "${lab_internal_id}" already assigned to another sample` });

    const oldLabId = sample.lab_internal_id;
    const [updated] = await sql`
      UPDATE samples SET lab_internal_id = ${lab_internal_id.trim()}
      WHERE id = ${req.params.id} RETURNING *
    `;

    await sql`
      UPDATE sample_groups SET status = 'tests_ongoing'
      WHERE id = ${updated.sample_group_id} AND status = 'on_the_way'
    `;

    await logAction({ user: req.user, action: oldLabId ? 'EDIT_LAB_ID' : 'ASSIGN_LAB_ID',
      entityType: 'sample', entityId: updated.id, entityLabel: updated.sample_ref_id,
      detail: { old_lab_id: oldLabId, new_lab_id: lab_internal_id.trim() }, ip: getIP(req) });

    res.json(updated);
  } catch (err) {
    if (err.message?.includes('unique')) return res.status(409).json({ error: 'Lab ID already assigned to another sample' });
    console.error(err); res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id/ref-id', authorize('admin', 'receptionist'), async (req, res) => {
  try {
    const { sample_ref_id } = req.body;
    if (!sample_ref_id?.trim()) return res.status(400).json({ error: 'sample_ref_id required' });

    const [sample] = await sql`SELECT * FROM samples WHERE id = ${req.params.id}`;
    if (!sample) return res.status(404).json({ error: 'Sample not found' });

    if (sample.lab_internal_id)
      return res.status(409).json({ error: 'Cannot change Sample ID — Lab ID already assigned' });

    const [conflict] = await sql`
      SELECT id FROM samples
      WHERE sample_group_id = ${sample.sample_group_id}
        AND sample_ref_id = ${sample_ref_id.trim()} AND id != ${req.params.id}
    `;
    if (conflict) return res.status(409).json({ error: 'That Sample ID already exists in this group' });

    const [updated] = await sql`
      UPDATE samples SET sample_ref_id = ${sample_ref_id.trim()}
      WHERE id = ${req.params.id} RETURNING *
    `;

    await logAction({ user: req.user, action: 'EDIT_SAMPLE_REF_ID', entityType: 'sample',
      entityId: updated.id, entityLabel: updated.sample_ref_id,
      detail: { old_ref_id: sample.sample_ref_id, new_ref_id: sample_ref_id.trim() }, ip: getIP(req) });

    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const [sample] = await sql`SELECT * FROM samples WHERE id = ${req.params.id}`;
    if (!sample) return res.status(404).json({ error: 'Sample not found' });

    const [{ count }] = await sql`
      SELECT COUNT(*)::int AS count FROM sample_tests
      WHERE sample_id = ${req.params.id} AND status IN ('submitted','approved')
    `;
    if (count > 0)
      return res.status(409).json({ error: 'Cannot delete — submitted or approved results exist. Revoke approvals first.' });

    await sql`DELETE FROM samples WHERE id = ${req.params.id}`;

    await logAction({ user: req.user, action: 'DELETE_SAMPLE', entityType: 'sample',
      entityId: req.params.id, entityLabel: sample.sample_ref_id,
      detail: { lab_internal_id: sample.lab_internal_id }, ip: getIP(req) });

    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/:id/tests', async (req, res) => {
  try {
    const tests = await sql`
      SELECT st.*, td.name AS test_name, td.unit AS test_unit, u.name AS chemist_name
      FROM sample_tests st
      JOIN test_definitions td ON td.id = st.test_definition_id
      LEFT JOIN users u         ON u.id = st.assigned_chemist_id
      WHERE st.sample_id = ${req.params.id}
      ORDER BY st.created_at ASC
    `;
    res.json(tests);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/:id/tests', authorize('lab_manager'), async (req, res) => {
  try {
    const { test_definition_id, assigned_chemist_id } = req.body;
    if (!test_definition_id || !assigned_chemist_id)
      return res.status(400).json({ error: 'test_definition_id and assigned_chemist_id required' });

    const [sample] = await sql`SELECT lab_internal_id FROM samples WHERE id = ${req.params.id}`;
    if (!sample) return res.status(404).json({ error: 'Sample not found' });
    if (!sample.lab_internal_id)
      return res.status(409).json({ error: 'Assign a Lab Internal ID before assigning tests' });

    const [test] = await sql`
      INSERT INTO sample_tests (sample_id, test_definition_id, assigned_chemist_id, assigned_by)
      VALUES (${req.params.id}, ${test_definition_id}, ${assigned_chemist_id}, ${req.user.id})
      ON CONFLICT (sample_id, test_definition_id) DO NOTHING
      RETURNING *
    `;
    if (!test) return res.status(409).json({ error: 'This test is already assigned to this sample' });

    const [td] = await sql`SELECT name FROM test_definitions WHERE id = ${test_definition_id}`;
    const [ch] = await sql`SELECT name FROM users WHERE id = ${assigned_chemist_id}`;
    await logAction({ user: req.user, action: 'ASSIGN_TEST', entityType: 'sample_test',
      entityId: test.id, entityLabel: td?.name,
      detail: { sample_id: req.params.id, chemist: ch?.name }, ip: getIP(req) });

    res.status(201).json(test);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

export default router;
