# AUDIT: API ENDPOINTS DIRECTORY

Base URL: `/api/v1`

## 1. Authentication & System Access (`/api/v1/auth`)
| Method | Endpoint | Auth | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/setup-admin` | Public | Initial superadmin bootstrap |
| `POST` | `/auth/login` | Public (Rate limited) | Admin password login |
| `POST` | `/auth/login-otp/send` | Public (Rate limited) | Send WhatsApp OTP code |
| `POST` | `/auth/login-otp/verify` | Public (Rate limited) | Verify OTP & issue JWT |
| `POST` | `/auth/register/guest` | Public | Register guest patient account |
| `POST` | `/auth/register/doctor` | Public | Register doctor account (pending approval) |
| `POST` | `/auth/register/patient` | Public | Register patient account |
| `GET` | `/auth/me` | Bearer Token | Get authenticated user info & permissions |
| `POST` | `/auth/login/password` | Public | Staff/Admin login with phone/username & password |
| `POST` | `/auth/set-password` | Bearer Token | Set initial password |
| `POST` | `/auth/change-password` | Bearer Token | Change existing password |
| `POST` | `/auth/logout` | Bearer Token | Logout session |
| `POST` | `/auth/google-direct-login` | Public | Direct Google OAuth validation & JWT issuance |
| `POST` | `/auth/google-login` | Public | Google ID Token OAuth verification |
| `POST` | `/auth/recovery-request` | Public | Submit account recovery request |
| `POST` | `/auth/reset-password` | Public | Reset password using recovery verification |
| `POST` | `/auth/delete-account` | Bearer Token | Account deletion (Google Play policy) |
| `GET` | `/auth/admins` | Admin | List system administrators |
| `POST` | `/auth/admins` | Admin | Create administrator |
| `PUT` | `/auth/admins/:id` | Admin | Update administrator |
| `DELETE` | `/auth/admins/:id` | Admin | Delete administrator |

## 2. Patients & Medical Wallets (`/api/v1/patients`)
| Method | Endpoint | Auth | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/patients/me` | Patient | Get current patient profile & balance |
| `GET` | `/patients/me/wallet` | Patient | Get patient wallet balance & transaction history |
| `POST` | `/patients/me/wallet/deposit-request` | Patient | Submit bank transfer / remittance deposit request |
| `GET` | `/patients/wallet/deposit-requests` | Admin | View all wallet deposit requests |
| `PATCH` | `/patients/wallet/deposit-requests/:id/review` | Admin | Approve (with custom amount) or reject deposit request |
| `POST` | `/patients/:id/adjust-balance` | Admin | Direct balance adjustment / top-up |
| `GET` | `/patients` | Staff/Admin | List patients |
| `GET` | `/patients/:id` | Staff/Admin | Get patient details |
| `PATCH` | `/patients/:id/toggle-block` | Admin | Block or unblock patient |
| `DELETE` | `/patients/:id` | Admin | Delete patient profile |

## 3. Clinics & Facilities (`/api/v1/clinics`)
| Method | Endpoint | Auth | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/clinics` | Public | List active hospitals and clinics |
| `GET` | `/clinics/:id` | Public | Get clinic details |
| `POST` | `/clinics` | Admin | Create new clinic |
| `PUT` | `/clinics/:id` | Admin | Update clinic details |
| `DELETE` | `/clinics/:id` | Admin | Delete clinic |
| `PUT` | `/clinics/:id/schedule` | Admin | Configure clinic operating hours |

## 4. Doctors & Specialists (`/api/v1/doctors`)
| Method | Endpoint | Auth | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/doctors` | Public | List active doctors & specialties |
| `GET` | `/doctors/:id` | Public | Get doctor profile & clinic links |
| `POST` | `/doctors` | Admin | Create doctor profile |
| `PUT` | `/doctors/:id` | Admin/Doctor | Update doctor profile |
| `DELETE` | `/doctors/:id` | Admin | Soft delete doctor |
| `GET` | `/doctors/pending` | Admin | List pending doctor registrations |
| `PATCH` | `/doctors/:id/approve` | Admin | Approve pending doctor |
| `PATCH` | `/doctors/:id/reject` | Admin | Reject doctor registration |
| `GET` | `/doctors/:id/permissions` | Admin | Get doctor permissions |
| `PUT` | `/doctors/:id/permissions` | Admin | Update doctor permissions |
| `PUT` | `/doctors/permissions/all` | Admin | Update global doctor permissions |

## 5. Appointments & Bookings (`/api/v1/appointments`)
| Method | Endpoint | Auth | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/appointments` | Staff/Admin | List appointments with filters |
| `GET` | `/appointments/my` | Authenticated | List user's appointments |
| `GET` | `/appointments/:id` | Authenticated | Appointment details |
| `POST` | `/appointments` | Patient | Book appointment (supports wallet & remittance) |
| `PATCH` | `/appointments/:id/confirm` | Staff/Admin | Confirm booking |
| `PATCH` | `/appointments/:id/pay` | Patient | Pay appointment fee via wallet |
| `PATCH` | `/appointments/:id/complete` | Doctor/Staff | Mark appointment completed |
| `PATCH` | `/appointments/:id/reschedule` | Authenticated | Reschedule date/period |
| `PATCH` | `/appointments/:id/cancel` | Authenticated | Cancel appointment (auto refunds to wallet if paid) |
| `PATCH` | `/appointments/:id/no-show` | Staff | Mark patient as no-show |
| `POST` | `/appointments/:id/review` | Patient | Submit rating and review |
| `GET` | `/appointments/reviews/all` | Public | Get public doctor/hospital reviews |

## 6. Real-Time Chat & Messaging (`/api/v1/chat`)
| Method | Endpoint | Auth | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/chat/conversations` | Authenticated | List user's chat conversations |
| `POST` | `/chat/conversations` | Authenticated | Start chat conversation |
| `GET` | `/chat/conversations/:id/messages`| Authenticated | Get conversation messages |
| `POST` | `/chat/conversations/:id/messages`| Authenticated | Send message (moderated against contacts) |
| `POST` | `/chat/validate` | Public | Validate message content against prohibited terms |
| `GET` | `/chat/retention` | Admin | Get message retention setting |
| `PUT` | `/chat/retention` | Admin | Update retention setting |

## 7. Administrative Moderation & Requests (`/api/v1/admin`)
| Method | Endpoint | Auth | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin/requests` | Admin | List registration requests |
| `GET` | `/admin/requests/stats` | Admin | Count pending requests |
| `PATCH` | `/admin/requests/:id/approve` | Admin | Approve registration |
| `PATCH` | `/admin/requests/:id/reject` | Admin | Reject registration |
| `GET` | `/admin/chat-settings` | Admin | View chat moderation rules |
| `PUT` | `/admin/chat-settings` | Admin | Update chat moderation rules |
| `PATCH` | `/admin/doctors/:id/chat-ban` | Admin | Ban/Unban doctor from chat |
| `PATCH` | `/admin/secretaries/:id/chat-ban` | Admin | Ban/Unban secretary from chat |
| `GET` | `/admin/revenue-analytics` | Admin | Financial & revenue metrics |
