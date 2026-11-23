# AUDIT: EXTERNAL SERVICES & INTEGRATIONS

This document lists all third-party and external service integrations identified across the ecosystem.

| Service | Category | Usage / Integration Point | Config Keys / Requirements |
| :--- | :--- | :--- | :--- |
| **Green API (WhatsApp)** | Messaging / OTP | Sending OTP verification codes and critical notifications via WhatsApp | `GREEN_API_URL`, `GREEN_API_INSTANCE`, `GREEN_API_TOKEN` |
| **Google Sign-In / OAuth 2.0** | Authentication | Patient & Doctor Google authentication verification via `google-auth-library` | `GOOGLE_WEB_CLIENT_ID` (`399127188969-459at9sedg9ech13b45m3cm2ok6oh2ra.apps.googleusercontent.com`) |
| **Railway Cloud PaaS** | Cloud Hosting | Hosting the live production Node.js backend API | `medical-booking-backend-production.up.railway.app` |
| **GitHub** | Source Control / CI | Remote code repositories for automated deployment | `https://github.com/Alhaking1/medical-booking-backend.git` |
| **Google Maps API** | Location Services | Clinic location coordinates & Google Maps URLs | `google_maps_url` stored in database |
| **Google Play Services** | Android Client SDK | In-app Google Sign-In on Patient & Staff Android applications | `google-services.json` / Web Client ID |
