# 📊 Production Rate Limits Configuration & Calibrations

| Limiter Scope | Previous Value | Calibrated Value | Window | Client & Real-User Impact Rationale |
|---------------|:--------------:|:----------------:|:------:|-------------------------------------|
| **Auth Limiter** (`/auth/login`, `/register`, `/admin/login`) | 10 req | **20 req** | 15 minutes | Prevents accidental lockouts when family members share devices, users misremember passwords, or multiple tabs trigger login requests. |
| **OTP Limiter** (`/otp/send`) | 5 req | **10 req** | 60 minutes | Accommodates carrier delivery delays, bad signal reconnects, or user re-requests without trapping legitimate patients. |
| **Booking Limiter** (`/appointments`) | 10 req | **20 req** | 1 minute | Enables heads of household to book consecutive slots for family members or follow-up consultations smoothly. |
| **Global Limiter** (`/api/*`) | 3,000 req | **10,000 req** | 15 minutes | Provides ample headroom for active mobile apps polling queue updates, notifications, and doctor period schedules without false 429 throttling. |

---

## Technical Configuration
Configured in `src/server.js`:
- `generalLimiter`: `max: 10000`, `windowMs: 15 * 60 * 1000`
- `authLimiter`: `max: 20`, `windowMs: 15 * 60 * 1000`
- `otpLimiter`: `max: 10`, `windowMs: 60 * 60 * 1000`
- `bookingLimiter`: `max: 20`, `windowMs: 60 * 1000`
