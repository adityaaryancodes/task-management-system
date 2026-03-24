import { Router } from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../../config/db.js';
import { authRequired } from '../../middleware/auth.js';
import { validateOrgScope } from '../../middleware/orgScope.js';
import { requireRole } from '../../middleware/rbac.js';
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

router.get('/live-status', authRequired, validateOrgScope, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const rows = await query(
      `WITH employees AS (
         SELECT id AS user_id, full_name, email
         FROM users
         WHERE org_id = $1
           AND role = 'employee'
           AND is_active = TRUE
       ),
       latest_attendance AS (
         SELECT DISTINCT ON (a.user_id)
           a.user_id,
           a.id AS attendance_id,
           a.device_id,
           a.login_at
         FROM attendance a
         WHERE a.org_id = $1
           AND a.logout_at IS NULL
         ORDER BY a.user_id, a.login_at DESC
       ),
       latest_device AS (
         SELECT DISTINCT ON (d.user_id)
           d.user_id,
           d.id AS device_id,
           d.device_name,
           d.last_seen_at,
           d.cpu_percent,
           d.memory_percent
         FROM devices d
         WHERE d.org_id = $1
         ORDER BY d.user_id, COALESCE(d.last_seen_at, d.updated_at, d.created_at) DESC
       ),
       latest_activity AS (
         SELECT DISTINCT ON (logs.user_id)
           logs.user_id,
           logs.device_id,
           logs.event_at,
           logs.app_name,
           logs.window_title,
           logs.activity_type,
           logs.idle_seconds,
           logs.duration_seconds
         FROM activity_logs logs
         WHERE logs.org_id = $1
           AND logs.event_at >= NOW() - interval '1 day'
         ORDER BY logs.user_id, logs.event_at DESC
       ),
       current_task AS (
         SELECT DISTINCT ON (t.assignee_user_id)
           t.assignee_user_id AS user_id,
           t.id AS task_id,
           t.title,
           t.status,
           t.due_date
         FROM tasks t
         WHERE t.org_id = $1
           AND t.status <> 'completed'
         ORDER BY
           t.assignee_user_id,
           CASE
             WHEN t.status = 'in_progress' THEN 0
             WHEN t.due_date IS NOT NULL THEN 1
             ELSE 2
           END,
           COALESCE(t.due_date, t.updated_at, t.created_at) ASC
       )
       SELECT
         e.user_id,
         e.full_name,
         e.email,
         COALESCE(ld.device_id, la.device_id, lat.device_id) AS device_id,
         ld.device_name,
         ld.last_seen_at,
         lat.login_at,
         la.event_at AS latest_activity_at,
         CASE
           WHEN lat.attendance_id IS NULL THEN 'offline'
           WHEN COALESCE(ld.last_seen_at, la.event_at, lat.login_at) < NOW() - interval '10 minutes' THEN 'offline'
           WHEN la.activity_type = 'idle' OR COALESCE(la.idle_seconds, 0) >= 300 THEN 'idle'
           ELSE 'active'
         END AS status,
         CASE
           WHEN lat.attendance_id IS NULL THEN NULL
           WHEN COALESCE(ld.last_seen_at, la.event_at, lat.login_at) < NOW() - interval '10 minutes' THEN NULL
           WHEN la.activity_type = 'idle' OR COALESCE(la.idle_seconds, 0) >= 300 THEN NULL
           ELSE la.app_name
         END AS current_app,
         CASE
           WHEN lat.attendance_id IS NULL THEN NULL
           WHEN COALESCE(ld.last_seen_at, la.event_at, lat.login_at) < NOW() - interval '10 minutes' THEN NULL
           WHEN la.activity_type = 'idle' OR COALESCE(la.idle_seconds, 0) >= 300 THEN NULL
           ELSE la.window_title
         END AS current_window_title,
         CASE
           WHEN lat.attendance_id IS NULL THEN 0
           WHEN la.activity_type = 'idle'
             THEN GREATEST(
               ROUND(COALESCE(la.idle_seconds, 0) / 60.0)::int,
               ROUND(EXTRACT(EPOCH FROM (NOW() - la.event_at)) / 60.0)::int
             )
           ELSE 0
         END AS idle_minutes,
         ct.task_id,
         ct.title AS current_task,
         ct.status AS current_task_status,
         ct.due_date
       FROM employees e
       LEFT JOIN latest_attendance lat ON lat.user_id = e.user_id
       LEFT JOIN latest_device ld ON ld.user_id = e.user_id
       LEFT JOIN latest_activity la ON la.user_id = e.user_id
       LEFT JOIN current_task ct ON ct.user_id = e.user_id
       ORDER BY
         CASE
           WHEN lat.attendance_id IS NULL THEN 2
           WHEN COALESCE(ld.last_seen_at, la.event_at, lat.login_at) < NOW() - interval '10 minutes' THEN 2
           WHEN la.activity_type = 'idle' OR COALESCE(la.idle_seconds, 0) >= 300 THEN 1
           ELSE 0
         END,
         e.full_name ASC`,
      [req.orgId]
    );

    return res.json({ data: rows.rows });
  } catch (err) {
    return next(err);
  }
});

export default router;
