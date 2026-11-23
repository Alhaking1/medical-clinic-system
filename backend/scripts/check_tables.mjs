import db from '../src/config/database.js';

console.log('--- CHECKING PRESCRIPTIONS TABLES ---');
const t1 = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='prescriptions'").get();
const t2 = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='prescription_items'").get();
const t3 = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='medications'").get();

console.log('prescriptions exists:', !!t1);
console.log('prescription_items exists:', !!t2);
console.log('medications exists:', !!t3);
