import Database from 'better-sqlite3';
const db = new Database('./data/medical.db');
const admins = db.prepare("SELECT id, username, full_name, role, is_active, created_at FROM admins").all();
console.log("=== كل الأدمن ===");
console.log(JSON.stringify(admins, null, 2));
db.close();
