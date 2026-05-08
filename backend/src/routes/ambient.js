import { Router } from 'express';
import { sql } from '../db/client.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logAction, getIP } from '../lib/audit.js';

const router = Router();
router.use(authenticate);

// GET /api/ambient — list recent readings (all authenticated)
router.get('/', async (req, res) => {
  try {
    const { limit = 30 } = req.query;
    const readings = await sql`
      SELECT ar.*, u.name AS recorded_by_name
      FROM ambient_readings ar
      LEFT JOIN users u ON u.id = ar.recorded_by
      ORDER BY ar.reading_date DESC
      LIMIT ${parseInt(limit)}
    `;
    res.json(readings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/ambient/today
router.get('/today', async (req, res) => {
  try {
    const [reading] = await sql`
      SELECT ar.*, u.name AS recorded_by_name
      FROM ambient_readings ar
      LEFT JOIN users u ON u.id = ar.recorded_by
      WHERE ar.reading_date = CURRENT_DATE
    `;
    res.json(reading || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/ambient/:date — specific date (YYYY-MM-DD)
router.get('/:date', async (req, res) => {
  try {
    const [reading] = await sql`
      SELECT ar.*, u.name AS recorded_by_name
      FROM ambient_readings ar
      LEFT JOIN users u ON u.id = ar.recorded_by
      WHERE ar.reading_date = ${req.params.date}::date
    `;
    res.json(reading || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/ambient/:date — lab_manager upserts reading for a date
router.put('/:date', authorize('lab_manager', 'super_admin'), async (req, res) => {
  try {
    const { temperature, humidity, notes } = req.body;
    if (temperature == null && humidity == null)
      return res.status(400).json({ error: 'At least temperature or humidity required' });

    const [existing] = await sql`SELECT id FROM ambient_readings WHERE reading_date = ${req.params.date}::date`;

    let reading;
    if (existing) {
      [reading] = await sql`
        UPDATE ambient_readings SET
          temperature = ${temperature ?? null},
          humidity    = ${humidity    ?? null},
          notes       = ${notes       ?? null},
          recorded_by = ${req.user.id},
          updated_at  = now()
        WHERE reading_date = ${req.params.date}::date
        RETURNING *
      `;
    } else {
      [reading] = await sql`
        INSERT INTO ambient_readings (reading_date, temperature, humidity, notes, recorded_by)
        VALUES (${req.params.date}::date, ${temperature ?? null}, ${humidity ?? null}, ${notes ?? null}, ${req.user.id})
        RETURNING *
      `;
    }

    await logAction({ user: req.user, action: existing ? 'UPDATE_AMBIENT' : 'CREATE_AMBIENT',
      entityType: 'ambient', entityId: reading.id, entityLabel: req.params.date,
      detail: { temperature, humidity, notes }, ip: getIP(req) });

    res.json(reading);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
