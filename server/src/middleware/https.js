import { config } from '../config/env.js';

export function enforceHttps(req, res, next) {
  if (!config.enforceHttps) return next();
  const forwardedProto = req.headers['x-forwarded-proto'];
  if (forwardedProto && forwardedProto !== 'https') {
    return res.status(400).json({ message: 'HTTPS required' });
  }
  return next();
}
