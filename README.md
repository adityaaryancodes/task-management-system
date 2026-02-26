# Hybrid Workforce Intelligence Platform

Production-ready modular monolith SaaS implementation with:
- Backend API: Node.js + Express + PostgreSQL
- Web Dashboard: React + Vite + Tailwind + Recharts
- Desktop Agent: Electron + React (Windows-first)
- Multi-tenant data isolation using `org_id` across all domain tables

## Repository Structure

```txt
/
  server/
    sql/schema.sql
    src/
      config/
      middleware/
      jobs/
      modules/
        auth/
        users/
        organizations/
        tasks/
        attendance/
        activity/
        screenshots/
        device/
      utils/
      app.js
      server.js
  desktop/
    main.js
    preload.js
    tracker.js
    sync.js
    renderer/
      src/
  web/
    src/
      components/
      pages/
      lib/
```

## Phase 1: Database + Backend Setup + Auth

### Delivered
- PostgreSQL multi-tenant migration system:
  - `server/sql/migrations/001_auth_authentication.sql`
  - `server/sql/migrations/002_workforce_core.sql`
  - `server/sql/migrations/003_ss_admin_analytics.sql`
  - Migration runner with `schema_migrations` tracking: `server/src/utils/runSchema.js`
- Modular backend app bootstrap: `server/src/app.js`, `server/src/server.js`
- Security baseline:
  - Helmet
  - CORS
  - Global rate limiting + auth route throttling
  - HTTPS enforcement toggle
  - Input validation (Joi)
- JWT access/refresh auth with hashed refresh tokens
- Device-bound login
- Org registration
- Auth endpoints:
  - `POST /auth/register-org`
  - `POST /auth/login`
  - `POST /auth/refresh`

### Integration
1. Copy `server/.env.example` to `server/.env` and fill secrets/DB/S3 config.
2. For Neon:
   - Create a new Neon **project/database** in the Neon console.
   - Copy the Neon connection string into `DATABASE_URL` in `server/.env`.
3. Run migrations:
   - `npm --workspace server run migrate`
4. Start API:
   - `npm --workspace server run dev`

### Run/Test
- Health check: `GET /health`
- Register org: `POST /auth/register-org`
- Login and verify `access_token`, `refresh_token`, device binding

## Phase 2: Tasks + Attendance

### Delivered
- Task module: `server/src/modules/tasks/routes.js`
  - `POST /tasks`
  - `GET /tasks` (paginated)
  - `PATCH /tasks/:id`
- Attendance module: `server/src/modules/attendance/routes.js`
  - `POST /attendance/login`
  - `POST /attendance/logout`
  - `GET /attendance/logs` (admin + employee scope)
- RBAC + org scope enforcement middleware for route protection
- User onboarding endpoint:
  - `POST /users` (owner/manager can create manager/employee credentials)

### Integration
1. Use bearer token from `/auth/login`.
2. Send `x-org-id` header on all protected requests.
3. For attendance login, send bound `device_id`.

### Run/Test
- Create task as owner/manager, read as employee.
- Start/stop attendance session and verify `session_seconds`.

## Phase 3: Desktop Login + Device Binding

### Delivered
- Electron app:
  - `desktop/main.js`
  - `desktop/preload.js`
  - `desktop/renderer/src/App.jsx`
- Secure token storage using `keytar`
- Per-device identifier persistence
- Device binding during `/auth/login`
- System tray support + autostart on boot
- Visible UI indicator: **Tracking Active**

### Integration
1. Run renderer in dev:
   - `npm --workspace desktop-renderer run dev`
2. Start Electron:
   - `npm --workspace desktop run dev`
3. Login with org user credentials.

### Run/Test
- Confirm login persists across restart.
- Confirm `device_id` is included in JWT payload and heartbeat routes.

## Phase 4: Monitoring Engine

### Delivered
- Activity tracking: `desktop/tracker.js`
  - Active window metadata
  - Idle detection (Electron `powerMonitor`)
- Local queue + sync engine: `desktop/sync.js`
  - Local event queue file
  - Batch upload every 60 seconds to `POST /activity/batch`
  - Heartbeats to `POST /device/heartbeat`
- Backend activity ingestion:
  - `server/src/modules/activity/routes.js`

### Integration
1. Start tracking from desktop UI.
2. Ensure agent can reach backend URL (`API_BASE_URL`).
3. Verify batched records in `activity_logs`.

### Run/Test
- Keep app active/idle and verify activity rows.
- Disable network temporarily and confirm queue replays when restored.

## Phase 5: Screenshot System

### Delivered
- 15-minute desktop screenshot capture: `desktop/tracker.js`
- JPEG compression before upload (Sharp)
- Backend upload endpoint: `POST /screenshots/upload`
- S3 storage with URL-only persistence in DB
- Signed URL retrieval endpoint: `GET /screenshots/:id/url`
- List endpoint: `GET /screenshots`

### Integration
1. Configure AWS credentials and bucket in `server/.env`.
2. Start desktop tracking.
3. Verify records in `screenshots` table and S3 object creation.

### Run/Test
- Confirm screenshot rows store S3 URL/key (not binary).
- Confirm signed URLs expire and are access-scoped by org/role.

## Phase 6: Admin Dashboard Analytics

### Delivered
- React dashboard with protected routes and role segmentation
- Admin pages:
  - Dashboard overview
  - Employee list
  - Task management
  - Attendance logs
  - Activity analytics
  - Screenshot viewer
- Employee pages:
  - My tasks
  - My attendance
  - My productivity analytics
- Recharts visualizations:
  - Active vs idle time
  - App usage breakdown
  - Productivity trend
- Backend analytics endpoints:
  - `GET /analytics/overview`
  - `GET /analytics/productivity`
  - `GET /users`

### Integration
1. Set `VITE_API_BASE_URL` (optional) in web environment.
2. Start web:
   - `npm --workspace web run dev`
3. Login and verify role-based route access.

### Run/Test
- Owner/manager should access `/admin/*`.
- Employee should access `/employee/*`.
- Charts should render from API responses.

## Nightly Aggregation Job

- Cron job file: `server/src/jobs/nightlyAggregation.js`
- Schedule: daily at `00:10`
- Aggregates `activity_logs` into `daily_productivity_summaries`

## Security Checklist Implemented

- JWT short-lived access token + refresh token flow
- Role-based authorization
- Org-scope validation using `x-org-id` + token org
- Device binding on login and operational endpoints
- S3 signed URL access for screenshots
- Helmet + rate limiting + validation
- No hardcoded runtime secrets (`.env` driven)

## Quick Start

1. `npm install`
2. Configure `server/.env`
3. Run schema: `npm --workspace server run migrate`
4. Start backend: `npm --workspace server run dev`
5. Start web: `npm --workspace web run dev`
6. Start desktop UI: `npm --workspace desktop-renderer run dev`
7. Start desktop app: `npm --workspace desktop run dev`
