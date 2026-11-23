# 🔍 Sentry Production Setup Guide

## Step 1: Create a Free Sentry Account
1. Open [https://sentry.io/signup/](https://sentry.io/signup/)
2. Sign up (free tier includes 5,000 errors/month).
3. Create a new project:
   - Platform: **Node.js / Express**
   - Project Name: `medical-clinic-backend`
4. Copy the generated **DSN** (e.g. `https://xxxx@o0.ingest.sentry.io/0`).

---

## Step 2: Configure SENTRY_DSN in Railway
1. Open your [Railway Dashboard](https://railway.app/).
2. Select your project: `acceptable-inspiration` -> service `medical-booking-backend`.
3. Click the **Variables** tab.
4. Add new variable:
   - Key: `SENTRY_DSN`
   - Value: `<YOUR_SENTRY_DSN_COPIED_IN_STEP_1>`
5. Click **Add / Redeploy**. Railway will automatically reboot with Sentry active.

---

## Step 3: Verify Error Capture
A verification test route has been added to the backend. To verify Sentry integration, open in browser or curl:
```bash
curl https://medical-booking-backend-production.up.railway.app/api/v1/debug/sentry-test
```
You will receive an intentional 500 error:
```json
{
  "success": false,
  "code": "INTERNAL_ERROR",
  "message": "حدث خطأ في الخادم"
}
```
Open your **Sentry Dashboard -> Issues tab**. You will immediately see the error logged with full stack trace, environment (`production`), and timestamp.
