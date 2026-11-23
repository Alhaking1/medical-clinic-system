-- ══════════════════════════════════════════════════════════════════════════
-- 🚀 HIGH-PERFORMANCE DATABASE INDEXES FOR MEDICAL BOOKING PLATFORM
-- ══════════════════════════════════════════════════════════════════════════

-- 1. Patients
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status, is_blocked);

-- 2. Doctors
CREATE INDEX IF NOT EXISTS idx_doctors_active_spec ON doctors(specialty, is_active, is_deleted);
CREATE INDEX IF NOT EXISTS idx_doctors_rating ON doctors(rating DESC);

-- 3. Appointments (High Traffic)
CREATE INDEX IF NOT EXISTS idx_appt_doc_created ON appointments(doctor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appt_user_created ON appointments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appt_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appt_code ON appointments(booking_code);
CREATE INDEX IF NOT EXISTS idx_appt_slot ON appointments(slot_id);
CREATE INDEX IF NOT EXISTS idx_appt_period ON appointments(period_id);

-- 4. Slots (Scheduling Optimization)
CREATE INDEX IF NOT EXISTS idx_slots_doc_date_avail ON slots(doctor_id, date, is_booked, is_closed);

-- 5. Wallet & Financials
CREATE INDEX IF NOT EXISTS idx_wallet_tx_patient ON wallet_transactions(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_type ON wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallet_dep_status ON wallet_deposit_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_dep_patient ON wallet_deposit_requests(patient_id);

-- 6. Chat Messages & Notifications
CREATE INDEX IF NOT EXISTS idx_chat_msg_conv_time ON chat_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_user_unread ON notifications(user_id, is_read, created_at DESC);

-- 7. Queue
CREATE INDEX IF NOT EXISTS idx_queue_doc_status ON queue(doctor_id, status);
CREATE INDEX IF NOT EXISTS idx_queue_appt ON queue(appointment_id);
