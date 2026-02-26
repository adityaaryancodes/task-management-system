import { Router } from 'express';
import { authRequired } from '../../middleware/auth.js';
import { validateOrgScope } from '../../middleware/orgScope.js';
import { requireRole } from '../../middleware/rbac.js';
import { query } from '../../config/db.js';

const router = Router();

function buildPerEmployeeSeries(employees, rows) {
  const byUser = new Map(
    employees.map((employee) => [
      employee.user_id,
      {
        user_id: employee.user_id,
        full_name: employee.full_name,
        email: employee.email,
        series: []
      }
    ])
  );

  rows.forEach((row) => {
    if (!byUser.has(row.user_id)) {
      byUser.set(row.user_id, {
        user_id: row.user_id,
        full_name: row.full_name,
        email: row.email,
        series: []
      });
    }

    byUser.get(row.user_id).series.push({
      date: row.date,
      active_minutes: row.active_minutes,
      idle_minutes: row.idle_minutes
    });
  });

  return Array.from(byUser.values());
}

router.get('/overview', authRequired, validateOrgScope, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const selectedUserId = typeof req.query.user_id === 'string' ? req.query.user_id.trim() : '';
    let selectedEmployee = null;
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (selectedUserId && !uuidPattern.test(selectedUserId)) {
      return res.status(400).json({ message: 'Invalid user_id format' });
    }

    if (selectedUserId) {
      const employeeCheck = await query(
        `SELECT id, full_name, email
         FROM users
         WHERE org_id = $1 AND id = $2 AND role = 'employee'
         LIMIT 1`,
        [req.orgId, selectedUserId]
      );
      if (!employeeCheck.rows.length) {
        return res.status(404).json({ message: 'Employee not found in this organization' });
      }
      selectedEmployee = employeeCheck.rows[0];
    }

    const employees = await query(
      `SELECT COUNT(*)::int AS total
       FROM users
       WHERE org_id = $1
         AND role = 'employee'
         ${selectedUserId ? 'AND id = $2' : ''}`,
      selectedUserId ? [req.orgId, selectedUserId] : [req.orgId]
    );

    const activeToday = await query(
      `SELECT COUNT(DISTINCT user_id)::int AS total
       FROM attendance
       WHERE org_id = $1
         AND login_at >= date_trunc('day', NOW())
         ${selectedUserId ? 'AND user_id = $2' : ''}`,
      selectedUserId ? [req.orgId, selectedUserId] : [req.orgId]
    );

    const completion = await query(
      `SELECT
         CASE WHEN COUNT(*) = 0 THEN 0
         ELSE ROUND((SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric) * 100)::int
         END AS rate
       FROM tasks
       WHERE org_id = $1
         AND created_at >= NOW() - interval '7 days'
         ${selectedUserId ? 'AND assignee_user_id = $2' : ''}`,
      selectedUserId ? [req.orgId, selectedUserId] : [req.orgId]
    );

    const daily = await query(
      `SELECT to_char(summary_date, 'YYYY-MM-DD') AS date,
              ROUND(SUM(active_seconds) / 60.0)::int AS active,
              ROUND(SUM(idle_seconds) / 60.0)::int AS idle
       FROM daily_productivity_summaries
       WHERE org_id = $1
         ${selectedUserId ? 'AND user_id = $2' : ''}
       GROUP BY summary_date
       ORDER BY summary_date DESC
       LIMIT 7`,
      selectedUserId ? [req.orgId, selectedUserId] : [req.orgId]
    );

    const appUsage = await query(
      `SELECT app_name AS app, ROUND(SUM(duration_seconds) / 60.0)::int AS minutes
       FROM activity_logs
       WHERE org_id = $1
         AND event_at >= NOW() - interval '7 days'
         ${selectedUserId ? 'AND user_id = $2' : ''}
       GROUP BY app_name
       ORDER BY minutes DESC
       LIMIT 6`,
      selectedUserId ? [req.orgId, selectedUserId] : [req.orgId]
    );

    return res.json({
      summary: {
        totalEmployees: employees.rows[0].total,
        activeToday: activeToday.rows[0].total,
        taskCompletion: completion.rows[0].rate
      },
      selectedEmployee,
      activeIdleSeries: daily.rows.reverse(),
      appUsage: appUsage.rows
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/productivity', authRequired, validateOrgScope, async (req, res, next) => {
  try {
    const scopedToCurrentUser = req.query.scope === 'me' || req.user.role === 'employee';
    const groupByUser = req.query.group_by === 'user';

    if (groupByUser) {
      const groupedParams = [req.orgId];
      let employeeWhere = `org_id = $1 AND role = 'employee'`;
      let summaryWhere = 'd.org_id = $1';
      let liveWhere = 'logs.org_id = $1';

      if (scopedToCurrentUser) {
        groupedParams.push(req.user.sub);
        const userParamIndex = groupedParams.length;
        employeeWhere += ` AND id = $${userParamIndex}`;
        summaryWhere += ` AND d.user_id = $${userParamIndex}`;
        liveWhere += ` AND logs.user_id = $${userParamIndex}`;
      }

      const employees = await query(
        `SELECT id AS user_id, full_name, email
         FROM users
         WHERE ${employeeWhere}
         ORDER BY full_name ASC`,
        groupedParams
      );

      const summaryRows = await query(
        `WITH ranked AS (
          SELECT
            d.user_id,
            u.full_name,
            u.email,
            to_char(d.summary_date, 'YYYY-MM-DD') AS date,
            ROUND(d.active_seconds / 60.0)::int AS active_minutes,
            ROUND(d.idle_seconds / 60.0)::int AS idle_minutes,
            ROW_NUMBER() OVER (PARTITION BY d.user_id ORDER BY d.summary_date DESC) AS rn
          FROM daily_productivity_summaries d
          JOIN users u ON u.id = d.user_id AND u.org_id = d.org_id
          WHERE ${summaryWhere}
            AND u.role = 'employee'
        )
        SELECT user_id, full_name, email, date, active_minutes, idle_minutes
        FROM ranked
        WHERE rn <= 14
        ORDER BY full_name ASC, date ASC`,
        groupedParams
      );

      if (summaryRows.rows.length) {
        return res.json({ data: buildPerEmployeeSeries(employees.rows, summaryRows.rows) });
      }

      const liveRows = await query(
        `WITH per_day AS (
          SELECT
            logs.user_id,
            u.full_name,
            u.email,
            date(logs.event_at) AS activity_date,
            ROUND(SUM(CASE WHEN logs.activity_type = 'active' THEN logs.duration_seconds ELSE 0 END) / 60.0)::int AS active_minutes,
            ROUND(SUM(CASE WHEN logs.activity_type = 'idle' THEN logs.duration_seconds ELSE 0 END) / 60.0)::int AS idle_minutes
          FROM activity_logs logs
          JOIN users u ON u.id = logs.user_id AND u.org_id = logs.org_id
          WHERE ${liveWhere}
            AND logs.event_at >= NOW() - interval '14 days'
            AND u.role = 'employee'
          GROUP BY logs.user_id, u.full_name, u.email, date(logs.event_at)
        ),
        ranked AS (
          SELECT
            user_id,
            full_name,
            email,
            to_char(activity_date, 'YYYY-MM-DD') AS date,
            active_minutes,
            idle_minutes,
            ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY activity_date DESC) AS rn
          FROM per_day
        )
        SELECT user_id, full_name, email, date, active_minutes, idle_minutes
        FROM ranked
        WHERE rn <= 14
        ORDER BY full_name ASC, date ASC`,
        groupedParams
      );

      return res.json({ data: buildPerEmployeeSeries(employees.rows, liveRows.rows) });
    }

    const params = [req.orgId];
    let where = 'org_id = $1';
    if (scopedToCurrentUser) {
      params.push(req.user.sub);
      where += ` AND user_id = $${params.length}`;
    }

    const summaryRows = await query(
      `SELECT
          to_char(summary_date, 'YYYY-MM-DD') AS date,
          ROUND(SUM(active_seconds) / 60.0)::int AS active_minutes,
          ROUND(SUM(idle_seconds) / 60.0)::int AS idle_minutes
       FROM daily_productivity_summaries
       WHERE ${where}
       GROUP BY summary_date
       ORDER BY summary_date DESC
       LIMIT 14`,
      params
    );

    if (summaryRows.rows.length) {
      return res.json({ data: summaryRows.rows.reverse() });
    }

    // Fallback for fresh setups where nightly aggregation has not run yet.
    const liveRows = await query(
      `SELECT
          to_char(date(event_at), 'YYYY-MM-DD') AS date,
          ROUND(SUM(CASE WHEN activity_type = 'active' THEN duration_seconds ELSE 0 END) / 60.0)::int AS active_minutes,
          ROUND(SUM(CASE WHEN activity_type = 'idle' THEN duration_seconds ELSE 0 END) / 60.0)::int AS idle_minutes
       FROM activity_logs
       WHERE ${where}
         AND event_at >= NOW() - interval '14 days'
       GROUP BY date(event_at)
       ORDER BY date(event_at) DESC
       LIMIT 14`,
      params
    );

    return res.json({ data: liveRows.rows.reverse() });
  } catch (err) {
    return next(err);
  }
});

export default router;
