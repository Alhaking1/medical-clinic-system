import request from 'supertest';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

// Note: To test server without running app.listen port conflict, import app directly
let app;

describe('🛡️ Comprehensive Security Test Suite', () => {
  const BASE_URL = 'http://localhost:8000';

  describe('1. Authentication Middleware & Signature Integrity', () => {
    const BASE_URL = 'http://localhost:8000';

    it('rejects unauthenticated request to protected endpoint (HTTP 401)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/appointments`, {
        headers: { 'Accept': 'application/json' }
      });
      expect(res.status).toBe(401);
    });

    it('rejects forged token with invalid signature (HTTP 401)', async () => {
      const forged = jwt.sign({ id: 1, role: 'admin' }, 'wrong-secret-key-attacker');
      const res = await fetch(`${BASE_URL}/api/v1/appointments`, {
        headers: {
          'Authorization': `Bearer ${forged}`,
          'Accept': 'application/json'
        }
      });
      expect(res.status).toBe(401);
    });

    it('rejects unsigned token with alg=none (HTTP 401)', async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ id: 1, role: 'admin' })).toString('base64url');
      const token = `${header}.${payload}.`;
      const res = await fetch(`${BASE_URL}/api/v1/appointments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      expect(res.status).toBe(401);
    });

    it('rejects expired token (HTTP 401)', async () => {
      const expired = jwt.sign(
        { id: 1, role: 'admin', exp: Math.floor(Date.now() / 1000) - 3600 },
        process.env.JWT_SECRET
      );
      const res = await fetch(`${BASE_URL}/api/v1/appointments`, {
        headers: {
          'Authorization': `Bearer ${expired}`,
          'Accept': 'application/json'
        }
      });
      expect(res.status).toBe(401);
    });

    it('accepts legitimate token for valid admin', async () => {
      const valid = jwt.sign(
        { id: 1, role: 'admin', type: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );
      const res = await fetch(`${BASE_URL}/api/v1/admin/dashboard`, {
        headers: {
          'Authorization': `Bearer ${valid}`,
          'Accept': 'application/json'
        }
      });
      // Should not be 401 unauthorized
      expect(res.status).not.toBe(401);
    });
  });

  describe('2. Security Headers & Healthcheck', () => {
    const BASE_URL = 'http://localhost:8000';

    it('returns healthy status and 200 on /api/v1/health', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/health`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.status).toBe('OK');
    });

    it('enforces X-Frame-Options: DENY and X-Content-Type-Options: nosniff', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/health`);
      expect(res.headers.get('x-frame-options')).toBe('DENY');
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    });
  });
});
