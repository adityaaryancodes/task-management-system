import cron from 'node-cron';
import { query } from '../config/db.js';

export function startNightlyAggregation() {
  cron.schedule('10 0 * * *', async () => {
    try {
      await query(`
        INSERT INTO daily_productivity_summaries (id, org_id, user_id, summary_date, active_seconds, idle_seconds, total_events)
        SELECT
          gen_random_uuid(),
          org_id,
          user_id,
          date(event_at) AS summary_date,
          COALESCE(SUM(CASE WHEN activity_type = 'active' THEN duration_seconds ELSE 0 END), 0) AS active_seconds,
          COALESCE(SUM(CASE WHEN activity_type = 'idle' THEN duration_seconds ELSE 0 END), 0) AS idle_seconds,
          COUNT(*)::int AS total_events
        FROM activity_logs
        WHERE event_at >= date_trunc('day', NOW() - interval '1 day')
          AND event_at < date_trunc('day', NOW())
        GROUP BY org_id, user_id, date(event_at)
        ON CONFLICT (org_id, user_id, summary_date)
        DO UPDATE SET
          active_seconds = EXCLUDED.active_seconds,
          idle_seconds = EXCLUDED.idle_seconds,
          total_events = EXCLUDED.total_events,
          updated_at = NOW();
      `);
      console.log('Nightly productivity aggregation complete');
    } catch (err) {
      console.error('Aggregation job failed', err);
    }
  });
}
