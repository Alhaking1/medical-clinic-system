import request from 'supertest';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8080';

describe('🛡️ GAP 3: IDOR Security Tests', () => {
  it('prevents a patient from viewing another patient appointment (IDOR check on /appointments/:id)', async () => {
    // Generate valid token for Patient #2
    const tokenPatient2 = jwt.sign(
      { id: 2, role: 'patient', type: 'patient' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Attempt to access appointment #1 (belongs to Patient #1)
    const res = await fetch(`${BASE_URL}/api/v1/appointments/1`, {
      headers: {
        'Authorization': `Bearer ${tokenPatient2}`,
        'Accept': 'application/json'
      }
    });

    // If appointment 1 belongs to user 1, Patient 2 must receive 403 Forbidden (or 404 if not found)
    expect([403, 404]).toContain(res.status);
    if (res.status === 403) {
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toContain('غير مصرح');
    }
  });

  it('prevents an unauthorized user from reading chat messages of another conversation', async () => {
    // Generate valid token for Patient #2
    const tokenPatient2 = jwt.sign(
      { id: 2, role: 'patient', type: 'patient' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Attempt to access messages of conversation #999 or conversation belonging to someone else
    const res = await fetch(`${BASE_URL}/api/v1/chat/conversations/1/messages`, {
      headers: {
        'Authorization': `Bearer ${tokenPatient2}`,
        'Accept': 'application/json'
      }
    });

    expect([403, 404]).toContain(res.status);
  });
});
