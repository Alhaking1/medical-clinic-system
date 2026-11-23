# PHASE 0 — TASK 0.1: AUDIT GAPS REPORT
**Audit Date:** 2026-10-17  
**Protocol:** Zero-Error Engineering Directive / CIA Triad Compliance  
**Author:** Principal SRE / Security Architect  
**Repository Working Tree Status:** Zero modifications to tracked files (`git diff HEAD` is clean).

---

## 1. Executive Summary & Verification Items

In accordance with Phase 0 Task 0.1 requirements, this report fills all previous audit gaps by directly inspecting and documenting the designated backend infrastructure files and data artifacts.

---

## 2. File Reviews

### 2.1 `backend/src/utils/backup.js`
- **Location:** `C:\Users\lenovo\backend\src\utils\backup.js`
- **Total Lines:** 65
- **Functionality:**
  - `createBackup()`: Copies `data/medical.db` to `backups/medical-${timestamp}.db`.
  - `cleanOldBackups()`: Prunes backups older than 30 days (`maxAge = 30 * 24 * 60 * 60 * 1000`).
  - `startBackupSchedule()`: Schedules initial backup at 30 seconds after server launch, then recurs every 24 hours (`setInterval`).
- **Architectural Findings & Risk Evaluation:**
  - ⚠️ **WAL Concurrency Risk:** Uses `fs.copyFileSync(DB_PATH, backupPath)` directly on active SQLite database while WAL mode is active (`medical.db-wal` may contain uncheckpointed transactions, leading to torn or incomplete backup state if copied via raw file copy without an SQLite backup API / VACUUM INTO / checkpoint).
  - ⚠️ **Single Local Node:** Backups reside on the same local disk (`backups/`), offering zero offsite disaster recovery (RPO violation in case of disk or container loss).

---

### 2.2 `backend/src/middleware/auditLog.js`
- **Location:** `C:\Users\lenovo\backend\src\middleware\auditLog.js`
- **Total Lines:** 60
- **Functionality:**
  - Exports `logger` object: `info`, `warn`, `error`, `auth`, `booking`, `payment`, `admin`, `security`.
  - Format: Pretty console log in development (`isDev`), single-line JSON string in production.
  - `requestLogger`: Express middleware tracking request duration (`slow_request` warning if `duration > 2000ms`, `server_error` log if `statusCode >= 500`).
- **Architectural Findings & Risk Evaluation:**
  - ⚠️ **No Persistent Storage:** Logs are written strictly to `stdout` (`console.log`). There is no persistent file logging, remote SIEM, CloudWatch, or Datadog forwarder.
  - ⚠️ **Missing Request Body / Context:** Does not log caller user IDs or request parameters on sensitive failures.

---

### 2.3 `backend/src/middleware/inputValidation.js`
- **Location:** `C:\Users\lenovo\backend\src\middleware\inputValidation.js`
- **Total Lines:** 147
- **Functionality:**
  - `sanitizeString()` / `deepSanitize()`: Recursively strips `<script>` tags, HTML tags, `javascript:`, null bytes, and backticks.
  - Phone validation: Enforces exactly 9 numeric digits (`^[0-9]{9}$`) after stripping Yemeni country code `+967`.
  - Person name validation: Strictly Arabic letters only (`ARABIC_LETTERS_ONLY_REGEX`), length 3 to 25 characters.
  - Password validation: Enforces maximum length of 8 characters for non-admin accounts.
  - General field limits: Truncates `bio`, `clinic_name`, `specialty`, `address`, `notes` to predefined limits.
- **Architectural Findings & Risk Evaluation:**
  - ⚠️ **Password length constraint:** Enforcing `pass.length <= 8` is an anti-pattern for password security; industry standards (NIST SP 800-63B) mandate allowing long passwords (e.g., minimum 8 or 12, max 64+).
  - ⚠️ **Deep mutation:** Mutates `req.body` directly in-place.

---

### 2.4 `backend/src/middleware/errorHandler.js`
- **Location:** `C:\Users\lenovo\backend\src\middleware\errorHandler.js`
- **Total Lines:** 19
- **Functionality:**
  - Global error handler catching unhandled route errors: returns `{ success: false, message }` with status code (default 500). Conditionally includes `stack` in development.
  - `notFound` handler: returns 404 with Arabic message `{ success: false, message: 'المسار غير موجود' }`.
- **Architectural Findings & Risk Evaluation:**
  - Lightweight and compliant, but lacks error correlation IDs (e.g. `X-Request-Id` / trace ID) for enterprise debugging.

---

### 2.5 `backend/src/middleware/auth.js`
- **Location:** `C:\Users\lenovo\backend\src\middleware\auth.js`
- **Total Lines:** 67
- **Functionality:**
  - `authenticate`: Validates `Bearer` token via `jwt.verify(token, process.env.JWT_SECRET)`.
  - Fallback logic: If verification fails, it decodes with `jwt.decode(token)` and if `id` or `userId` is present, it permits the request!
  - `authorize(...roles)`: Verifies role membership against `req.user.role`.
- **Architectural Findings & CRITICAL Security Flaw:**
  - 🚨 **CRITICAL SECURITY VULNERABILITY (CWE-347 / Authentication Bypass):**
    Lines 19-31 contain an intentional or accidental fallback:
    ```javascript
    } catch (verifyErr) {
      const rawDecoded = jwt.decode(token);
      if (rawDecoded && (rawDecoded.id || rawDecoded.userId)) {
        req.user = { ... };
        return next();
      }
    ```
    This means **ANY forged, untrusted, or tampered JWT token** with an `id` or `userId` will pass verification even with an invalid signature!
    *(Note: Per Phase 0 protocol, this has NOT been modified yet, but is flagged for immediate resolution in Phase 1).*

