const Database = require('better-sqlite3');
const db = new Database('./data/medical.db');

console.log('\n═══════════════════════════════════');
console.log('📋 كل السكرتيرات:');
console.log('═══════════════════════════════════');
db.prepare("SELECT id, full_name, phone, status, must_change_password, must_complete_profile, created_at FROM secretaries ORDER BY id").all().forEach(s => {
    console.log(`   id=${s.id} | ${s.full_name} | ${s.phone} | status=${s.status}`);
    console.log(`      must_change_pw=${s.must_change_password} | must_complete=${s.must_complete_profile} | created=${s.created_at}`);
});

console.log('\n═══════════════════════════════════');
console.log('📋 سجلات secretary في RR:');
console.log('═══════════════════════════════════');
const rr = db.prepare("SELECT * FROM registration_requests WHERE type='secretary'").all();
if (rr.length === 0) {
    console.log('   ❌ لا يوجد أي سجل type=secretary');
} else {
    rr.forEach(r => console.log(`   ID=${r.id} | user_id=${r.user_id} | status=${r.status} | created=${r.created_at}`));
}

console.log('\n═══════════════════════════════════');
console.log('📋 توزيع RR حسب النوع والحالة:');
console.log('═══════════════════════════════════');
db.prepare("SELECT type, status, COUNT(*) as c FROM registration_requests GROUP BY type, status").all().forEach(r => {
    console.log(`   ${r.type} / ${r.status}: ${r.c}`);
});

console.log('\n═══════════════════════════════════');
console.log('📋 السكرتيرات + علاقتهن بالأطباء:');
console.log('═══════════════════════════════════');
db.prepare(`
    SELECT s.id, s.full_name, s.clinic_id, s.status,
           (SELECT COUNT(*) FROM secretary_doctors sd WHERE sd.secretary_id = s.id) as doctor_count
    FROM secretaries s
`).all().forEach(s => {
    console.log(`   id=${s.id} | ${s.full_name} | clinic=${s.clinic_id} | status=${s.status} | doctors=${s.doctor_count}`);
});

console.log('\n═══════════════════════════════════');
console.log('📋 السكرتيرة pending — تفاصيل كاملة:');
console.log('═══════════════════════════════════');
const pendingSec = db.prepare("SELECT * FROM secretaries WHERE status='pending'").all();
if (pendingSec.length === 0) {
    console.log('   لا يوجد');
} else {
    pendingSec.forEach(s => {
        console.log(JSON.stringify(s, null, 2));
    });
}

db.close();
