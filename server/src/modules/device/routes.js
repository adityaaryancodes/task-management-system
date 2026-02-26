import { Router } from 'express';
import Joi from 'joi';
import { query } from '../../config/db.js';
import { authRequired } from '../../middleware/auth.js';
import { validateOrgScope } from '../../middleware/orgScope.js';
import { validate } from '../../utils/validation.js';

const router = Router();

const heartbeatSchema = Joi.object({
  device_id: Joi.string().uuid().required(),
  cpu_percent: Joi.number().min(0).max(100).allow(null),
  memory_percent: Joi.number().min(0).max(100).allow(null)
});

router.post('/heartbeat', authRequired, validateOrgScope, async (req, res, next) => {
  try {
    const { error, value } = validate(heartbeatSchema, req.body);
    if (error) return res.status(400).json({ message: 'Validation failed', errors: error });

    const updated = await query(
      `UPDATE devices
       SET last_seen_at = NOW(), cpu_percent = $1, memory_percent = $2, updated_at = NOW()
       WHERE id = $3 AND org_id = $4 AND user_id = $5
       RETURNING id, last_seen_at`,
      [value.cpu_percent ?? null, value.memory_percent ?? null, value.device_id, req.orgId, req.user.sub]
    );

    if (!updated.rows.length) return res.status(403).json({ message: 'Invalid device binding' });
    return res.json({ ok: true, device: updated.rows[0] });
  } catch (err) {
    return next(err);
  }
});

export default router;
