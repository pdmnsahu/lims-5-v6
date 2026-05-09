// backend/src/routes/reports.js
import { Router }  from 'express';
import puppeteer   from 'puppeteer';
import { sql }     from '../db/client.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { buildReportHtml } from '../lib/reportTemplate.js';

const router = Router();
router.use(authenticate);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/reports/sample/:sampleId/pdf
// Body (optional JSON): { logoBase64, accBase64, stampBase64, sigBase64 }
// Returns: application/pdf — single A4 page, true vector
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/sample/:sampleId/pdf',
  authorize('admin', 'lab_manager', 'super_admin'),
  async (req, res) => {
    let browser;
    try {
      // 1. Fetch data
      const [sample] = await sql`
        SELECT
          s.*,
          sg.group_ref_id,
          sg.created_at  AS group_created_at,
          c.name         AS client_name,
          c.contact_person,
          c.email        AS client_email,
          c.address      AS client_address,
          u.name         AS collected_by_name,
          ar.temperature AS ambient_temp,
          ar.humidity    AS ambient_humidity
        FROM samples s
        JOIN sample_groups sg ON sg.id = s.sample_group_id
        JOIN clients c        ON c.id  = sg.client_id
        LEFT JOIN users u     ON u.id  = sg.collected_by
        LEFT JOIN ambient_readings ar ON ar.reading_date = sg.created_at::date
        WHERE s.id = ${req.params.sampleId}
      `;
      if (!sample) return res.status(404).json({ error: 'Sample not found' });

      const tests = await sql`
        SELECT
          st.*,
          td.name        AS test_name,
          td.unit        AS test_unit,
          td.description AS test_description,
          u.name         AS chemist_name,
          ab.name        AS assigned_by_name
        FROM sample_tests st
        JOIN test_definitions td ON td.id = st.test_definition_id
        LEFT JOIN users u        ON u.id  = st.assigned_chemist_id
        LEFT JOIN users ab       ON ab.id = st.assigned_by
        WHERE st.sample_id = ${req.params.sampleId}
          AND st.status = 'approved'
        ORDER BY td.name ASC
      `;

      // 2. Build HTML
      const { logoBase64, accBase64, stampBase64, sigBase64 } = req.body || {};
      const html = buildReportHtml({ sample, tests, logoBase64, accBase64, stampBase64, sigBase64 });

      // 3. Launch Puppeteer and render PDF
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      });

      const page = await browser.newPage();

      // Set exact A4 viewport so 1px in CSS = 1px in screenshot
      await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Wait for any images (Parr, logos) to fully load
      await page.evaluate(() =>
        Promise.all(
          Array.from(document.images)
            .filter(img => !img.complete)
            .map(img => new Promise(resolve => { img.onload = resolve; img.onerror = resolve; }))
        )
      );

      const pdfBuffer = await page.pdf({
        width:            '794px',
        height:           '1123px',
        printBackground:  true,
        pageRanges:       '1',          // force exactly 1 page
      });

      await browser.close();
      browser = null;

      // 4. Stream PDF to client
      const filename = `TestReport_${sample.lab_internal_id || sample.sample_ref_id || req.params.sampleId}.pdf`;
      res.set({
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length':      pdfBuffer.length,
        'Cache-Control':       'no-store',
      });
      res.end(pdfBuffer);

    } catch (err) {
      if (browser) await browser.close().catch(() => {});
      console.error('[PDF]', err);
      res.status(500).json({ error: 'PDF generation failed', detail: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/sample/:sampleId  — JSON data (kept for report viewer)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/sample/:sampleId', authorize('admin', 'lab_manager', 'super_admin'), async (req, res) => {
  try {
    const [sample] = await sql`
      SELECT
        s.*,
        sg.group_ref_id,
        sg.created_at  AS group_created_at,
        c.name         AS client_name,
        c.contact_person,
        c.email        AS client_email,
        c.address      AS client_address,
        u.name         AS collected_by_name,
        ar.temperature AS ambient_temp,
        ar.humidity    AS ambient_humidity
      FROM samples s
      JOIN sample_groups sg ON sg.id = s.sample_group_id
      JOIN clients c        ON c.id  = sg.client_id
      LEFT JOIN users u     ON u.id  = sg.collected_by
      LEFT JOIN ambient_readings ar ON ar.reading_date = sg.created_at::date
      WHERE s.id = ${req.params.sampleId}
    `;
    if (!sample) return res.status(404).json({ error: 'Sample not found' });

    const tests = await sql`
      SELECT
        st.*,
        td.name        AS test_name,
        td.unit        AS test_unit,
        td.description AS test_description,
        u.name         AS chemist_name,
        ab.name        AS assigned_by_name
      FROM sample_tests st
      JOIN test_definitions td ON td.id = st.test_definition_id
      LEFT JOIN users u        ON u.id  = st.assigned_chemist_id
      LEFT JOIN users ab       ON ab.id = st.assigned_by
      WHERE st.sample_id = ${req.params.sampleId} AND st.status = 'approved'
      ORDER BY td.name ASC
    `;

    res.json({ sample, tests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/group/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get('/group/:id', authorize('admin', 'lab_manager', 'super_admin'), async (req, res) => {
  try {
    const [group] = await sql`
      SELECT sg.*, c.name AS client_name, c.contact_person, c.email AS client_email, c.address
      FROM sample_groups sg
      JOIN clients c ON c.id = sg.client_id
      WHERE sg.id = ${req.params.id}
    `;
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const tests = await sql`
      SELECT
        st.*,
        td.name        AS test_name,
        td.unit        AS test_unit,
        s.sample_ref_id,
        s.lab_internal_id,
        u.name         AS chemist_name
      FROM sample_tests st
      JOIN test_definitions td ON td.id = st.test_definition_id
      JOIN samples s           ON s.id  = st.sample_id
      LEFT JOIN users u        ON u.id  = st.assigned_chemist_id
      WHERE s.sample_group_id = ${req.params.id} AND st.status = 'approved'
      ORDER BY s.sample_ref_id, td.name
    `;

    res.json({ group, tests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/overview
// ─────────────────────────────────────────────────────────────────────────────
router.get('/overview', authorize('super_admin'), async (req, res) => {
  try {
    const stats = await sql`
      SELECT
        (SELECT COUNT(*)::int FROM sample_groups)                              AS total_groups,
        (SELECT COUNT(*)::int FROM samples)                                    AS total_samples,
        (SELECT COUNT(*)::int FROM sample_tests)                               AS total_tests,
        (SELECT COUNT(*)::int FROM sample_tests WHERE status='approved')       AS approved_tests,
        (SELECT COUNT(*)::int FROM sample_tests WHERE status='submitted')      AS pending_review,
        (SELECT COUNT(*)::int FROM sample_tests WHERE status='rejected')       AS rejected_tests,
        (SELECT COUNT(*)::int FROM sample_tests WHERE status='pending')        AS unsubmitted_tests,
        (SELECT COUNT(*)::int FROM sample_groups WHERE status='completed')     AS completed_groups
    `;
    res.json(stats[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;