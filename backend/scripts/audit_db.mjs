import db from '../src/config/database.js';

console.log('--- DATABASE INTEGRITY AUDIT ---');
const fkCheck = db.prepare('PRAGMA foreign_key_check').all();
console.log('FK Violations:', fkCheck.length === 0 ? 'NONE (PASSED ✅)' : fkCheck);

const quickCheck = db.prepare('PRAGMA quick_check').all();
console.log('Quick Check:', quickCheck);

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(t => t.name);
console.log('Total Tables Count:', tables.length);

const critical = ['doctors', 'patients', 'secretaries', 'clinics', 'appointments', 'prescriptions', 'prescription_items', 'offers', 'offer_bookings', 'notifications', 'registration_requests'];
for (const t of critical) {
  try {
    const c = db.prepare(`SELECT count(*) as count FROM ${t}`).get();
    console.log(`✅ Table [${t}]: ${c.count} records`);
  } catch (e) {
    console.error(`❌ Table [${t}] ERROR:`, e.message);
  }
}

// Check orphaned appointments or prescriptions
const orphanedPresc = db.prepare("SELECT count(*) as c FROM prescriptions WHERE appointment_id NOT IN (SELECT id FROM appointments)").get();
console.log('Orphaned Prescriptions:', orphanedPresc.c === 0 ? 'NONE ✅' : orphanedPresc.c);

// Check pending doctors with clinics
const pendingDocs = db.prepare("SELECT id, full_name, status, clinic_id, clinic_name FROM doctors WHERE status = 'pending'").all();
console.log('Pending Doctors Count:', pendingDocs.length);

console.log('Database integrity check finished successfully.');
