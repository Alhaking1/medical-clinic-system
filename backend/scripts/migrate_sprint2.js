import Database from 'better-sqlite3';
const db = new Database('./data/medical.db');

const addCol = (sql, name) => {
  try {
    db.exec(sql);
    console.log(`Added ${name}`);
  } catch (e) {
    console.log(`${name}: ${e.message}`);
  }
};

addCol("ALTER TABLE offers ADD COLUMN facility_id INTEGER;", "facility_id");
addCol("ALTER TABLE offers ADD COLUMN provider_name TEXT;", "provider_name");
addCol("ALTER TABLE offers ADD COLUMN target_audience TEXT;", "target_audience");
addCol("ALTER TABLE offers ADD COLUMN max_capacity INTEGER;", "max_capacity");
addCol("ALTER TABLE offers ADD COLUMN booked_count INTEGER DEFAULT 0;", "booked_count");

// Create offer_bookings table
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS offer_bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      offer_id INTEGER NOT NULL,
      patient_id INTEGER NOT NULL,
      status TEXT DEFAULT 'confirmed',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (offer_id) REFERENCES offers(id),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );
  `);
  console.log("Created table offer_bookings");
} catch (e) {
  console.log("offer_bookings error:", e.message);
}

// Update facility_id from clinic_id if present
try {
  db.exec("UPDATE offers SET facility_id = clinic_id WHERE facility_id IS NULL AND clinic_id IS NOT NULL");
  console.log("Synced facility_id from clinic_id");
} catch (e) {
  console.log("Sync error:", e.message);
}

console.log("Updated offers cols:", db.prepare("PRAGMA table_info(offers)").all().map(c => c.name));
console.log("offer_bookings cols:", db.prepare("PRAGMA table_info(offer_bookings)").all().map(c => c.name));