---

## 3. Data Artifacts & Storage Inspection

### 3.1 `backend/supabase_credentials.txt`
- **Location:** `C:\Users\lenovo\backend\supabase_credentials.txt`
- **File Size:** 227 bytes
- **Structure (Secrets Redacted):**
  ```text
  Project URL: [REDACTED_SECRET]
  Project ID: [REDACTED_SECRET]
  Publishable Key: [REDACTED_SECRET]
  Secret Key: [REDACTED_SECRET]
  ```
- **Git Status:** Currently **untracked** in git (`?? supabase_credentials.txt`).
- **Risk Assessment:** Stored in plaintext in the project root directory.

---

### 3.2 `backend/supabase_data/` Directory
- **Location:** `C:\Users\lenovo\backend\supabase_data`
- **Total Files:** 28 CSV files
- **File Breakdown:**
  | File Name | Size (Bytes) | Non-Empty |
  |-----------|--------------|-----------|
  | `admins.csv` | 182 | Yes |
  | `appointments.csv` | 0 | No |
  | `appointment_reviews.csv` | 0 | No |
  | `chat_conversations.csv` | 0 | No |
  | `chat_messages.csv` | 0 | No |
  | `clinics.csv` | 1,652 | Yes |
  | `doctors.csv` | 2,542 | Yes |
  | `doctor_clinics.csv` | 249 | Yes |
  | `doctor_commission_history.csv` | 0 | No |
  | `doctor_leaves.csv` | 0 | No |
  | `doctor_periods.csv` | 12,740 | Yes |
  | `doctor_schedules.csv` | 4,830 | Yes |
  | `medical_records.csv` | 0 | No |
  | `notifications.csv` | 0 | No |
  | `offers.csv` | 0 | No |
  | `offer_images.csv` | 0 | No |
  | `otp_codes.csv` | 1,753 | Yes |
  | `patients.csv` | 689 | Yes |
  | `payments.csv` | 0 | No |
  | `queue.csv` | 0 | No |
  | `registration_requests.csv` | 4,154 | Yes |
  | `secretaries.csv` | 415 | Yes |
  | `secretaries_backup.csv` | 1,099 | Yes |
  | `secretary_delegations.csv` | 0 | No |
  | `secretary_doctors.csv` | 0 | No |
  | `settings.csv` | 751 | Yes |
  | `slots.csv` | 41,332 | Yes |
  | `system_settings.csv` | 216 | Yes |
- **Origin & Purpose:** Appears to be an export from an earlier migration or backup attempt to Supabase dated `2026-10-11`.

---

### 3.3 `backend/schema_export.sql`
- **Location:** `C:\Users\lenovo\backend\schema_export.sql`
- **File Size:** 22,181 bytes (497 lines)
- **First 15 Lines:**
  ```sql
  -- ═══════════════════════════════════════════
  -- Schema from SQLite
  -- Generated: 2026-10-11T16:29:17.135Z
  -- Tables: 28
  -- ═══════════════════════════════════════════
  
  -- ───────────────────────────────────────
  -- admins
  -- ───────────────────────────────────────
  CREATE TABLE admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
  ```
- **Finding:** Generated on 2026-10-11 when the schema had 28 tables (now SQLite has 30 tables: `wallet_transactions` and `wallet_recharge_requests` were added subsequently).

---

### 3.4 `.gitignore` Security Coverage Audit
- **Location:** `C:\Users\lenovo\backend\.gitignore`
- **Audit Checklist:**
  - `.env` covered? **YES** (Lines 2, 3, 11)
  - `*.db` covered? **YES** (Lines 12, 25, 26, 27)
  - `uploads/` covered? **YES** (Lines 6, 14)
  - `backups/` covered? **YES** (Lines 15, 31)
  - `logs/` covered? **PARTIAL** (`*.log` is covered, but `logs/` folder directory syntax is not explicitly specified).
  - `supabase_credentials.txt` covered? ❌ **NO**. (Critical gap: it is currently untracked and could accidentally be added with `git add .`).
  - `supabase_data/` covered? ❌ **NO**.
  - `schema_export.sql` covered? ❌ **NO**.

---

## 4. Summary of Gaps & Critical Findings
1. **Critical Auth Vulnerability:** `src/middleware/auth.js` has a fallback that decodes unverified JWT tokens on failure, effectively bypassing cryptographic authentication.
2. **Untracked Sensitive Credentials:** `supabase_credentials.txt` is untracked and not ignored by `.gitignore`.
3. **Backup Concurrency Hazard:** `backup.js` uses raw `fs.copyFileSync` on a live WAL-mode SQLite database, which does not guarantee consistency without checkpointing or using SQLite backup commands.
4. **Log Retention & Centralization:** Logging is stdout-only with no persistent storage or alerting hooks.
5. **Schema Drift:** `schema_export.sql` and `supabase_data/` reflect the 28-table state from Oct 11, missing recent tables (`wallet_transactions`, `wallet_recharge_requests`).

---

**Task 0.1 Status:** COMPLETED.  
**Strict Safety Protocol Rule:** STOPPED. Awaiting explicit user approval before proceeding to Task 0.2.
