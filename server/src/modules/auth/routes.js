import { Router } from 'express';
import Joi from 'joi';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { pool, query } from '../../config/db.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/tokens.js';
import { validate } from '../../utils/validation.js';
import { authRateLimit } from '../../middleware/rateLimit.js';

const router = Router();

const registerSchema = Joi.object({
  organization_name: Joi.string().min(2).max(120).required(),
  owner_email: Joi.string().email().required(),
  owner_name: Joi.string().min(2).max(120).required(),
  password: Joi.string().min(8).max(128).required()
});

router.post('/register-org', authRateLimit, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { error, value } = validate(registerSchema, req.body);
    if (error) return res.status(400).json({ message: 'Validation failed', errors: error });

    const orgId = uuidv4();
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(value.password, 12);

    await client.query('BEGIN');
    await client.query(`INSERT INTO organizations (id, org_id, name) VALUES ($1, $1, $2)`, [orgId, value.organization_name]);
    await client.query(
      `INSERT INTO users (id, org_id, email, full_name, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, 'owner')`,
      [userId, orgId, value.owner_email.toLowerCase(), value.owner_name, passwordHash]
    );
    await client.query(
      `INSERT INTO plan_features (id, org_id, plan_name, max_users, screenshot_interval_minutes)
       VALUES ($1, $2, 'starter', 10000, 15)`,
      [uuidv4(), orgId]
    );
    await client.query('COMMIT');

    return res.status(201).json({ org_id: orgId, owner_user_id: userId });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return next(err);
  } finally {
    client.release();
  }
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  device_identifier: Joi.string().min(6).max(255).required(),
  device_name: Joi.string().max(120).required(),
  os_version: Joi.string().max(120).allow('', null)
});

router.post('/login', authRateLimit, async (req, res, next) => {
  try {
    const { error, value } = validate(loginSchema, req.body);
    if (error) return res.status(400).json({ message: 'Validation failed', errors: error });

    const userRes = await query(
      `SELECT id, org_id, email, full_name, password_hash, role, is_active
       FROM users WHERE email = $1`,
      [value.email.toLowerCase()]
    );

    const user = userRes.rows[0];
    if (!user || !user.is_active) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(value.password, user.password_hash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const deviceRes = await query(
      `INSERT INTO devices (id, org_id, user_id, device_identifier, device_name, os_version, last_seen_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (org_id, device_identifier)
       DO UPDATE SET user_id = EXCLUDED.user_id, device_name = EXCLUDED.device_name, os_version = EXCLUDED.os_version, last_seen_at = NOW()
       RETURNING id`,
      [uuidv4(), user.org_id, user.id, value.device_identifier, value.device_name, value.os_version || null]
    );

    const session = {
      sub: user.id,
      org_id: user.org_id,
      role: user.role,
      device_id: deviceRes.rows[0].id
    };

    const accessToken = signAccessToken(session);
    const refreshToken = signRefreshToken(session);

    await query(
      `INSERT INTO user_refresh_tokens (id, org_id, user_id, device_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4, crypt($5, gen_salt('bf')), NOW() + interval '7 days')`,
      [uuidv4(), user.org_id, user.id, deviceRes.rows[0].id, refreshToken]
    );

    return res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        org_id: user.org_id,
        role: user.role,
        full_name: user.full_name,
        email: user.email
      }
    });
  } catch (err) {
    return next(err);
  }
});

const refreshSchema = Joi.object({
  refresh_token: Joi.string().required()
});

router.post('/refresh', authRateLimit, async (req, res) => {
  try {
    const { error, value } = validate(refreshSchema, req.body);
    if (error) return res.status(400).json({ message: 'Validation failed', errors: error });

    const payload = verifyRefreshToken(value.refresh_token);
    const validToken = await query(
      `SELECT id FROM user_refresh_tokens
       WHERE user_id = $1 AND org_id = $2 AND device_id = $3
       AND expires_at > NOW() AND revoked_at IS NULL
       AND token_hash = crypt($4, token_hash)
       ORDER BY created_at DESC LIMIT 1`,
      [payload.sub, payload.org_id, payload.device_id, value.refresh_token]
    );

    if (!validToken.rows.length) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const nextPayload = {
      sub: payload.sub,
      org_id: payload.org_id,
      role: payload.role,
      device_id: payload.device_id
    };

    return res.json({ access_token: signAccessToken(nextPayload) });
  } catch {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
});

export default router;
