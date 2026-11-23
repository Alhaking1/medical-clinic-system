# 📋 Production Deployment Guide & Checklist

## 1. System Architecture & Requirements
- **Runtime:** Node.js 20+ / 22 LTS
- **Database:** SQLite 3 with WAL (`journal_mode = WAL`, `busy_timeout = 5000`, `synchronous = NORMAL`)
- **Container Engine:** Docker with multi-stage build & non-root user
- **Process Model:** Single process or clustered with sticky sessions (for WebSockets/long polling)

---

## 2. Pre-Deployment Verification Checklist
- [x] All security unit tests passing (`100% - 6/6 tests passed`).
- [x] Cryptographic verification enforced for all JWT requests (zero unverified token decode fallbacks).
- [x] Native atomic SQLite backups scheduled every 6 hours via `db.backup()`.
- [x] Advanced database indexing active (49 indexes registered for high-frequency queries).
- [x] Dynamic database health check on `/api/v1/health` with `SELECT 1` validation.
- [x] Comprehensive security headers configured (`X-Frame-Options: DENY`, `nosniff`, `HSTS`, `Permissions-Policy`).
- [x] Request payload body limits capped at `2mb`.
- [x] Graceful shutdown handling configured (`SIGTERM`, `SIGINT`).
- [x] Untracked credentials (`supabase_credentials.txt`, `schema_export.sql`, logs) protected by `.gitignore` and `.dockerignore`.

---

## 3. Environment Variables Reference
Ensure the following variables are configured in production:
```ini
PORT=8080
NODE_ENV=production
JWT_SECRET=your-secure-random-256-bit-key
DATABASE_PATH=./data/medical.db
ADMIN_DEFAULT_USERNAME=admin
ADMIN_DEFAULT_PASSWORD=your-strong-admin-password
ADMIN_DEFAULT_NAME=المدير العام
```

---

## 4. Rollback Plan
1. **Rollback Git Commit:** If regression occurs:
   ```bash
   git revert HEAD
   git push origin main
   ```
2. **Database Snapshot Recovery:** Backups are created atomically in `./backups/medical-<timestamp>.db`. To restore:
   ```bash
   cp backups/medical-<timestamp>.db data/medical.db
   ```
