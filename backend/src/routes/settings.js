import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { sql } from '../db/client.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logAction, getIP } from '../lib/audit.js';
import 'dotenv/config';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

const router = Router();
router.use(authenticate);

// GET /api/settings — all authenticated users can read (report viewer needs it)
router.get('/', async (req, res) => {
  try {
    const [settings] = await sql`SELECT * FROM lab_settings WHERE id = 'default'`;
    res.json(settings || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/settings — super admin updates text fields
router.put('/', authorize('admin'), async (req, res) => {
  try {
    const { lab_name, lab_address, lab_phone, lab_email, lab_website, corp_office } = req.body;
    const [settings] = await sql`
      UPDATE lab_settings SET
        lab_name    = COALESCE(${lab_name    ?? null}, lab_name),
        lab_address = COALESCE(${lab_address ?? null}, lab_address),
        lab_phone   = COALESCE(${lab_phone   ?? null}, lab_phone),
        lab_email   = COALESCE(${lab_email   ?? null}, lab_email),
        lab_website = COALESCE(${lab_website ?? null}, lab_website),
        corp_office = COALESCE(${corp_office ?? null}, corp_office),
        updated_at  = now()
      WHERE id = 'default'
      RETURNING *
    `;
    await logAction({ user: req.user, action: 'UPDATE_LAB_SETTINGS', entityType: 'settings',
      detail: { lab_name, lab_email }, ip: getIP(req) });
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper — upload a single image to Cloudinary and update one column in lab_settings
async function uploadSettingsImage(req, res, columnName, publicId) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder:        'coal-lims/settings',
          public_id:     publicId,
          overwrite:     true,
          resource_type: 'image',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => error ? reject(error) : resolve(result)
      );
      stream.end(req.file.buffer);
    });

    // Dynamic column update using tagged template safely
    const url = result.secure_url;
    let settings;
    if (columnName === 'logo_url') {
      [settings] = await sql`UPDATE lab_settings SET logo_url = ${url}, updated_at = now() WHERE id = 'default' RETURNING *`;
    } else if (columnName === 'accreditation_url') {
      [settings] = await sql`UPDATE lab_settings SET accreditation_url = ${url}, updated_at = now() WHERE id = 'default' RETURNING *`;
    } else if (columnName === 'stamp_url') {
      [settings] = await sql`UPDATE lab_settings SET stamp_url = ${url}, updated_at = now() WHERE id = 'default' RETURNING *`;
    } else if (columnName === 'signature_url') {
      [settings] = await sql`UPDATE lab_settings SET signature_url = ${url}, updated_at = now() WHERE id = 'default' RETURNING *`;
    }

    await logAction({ user: req.user, action: 'UPDATE_LAB_IMAGE', entityType: 'settings',
      detail: { field: columnName, url }, ip: getIP(req) });

    res.json({ url, settings });
  } catch (err) {
    console.error('Settings image upload error:', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
}

// POST /api/settings/upload/logo
router.post('/upload/logo',          authorize('admin'), upload.single('image'), (req, res) => uploadSettingsImage(req, res, 'logo_url',          'lab_logo'));
// POST /api/settings/upload/accreditation
router.post('/upload/accreditation', authorize('admin'), upload.single('image'), (req, res) => uploadSettingsImage(req, res, 'accreditation_url', 'lab_accreditation'));
// POST /api/settings/upload/stamp
router.post('/upload/stamp',         authorize('admin'), upload.single('image'), (req, res) => uploadSettingsImage(req, res, 'stamp_url',         'lab_stamp'));
// POST /api/settings/upload/signature
router.post('/upload/signature',     authorize('admin'), upload.single('image'), (req, res) => uploadSettingsImage(req, res, 'signature_url',     'lab_signature'));

export default router;