import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export function signAccessToken(payload) {
  return jwt.sign(payload, config.accessSecret, { expiresIn: config.accessTtl });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, config.refreshSecret, { expiresIn: config.refreshTtl });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.accessSecret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, config.refreshSecret);
}
