import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import authRoutes from './modules/auth/routes.js';
import taskRoutes from './modules/tasks/routes.js';
import attendanceRoutes from './modules/attendance/routes.js';
import activityRoutes from './modules/activity/routes.js';
import analyticsRoutes from './modules/activity/analyticsRoutes.js';
import screenshotRoutes from './modules/screenshots/routes.js';
import deviceRoutes from './modules/device/routes.js';
import userRoutes from './modules/users/routes.js';
import organizationRoutes from './modules/organizations/routes.js';
import policyRoutes from './modules/policy/routes.js';

import { apiRateLimit } from './middleware/rateLimit.js';
import { enforceHttps } from './middleware/https.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(enforceHttps);
app.use(apiRateLimit);

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/auth', authRoutes);
app.use('/tasks', taskRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/activity', activityRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/screenshots', screenshotRoutes);
app.use('/device', deviceRoutes);
app.use('/users', userRoutes);
app.use('/organizations', organizationRoutes);
app.use('/policy', policyRoutes);

app.use(errorHandler);

export default app;
