# Medical Clinic System — Production Architecture & Verification Report

Generated: November 2026

---

## 🏛️ System Overview

The **Medical Clinic System (طبيبك)** is an enterprise-grade healthcare platform designed to eliminate waiting room congestion and streamline clinical queue management across private clinics in Yemen.

```
                      ┌──────────────────────────────────────┐
                      │          GitHub Monorepo             │
                      │  Alhaking1/medical-clinic-system     │
                      └──────────────────┬───────────────────┘
                                         │
         ┌───────────────────────────────┼──────────────────────────────┐
         ▼                               ▼                              ▼
  ┌─────────────┐                 ┌─────────────┐                ┌─────────────┐
  │ Patient App │                 │  Staff App  │                │   Backend   │
  │   Android   │                 │   Android   │                │   Node.js   │
  │   (Kotlin)  │                 │   (Kotlin)  │                │  (Express)  │
  └──────┬──────┘                 └──────┬──────┘                └──────┬──────┘
         │                               │                              │
         └───────────────────────┬───────┴──────────────────────────────┘
                                 │ REST API & Server-Sent Events (SSE)
                                 ▼
                     ┌───────────────────────┐
                     │ SQLite WAL Database   │
                     │  with Encryption &    │
                     │  Automated Backups    │
                     └───────────────────────┘
```

---

## 📱 Mobile Applications

### 1. Patient App (`apps/patient-app`)
* **Visuals:** Emerald teal gradient palette, frosted glass wallet container, 3D card elevations.
* **Core Flows:**
  * Specialty & governorate filtering (Aden, Sanaa, Taiz, Ibb, Hodeidah).
  * Standard queue ticket & Golden Seat (VIP priority booking with automated 5% discount).
  * Real-time queue tracker (auto-updating via SSE without manual refresh).
  * Clinical AI Assistant with auto-triage, specialty recommendations, and scroll anchor to reply start.
  * NFC & QR Code instant arrival check-in pass.
* **Enterprise UX Standards:**
  * Shimmer Skeleton Loading (`item_shimmer_doctor_card.xml`).
  * Empty States with contextual action buttons (`layout_empty_state_modern.xml`).
  * Haptic Feedback on vital interactions (`HapticFeedbackHelper.kt`).

### 2. Staff App (`apps/staff-app`)
* **Secretary Dashboard:** Live queue table with instant NFC/QR check-in scanner and patient calling.
* **Doctor Dashboard & Electronic Prescription Pad:**
  * Rapid digital prescription generator (`activity_doctor_prescription.xml`).
  * Integrated Medication Bank and dosage suggestions.
  * Schedule & work period manager for up to 4 weeks in advance.

---

## ⚙️ Backend & API Services (`backend`)

* **Framework:** Node.js 20 / Express with ES Modules.
* **Database:** SQLite with Write-Ahead Logging (`WAL` mode) and foreign keys enabled.
* **Security & Auth:** Dual JWT verification, rate limiting, SQL injection and XSS sanitation.
* **Live Synchronization:** Server-Sent Events (SSE) live queue stream on `GET /api/v1/queue/stream/:appointmentId`.

---

## 🛡️ DevOps & Collaboration Readiness
* **Repository:** Public Monorepo at `https://github.com/Alhaking1/medical-clinic-system.git`.
* **Team Guidelines:** Documented in `TEAM_WORKFLOW.md` with branching strategies, daily routine, and PR requirements.
* **Automated CI:** GitHub Actions workflow ready for PR enforcement.
