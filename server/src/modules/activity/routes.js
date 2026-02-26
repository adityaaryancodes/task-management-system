import { Router } from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../../config/db.js';
import { authRequired } from '../../middleware/auth.js';
import { validateOrgScope } from '../../middleware/orgScope.js';
import { validate } from '../../utils/validation.js';

const router = Router();

const batchSchema = Joi.object({
  events: Joi.array()
    .items(
      Joi.object({
        ts: Joi.date().iso().required(),
        app_name: Joi.string().max(255).required(),
        window_title: Joi.string().max(255).allow('', null),
        activity_type: Joi.string().valid('active', 'idle').required(),
        idle_seconds: Joi.number().integer().min(0).required(),
        duration_seconds: Joi.number().integer().min(1).required(),
        device_id: Joi.string().uuid().required()
      })
    )
    .min(1)
    .max(500)
    .required()
});

router.post('/batch', authRequired, validateOrgScope, async (req, res, next) => {
  try {
    const { error, value } = validate(batchSchema, req.body);
    if (error) return res.status(400).json({ message: 'Validation failed', errors: error });

    await Promise.all(
      value.events.map((event) =>
        query(
          `INSERT INTO activity_logs (id, org_id, user_id, device_id, event_at, app_name, window_title, activity_type, idle_seconds, duration_seconds)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            uuidv4(),
            req.orgId,
            req.user.sub,
            event.device_id,
            event.ts,
            event.app_name,
            event.window_title || null,
            event.activity_type,
            event.idle_seconds,
            event.duration_seconds
          ]
        )
      )
    );

    return res.status(202).json({ accepted: value.events.length });
  } catch (err) {
    return next(err);
  }
});

export default router;
