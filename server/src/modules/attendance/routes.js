import { Router } from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../../config/db.js';
import { authRequired } from '../../middleware/auth.js';
import { validateOrgScope } from '../../middleware/orgScope.js';
import { paginationSchema, validate } from '../../utils/validation.js';

const router = Router();

const attendanceLoginSchema = Joi.object({
  device_id: Joi.string().uuid().required()
});

router.post('/login', authRequired, validateOrgScope, async (req, res, next) => {
  try {
    const { error, value } = validate(attendanceLoginSchema, req.body);
    if (error) return res.status(400).json({ message: 'Validation failed', errors: error });

    const device = await query(
      `SELECT id FROM devices WHERE id = $1 AND org_id = $2 AND user_id = $3 AND is_active = true`,
      [value.device_id, req.orgId, req.user.sub]
    );
    if (!device.rows.length) return res.status(403).json({ message: 'Invalid device binding' });

    const active = await query(
      `SELECT id FROM attendance WHERE org_id = $1 AND user_id = $2 AND logout_at IS NULL ORDER BY login_at DESC LIMIT 1`,
      [req.orgId, req.user.sub]
    );
    if (active.rows.length) return res.status(409).json({ message: 'Already logged in' });

    const inserted = await query(
      `INSERT INTO attendance (id, org_id, user_id, device_id, login_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, login_at`,
      [uuidv4(), req.orgId, req.user.sub, value.device_id]
    );
    return res.status(201).json(inserted.rows[0]);
  } catch (err) {
    return next(err);
  }
});

const attendanceLogoutSchema = Joi.object({
  attendance_id: Joi.string().uuid().required()
});

router.post('/logout', authRequired, validateOrgScope, async (req, res, next) => {
  try {
    const { error, value } = validate(attendanceLogoutSchema, req.body);
    if (error) return res.status(400).json({ message: 'Validation failed', errors: error });

    const updated = await query(
      `UPDATE attendance
       SET logout_at = NOW(),
           session_seconds = EXTRACT(EPOCH FROM (NOW() - login_at))::int,
           updated_at = NOW()
       WHERE id = $1 AND org_id = $2 AND user_id = $3 AND logout_at IS NULL
       RETURNING id, login_at, logout_at, session_seconds`,
      [value.attendance_id, req.orgId, req.user.sub]
    );

    if (!updated.rows.length) return res.status(404).json({ message: 'Attendance session not found' });
    return res.json(updated.rows[0]);
  } catch (err) {
    return next(err);
  }
});

router.get('/logs', authRequired, validateOrgScope, async (req, res, next) => {
  try {
    const p = validate(paginationSchema, req.query);
    if (p.error) return res.status(400).json({ message: 'Validation failed', errors: p.error });
    const { page, limit } = p.value;
    const offset = (page - 1) * limit;

    const scope = req.query.scope;
    const params = [req.orgId];
    let filter = 'a.org_id = $1';

    if (scope === 'me' || req.user.role === 'employee') {
      params.push(req.user.sub);
      filter += ` AND a.user_id = $${params.length}`;
    }

    const rows = await query(
      `SELECT
         a.id,
         a.user_id,
         a.login_at,
         a.logout_at,
         EXTRACT(EPOCH FROM (COALESCE(a.logout_at, NOW()) - a.login_at))::int AS session_seconds,
         u.full_name
       FROM attendance a
       JOIN users u ON u.id = a.user_id
       WHERE ${filter}
       ORDER BY a.login_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const count = await query(`SELECT COUNT(*)::int AS total FROM attendance a WHERE ${filter}`, params);
    return res.json({ page, limit, total: count.rows[0].total, data: rows.rows });
  } catch (err) {
    return next(err);
  }
});

export default router;
