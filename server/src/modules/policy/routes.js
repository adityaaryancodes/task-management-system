import { Router } from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { authRequired } from '../../middleware/auth.js';
import { validateOrgScope } from '../../middleware/orgScope.js';
import { requireRole } from '../../middleware/rbac.js';
import { query } from '../../config/db.js';
import { validate } from '../../utils/validation.js';
import { publishPolicyAlertCreated, publishPolicyAlertResolved } from '../../realtime/policyAlertsWs.js';

const router = Router();

const createAlertSchema = Joi.object({
  device_id: Joi.string().uuid().required(),
  app_name: Joi.string().trim().min(1).max(255).required(),
  window_title: Joi.string().max(255).allow('', null),
  detected_at: Joi.date().iso().required()
});

const listAlertsSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  unresolved_only: Joi.boolean().default(false),
  user_id: Joi.string().uuid().optional()
});

router.post('/alerts', authRequired, validateOrgScope, async (req, res, next) => {
  try {
    const { error, value } = validate(createAlertSchema, req.body);
    if (error) return res.status(400).json({ message: 'Validation failed', errors: error });

    const deviceCheck = await query(
      `SELECT id
       FROM devices
       WHERE id = $1 AND org_id = $2 AND user_id = $3
       LIMIT 1`,
      [value.device_id, req.orgId, req.user.sub]
    );
    if (!deviceCheck.rows.length) return res.status(403).json({ message: 'Invalid device binding' });

    const duplicate = await query(
      `SELECT id
       FROM policy_alerts
       WHERE org_id = $1
         AND user_id = $2
         AND device_id = $3
         AND lower(app_name) = lower($4)
         AND detected_at >= NOW() - interval '60 seconds'
       ORDER BY detected_at DESC
       LIMIT 1`,
      [req.orgId, req.user.sub, value.device_id, value.app_name]
    );
    if (duplicate.rows.length) {
      return res.json({ ok: true, deduped: true, id: duplicate.rows[0].id });
    }

    const inserted = await query(
      `INSERT INTO policy_alerts (id, org_id, user_id, device_id, app_name, window_title, detected_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, app_name, detected_at`,
      [
        uuidv4(),
        req.orgId,
        req.user.sub,
        value.device_id,
        value.app_name.trim(),
        value.window_title || null,
        value.detected_at
      ]
    );

    const alertId = inserted.rows[0].id;
    const details = await query(
      `SELECT
          a.id,
          a.user_id,
          a.device_id,
          a.app_name,
          a.window_title,
          a.detected_at,
          a.resolved_at,
          u.full_name,
          u.email,
          d.device_name
       FROM policy_alerts a
       JOIN users u ON u.id = a.user_id AND u.org_id = a.org_id
       JOIN devices d ON d.id = a.device_id AND d.org_id = a.org_id
       WHERE a.id = $1 AND a.org_id = $2
       LIMIT 1`,
      [alertId, req.orgId]
    );
    const alert = details.rows[0] || inserted.rows[0];
    publishPolicyAlertCreated(req.orgId, alert);

    return res.status(201).json({ ok: true, deduped: false, alert });
  } catch (err) {
    return next(err);
  }
});

router.get('/alerts', authRequired, validateOrgScope, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const parsed = validate(listAlertsSchema, req.query);
    if (parsed.error) return res.status(400).json({ message: 'Validation failed', errors: parsed.error });

    const { limit, unresolved_only, user_id } = parsed.value;
    const params = [req.orgId];
    let filter = 'a.org_id = $1';

    if (unresolved_only) {
      filter += ' AND a.resolved_at IS NULL';
    }
    if (user_id) {
      params.push(user_id);
      filter += ` AND a.user_id = $${params.length}`;
    }
    params.push(limit);
    const limitParamIndex = params.length;

    const rows = await query(
      `SELECT
          a.id,
          a.user_id,
          a.device_id,
          a.app_name,
          a.window_title,
          a.detected_at,
          a.resolved_at,
          u.full_name,
          u.email,
          d.device_name
       FROM policy_alerts a
       JOIN users u ON u.id = a.user_id AND u.org_id = a.org_id
       JOIN devices d ON d.id = a.device_id AND d.org_id = a.org_id
       WHERE ${filter}
       ORDER BY a.detected_at DESC
       LIMIT $${limitParamIndex}`,
      params
    );

    return res.json({ data: rows.rows });
  } catch (err) {
    return next(err);
  }
});

router.patch('/alerts/:id/resolve', authRequired, validateOrgScope, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const updated = await query(
      `UPDATE policy_alerts
       SET resolved_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND org_id = $2
       RETURNING id, resolved_at, app_name, user_id, device_id`,
      [req.params.id, req.orgId]
    );
    if (!updated.rows.length) return res.status(404).json({ message: 'Alert not found' });
    publishPolicyAlertResolved(req.orgId, updated.rows[0]);
    return res.json({ ok: true, alert: updated.rows[0] });
  } catch (err) {
    return next(err);
  }
});

export default router;
