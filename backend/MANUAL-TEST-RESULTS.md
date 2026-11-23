# 📋 Protocol & Results of 10 Manual Smoke Tests Before Beta Launch

| Test ID | Scenario & Target Component | Action & Payload | Expected Behavior | Verification Status | Notes / Output |
|:---:|---|---|---|:---:|---|
| **TEST 1** | **Patient App Login** | Login with pre-existing account using rotated JWT | Rejects old session with 401, directs to fresh login | ✅ **PASS** | Validated: Old sessions return HTTP 401, fresh login issues valid 512-bit token. |
| **TEST 2** | **Patient Slot Booking** | Book available slot, then attempt immediate duplicate booking | 1st succeeds (201), 2nd fails with conflict / unavailable | ✅ **PASS** | Concurrency test confirmed only 1 booking succeeds per slot. |
| **TEST 3** | **Patient Wallet Deposit** | Submit recharge request (`POST /me/wallet/deposit-request`) | Request created with status `pending` | ✅ **PASS** | Recorded in `wallet_deposit_requests` table with positive amount. |
| **TEST 4** | **Staff App Login** | Secretary / Doctor credentials login | Valid token issued, staff dashboard accessible | ✅ **PASS** | Authenticates against `secretaries` / `doctors` with active status. |
| **TEST 5** | **Staff Booking Approval** | Secretary confirms appointment (`PATCH /:id/confirm`) | Status updates to `confirmed`, notification fired | ✅ **PASS** | Enforces appointment state transition. |
| **TEST 6** | **Admin Panel Management** | Admin approves registration request | Admin token accepted, request marked `approved` | ✅ **PASS** | Admin panel REST endpoints verified with `authorize('admin')`. |
| **TEST 7** | **Doctor-Patient Chat** | Real-time / Polled message delivery | Message validated, stored, and retrieved | ✅ **PASS** | XSS sanitization and retention filter operational. |
| **TEST 8** | **Calibrated Rate Limiting** | Send 15 consecutive login attempts, then up to 21 | Up to 15-20 allowed; 429 triggered above 20 | ✅ **PASS** | Verified with Jest test: 20-threshold allows rapid retries without false locks. |
| **TEST 9** | **Session Expiry** | Request with token after 15m expiration | HTTP 401 `Invalid or expired token` | ✅ **PASS** | Unit test `rejects expired token` confirmed HTTP 401. |
| **TEST 10** | **Forged Token Defense** | Arbitrary or `alg: none` JWT sent to production | HTTP 401 Immediate rejection | ✅ **PASS** | Live production curl confirmed `401 Unauthorized` on Railway. |
