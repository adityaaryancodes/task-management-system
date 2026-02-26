import { Router } from 'express';
import Joi from 'joi';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import { query } from '../../config/db.js';
import { authRequired } from '../../middleware/auth.js';
import { validateOrgScope } from '../../middleware/orgScope.js';
import { requireRole } from '../../middleware/rbac.js';
import { paginationSchema, validate } from '../../utils/validation.js';
import {
  uploadToS3,
  getScreenshotSignedUrl,
  useLocalScreenshotStorage,
  getLocalScreenshotPath,
  deleteScreenshotObject
} from '../../utils/s3.js';
import { config } from '../../config/env.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 6 * 1024 * 1024 } });

const uploadSchema = Joi.object({
  captured_at: Joi.date().iso().required(),
  device_id: Joi.string().uuid().required()
});

router.post('/upload', authRequired, validateOrgScope, upload.single('screenshot'), async (req, res, next) => {
  try {
    const { error, value } = validate(uploadSchema, req.body);
    if (error) return res.status(400).json({ message: 'Validation failed', errors: error });
    if (!req.file) return res.status(400).json({ message: 'screenshot file is required' });

    const key = `${req.orgId}/${req.user.sub}/${Date.now()}-${uuidv4()}.jpg`;
    const s3Ref = await uploadToS3({
      key,
      body: req.file.buffer,
      contentType: req.file.mimetype || 'image/jpeg'
    });

    const inserted = await query(
      `INSERT INTO screenshots (id, org_id, user_id, device_id, captured_at, s3_key, storage_url, file_size_bytes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, captured_at, storage_url`,
      [uuidv4(), req.orgId, req.user.sub, value.device_id, value.captured_at, key, s3Ref, req.file.size]
    );

    return res.status(201).json(inserted.rows[0]);
  } catch (err) {
    return next(err);
  }
});

router.get('/', authRequired, validateOrgScope, async (req, res, next) => {
  try {
    const p = validate(paginationSchema, req.query);
    if (p.error) return res.status(400).json({ message: 'Validation failed', errors: p.error });
    const { page, limit } = p.value;
    const offset = (page - 1) * limit;

    const params = [req.orgId];
    let filter = 's.org_id = $1';
    if (req.user.role === 'employee') {
      params.push(req.user.sub);
      filter += ` AND s.user_id = $${params.length}`;
    }

    const rows = await query(
      `SELECT
          s.id,
          s.user_id,
          s.device_id,
          s.captured_at,
          s.created_at,
          u.full_name,
          u.email
       FROM screenshots s
       JOIN users u ON u.id = s.user_id AND u.org_id = s.org_id
       WHERE ${filter}
       ORDER BY s.captured_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const count = await query(`SELECT COUNT(*)::int AS total FROM screenshots s WHERE ${filter}`, params);
    return res.json({ page, limit, total: count.rows[0].total, data: rows.rows });
  } catch (err) {
    return next(err);
  }
});

router.get('/local/:id', async (req, res, next) => {
  try {
    const token = req.query.token;
    if (!token) return res.status(401).json({ message: 'Missing token' });

    let payload;
    try {
      payload = jwt.verify(String(token), config.accessSecret);
    } catch {
      return res.status(401).json({ message: 'Invalid token' });
    }

    if (payload.sid !== req.params.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const row = await query(`SELECT id, org_id, s3_key, storage_url FROM screenshots WHERE id = $1 AND org_id = $2`, [
      req.params.id,
      payload.org_id
    ]);
    if (!row.rows.length) return res.status(404).json({ message: 'Screenshot not found' });
    if (!String(row.rows[0].storage_url).startsWith('local://')) {
      return res.status(400).json({ message: 'Not a local screenshot' });
    }

    const fullPath = getLocalScreenshotPath(row.rows[0].s3_key);
    if (!fs.existsSync(fullPath)) return res.status(404).json({ message: 'File not found' });

    // Allow the web dashboard (different port/origin in dev) to render image previews.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    return res.sendFile(fullPath);
  } catch (err) {
    return next(err);
  }
});

router.get('/:id/url', authRequired, validateOrgScope, async (req, res, next) => {
  try {
    const row = await query(`SELECT id, s3_key, user_id, storage_url FROM screenshots WHERE id = $1 AND org_id = $2`, [
      req.params.id,
      req.orgId
    ]);
    if (!row.rows.length) return res.status(404).json({ message: 'Screenshot not found' });
    if (req.user.role === 'employee' && row.rows[0].user_id !== req.user.sub) return res.status(403).json({ message: 'Forbidden' });

    if (useLocalScreenshotStorage || String(row.rows[0].storage_url).startsWith('local://')) {
      const localToken = jwt.sign(
        { sid: row.rows[0].id, org_id: req.orgId },
        config.accessSecret,
        { expiresIn: '5m' }
      );
      const url = `${config.appBaseUrl}/screenshots/local/${row.rows[0].id}?token=${encodeURIComponent(localToken)}`;
      return res.json({ signed_url: url, expires_in_seconds: 300 });
    }

    const url = await getScreenshotSignedUrl(row.rows[0].s3_key, 300);
    return res.json({ signed_url: url, expires_in_seconds: 300 });
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id', authRequired, validateOrgScope, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const existing = await query(
      `SELECT id, s3_key, storage_url
       FROM screenshots
       WHERE id = $1 AND org_id = $2
       LIMIT 1`,
      [req.params.id, req.orgId]
    );
    if (!existing.rows.length) return res.status(404).json({ message: 'Screenshot not found' });

    const shot = existing.rows[0];
    await deleteScreenshotObject(shot.s3_key, shot.storage_url);

    const deleted = await query(
      `DELETE FROM screenshots
       WHERE id = $1 AND org_id = $2
       RETURNING id, user_id, captured_at`,
      [req.params.id, req.orgId]
    );

    if (!deleted.rows.length) return res.status(404).json({ message: 'Screenshot not found' });
    return res.json({ ok: true, deleted: deleted.rows[0] });
  } catch (err) {
    return next(err);
  }
});

export default router;
