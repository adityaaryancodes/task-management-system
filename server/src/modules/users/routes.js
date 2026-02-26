import { Router } from 'express';
import Joi from 'joi';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { authRequired } from '../../middleware/auth.js';
import { validateOrgScope } from '../../middleware/orgScope.js';
import { requireRole } from '../../middleware/rbac.js';
import { paginationSchema, validate } from '../../utils/validation.js';
import { query } from '../../config/db.js';

const router = Router();

const userListSchema = Joi.object({
  role: Joi.string().valid('owner', 'manager', 'employee').optional()
});

const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  full_name: Joi.string().min(2).max(120).required(),
  password: Joi.string().min(8).max(128).required(),
  role: Joi.string().valid('manager', 'employee').required()
});

router.post('/', authRequired, validateOrgScope, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const v = validate(createUserSchema, req.body);
    if (v.error) return res.status(400).json({ message: 'Validation failed', errors: v.error });

    const payload = v.value;
    const passwordHash = await bcrypt.hash(payload.password, 12);

    const inserted = await query(
      `INSERT INTO users (id, org_id, email, full_name, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (org_id, email) DO NOTHING
       RETURNING id, org_id, email, full_name, role, created_at`,
      [uuidv4(), req.orgId, payload.email.toLowerCase(), payload.full_name, passwordHash, payload.role]
    );

    if (!inserted.rows.length) return res.status(409).json({ message: 'User already exists in organization' });
    return res.status(201).json(inserted.rows[0]);
  } catch (err) {
    return next(err);
  }
});

router.get('/', authRequired, validateOrgScope, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const p = validate(paginationSchema, req.query);
    const q = validate(userListSchema, req.query);
    if (p.error || q.error) return res.status(400).json({ message: 'Validation failed', errors: [...(p.error || []), ...(q.error || [])] });

    const { page, limit } = p.value;
    const offset = (page - 1) * limit;
    const params = [req.orgId];
    let filter = 'org_id = $1';
    if (q.value.role) {
      params.push(q.value.role);
      filter += ` AND role = $${params.length}`;
    }

    const rows = await query(
      `SELECT id, org_id, email, full_name, role, created_at
       FROM users
       WHERE ${filter}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    const count = await query(`SELECT COUNT(*)::int AS total FROM users WHERE ${filter}`, params);

    return res.json({ page, limit, total: count.rows[0].total, data: rows.rows });
  } catch (err) {
    return next(err);
  }
});

export default router;
