# AUDIT: ENVIRONMENT VARIABLES

The following environment variables are referenced across the backend codebase:

| Variable Name | Default / Fallback | Purpose | Required in Prod |
| :--- | :--- | :--- | :--- |
| `PORT` | `8000` | HTTP Server Port | Yes (assigned by cloud host) |
| `NODE_ENV` | `undefined` | Environment mode (`development` / `production`) | Recommended |
| `DATABASE_PATH` | `./data/medical.db` | SQLite Database file path | Yes |
| `JWT_SECRET` | None (fails if unset in prod) | Secret key for JWT signing & verification | **CRITICAL** |
| `JWT_EXPIRES_IN` | `8h` | Token expiration time | Optional |
| `ADMIN_DEFAULT_USERNAME` | `admin` | Initial admin account username | Optional |
| `ADMIN_DEFAULT_PASSWORD` | `admin123456` | Initial admin account password | Optional |
| `ADMIN_DEFAULT_NAME` | `المدير العام` | Initial admin account display name | Optional |
| `GOOGLE_WEB_CLIENT_ID` | `399127188969-...` | Google OAuth Web Client ID | Required for Google Auth |
| `DEFAULT_TIMEZONE` | `Asia/Aden` | Default timezone for appointments & dates | Optional |
| `GREEN_API_URL` | `undefined` | WhatsApp Green API base URL | Required for WhatsApp OTP |
| `GREEN_API_INSTANCE` | `undefined` | WhatsApp Green API instance ID | Required for WhatsApp OTP |
| `GREEN_API_TOKEN` | `undefined` | WhatsApp Green API token | Required for WhatsApp OTP |
| `CORS_ORIGIN` | `*` (or specified origins) | Allowed CORS origins for web admin / apps | Optional |
