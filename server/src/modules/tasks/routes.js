import { Router } from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../../config/db.js';
import { authRequired } from '../../middleware/auth.js';
import { validateOrgScope } from '../../middleware/orgScope.js';
import { requireRole } from '../../middleware/rbac.js';
import { paginationSchema, validate } from '../../utils/validation.js';

const router = Router();

const createTaskSchema = Joi.object({
  assignee_user_id: Joi.string().uuid().required(),
  title: Joi.string().min(2).max(255).required(),
  description: Joi.string().allow('', null),
  due_date: Joi.date().iso().allow(null)
});

router.post('/', authRequired, validateOrgScope, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const { error, value } = validate(createTaskSchema, req.body);
    if (error) return res.status(400).json({ message: 'Validation failed', errors: error });

    const created = await query(
      `INSERT INTO tasks (id, org_id, assignee_user_id, created_by_user_id, title, description, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, org_id, assignee_user_id, created_by_user_id, title, description, status, due_date, created_at`,
      [uuidv4(), req.orgId, value.assignee_user_id, req.user.sub, value.title, value.description || null, value.due_date || null]
    );

    return res.status(201).json(created.rows[0]);
  } catch (err) {
    return next(err);
  }
});

router.get('/', authRequired, validateOrgScope, async (req, res, next) => {
  try {
    const q = validate(paginationSchema, req.query);
    if (q.error) return res.status(400).json({ message: 'Validation failed', errors: q.error });

    const { page, limit } = q.value;
    const offset = (page - 1) * limit;
    const baseParams = [req.orgId];
    let filter = 'org_id = $1';

    if (req.user.role === 'employee') {
      baseParams.push(req.user.sub);
      filter += ` AND assignee_user_id = $${baseParams.length}`;
    }

    const rows = await query(
      `SELECT id, org_id, assignee_user_id, created_by_user_id, title, description, status, due_date, created_at
       FROM tasks
       WHERE ${filter}
       ORDER BY created_at DESC
       LIMIT $${baseParams.length + 1} OFFSET $${baseParams.length + 2}`,
      [...baseParams, limit, offset]
    );

    const count = await query(`SELECT COUNT(*)::int AS total FROM tasks WHERE ${filter}`, baseParams);
    return res.json({ page, limit, total: count.rows[0].total, data: rows.rows });
  } catch (err) {
    return next(err);
  }
});

const updateTaskSchema = Joi.object({
  title: Joi.string().min(2).max(255),
  description: Joi.string().allow('', null),
  status: Joi.string().valid('todo', 'in_progress', 'completed'),
  due_date: Joi.date().iso().allow(null)
}).min(1);

router.patch('/:id', authRequired, validateOrgScope, async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const { error, value } = validate(updateTaskSchema, req.body);
    if (error) return res.status(400).json({ message: 'Validation failed', errors: error });

    const task = await query(`SELECT id, assignee_user_id FROM tasks WHERE id = $1 AND org_id = $2`, [taskId, req.orgId]);
    if (!task.rows.length) return res.status(404).json({ message: 'Task not found' });
    if (req.user.role === 'employee' && task.rows[0].assignee_user_id !== req.user.sub) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const fields = [];
    const params = [taskId, req.orgId];
    if (value.title !== undefined) {
      params.push(value.title);
      fields.push(`title = $${params.length}`);
    }
    if (value.description !== undefined) {
      params.push(value.description || null);
      fields.push(`description = $${params.length}`);
    }
    if (value.status !== undefined) {
      params.push(value.status);
      fields.push(`status = $${params.length}`);
      if (value.status === 'completed') fields.push('completed_at = NOW()');
    }
    if (value.due_date !== undefined) {
      params.push(value.due_date || null);
      fields.push(`due_date = $${params.length}`);
    }

    const updated = await query(
      `UPDATE tasks
       SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $1 AND org_id = $2
       RETURNING id, title, description, status, due_date, updated_at`,
      params
    );
    return res.json(updated.rows[0]);
  } catch (err) {
    return next(err);
  }
});

export default router;

