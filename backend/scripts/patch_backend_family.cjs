const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Family Profiles & Dependent Booking Backend Patch...');

// 1. Patch server.js
const serverPath = path.join(__dirname, '../src/server.js');
let serverCode = fs.readFileSync(serverPath, 'utf8').replace(/\r\n/g, '\n');

if (!serverCode.includes("import familyRoutes from './routes/family.js';")) {
  serverCode = serverCode.replace(
    "import userRoutes from './routes/users.js';",
    "import userRoutes from './routes/users.js';\nimport familyRoutes from './routes/family.js';"
  );
}

if (!serverCode.includes("app.use('/api/v1/family', familyRoutes);")) {
  serverCode = serverCode.replace(
    "app.use('/api/v1/users', userRoutes);",
    "app.use('/api/v1/users', userRoutes);\napp.use('/api/v1/family', familyRoutes);"
  );
}
fs.writeFileSync(serverPath, serverCode.replace(/\n/g, '\r\n'), 'utf8');
console.log('✅ server.js patched with /api/v1/family');

// 2. Patch appointments.js
const apptPath = path.join(__dirname, '../src/routes/appointments.js');
let apptCode = fs.readFileSync(apptPath, 'utf8').replace(/\r\n/g, '\n');

// 2a. Update executeBookingTransaction
const oldInsert = `  const insertAppointment = db.prepare(\`
    INSERT INTO appointments
    (booking_code, user_id, doctor_id, slot_id, period_id, status, payment_method, payment_status, reason, fee, queue_number, is_golden, transaction_id, attendance_status, sequential_booking_number)
    VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  \`).run(
    data.bookingCode,
    data.userId,
    data.doctorId,
    data.slot_id || null,
    data.period_id || null,
    data.payment_method || 'cash',
    data.payStatus,
    data.reason || null,
    data.appointmentFee,
    data.assignedQueueNumber,
    data.isGolden,
    data.transactionId ? String(data.transactionId).trim() : null,
    data.sequentialNumber
  );`;

const newInsert = `  const insertAppointment = db.prepare(\`
    INSERT INTO appointments
    (booking_code, user_id, doctor_id, slot_id, period_id, status, payment_method, payment_status, reason, fee, queue_number, is_golden, transaction_id, attendance_status, sequential_booking_number, family_member_id, patient_name, patient_relationship, patient_age, patient_gender)
    VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)
  \`).run(
    data.bookingCode,
    data.userId,
    data.doctorId,
    data.slot_id || null,
    data.period_id || null,
    data.payment_method || 'cash',
    data.payStatus,
    data.reason || null,
    data.appointmentFee,
    data.assignedQueueNumber,
    data.isGolden,
    data.transactionId ? String(data.transactionId).trim() : null,
    data.sequentialNumber,
    data.familyMemberId || null,
    data.patientName || null,
    data.patientRelationship || 'صاحب الحساب',
    data.patientAge || null,
    data.patientGender || null
  );`;

if (apptCode.includes(oldInsert)) {
  apptCode = apptCode.replace(oldInsert, newInsert);
  console.log('✅ executeBookingTransaction updated with family columns');
} else {
  console.log('ℹ️ executeBookingTransaction already patched or differed');
}

// 2b. Extract family_member_id in POST /
const oldReqBody = 'const { period_id, slot_id, doctor_id, reason, payment_method } = req.body;';
const newReqBody = `const { period_id, slot_id, doctor_id, reason, payment_method, family_member_id } = req.body;

    let familyMember = null;
    if (family_member_id) {
      familyMember = db.prepare('SELECT * FROM family_members WHERE id = ? AND user_id = ?').get(family_member_id, req.user.id);
      if (!familyMember) {
        return res.status(404).json({
          success: false,
          message: 'فرد العائلة المحدد غير موجود'
        });
      }
    }`;

if (apptCode.includes(oldReqBody)) {
  apptCode = apptCode.replace(oldReqBody, newReqBody);
  console.log('✅ POST / extracted family_member_id & fetched member');
}

// 2c. Pass family fields in appointmentId = executeBookingTransaction({...})
const oldExecuteCall = `appointmentId = executeBookingTransaction({
        userId: req.user.id,
        doctorId: doctor_id,
        period_id: period_id || null,
        slot_id: slot_id || null,
        payment_method: payment_method || 'cash',
        payStatus,
        reason: reason || null,
        appointmentFee,
        assignedQueueNumber,
        isGolden,
        transactionId: transaction_id,
        sequentialNumber,
        bookingCode
      });`;

const newExecuteCall = `appointmentId = executeBookingTransaction({
        userId: req.user.id,
        doctorId: doctor_id,
        period_id: period_id || null,
        slot_id: slot_id || null,
        payment_method: payment_method || 'cash',
        payStatus,
        reason: reason || null,
        appointmentFee,
        assignedQueueNumber,
        isGolden,
        transactionId: transaction_id,
        sequentialNumber,
        bookingCode,
        familyMemberId: familyMember ? familyMember.id : null,
        patientName: familyMember ? familyMember.name : currentPatient.full_name,
        patientRelationship: familyMember ? familyMember.relationship : 'صاحب الحساب',
        patientAge: familyMember ? (familyMember.age || null) : (currentPatient.age || null),
        patientGender: familyMember ? familyMember.gender : (currentPatient.gender || 'male')
      });`;

if (apptCode.includes(oldExecuteCall)) {
  apptCode = apptCode.replace(oldExecuteCall, newExecuteCall);
  console.log('✅ executeBookingTransaction call updated with family arguments');
}

// 2d. Update SELECT queries in appointments.js to use COALESCE(a.patient_name, p.full_name) as patient_name
apptCode = apptCode.replaceAll(
  'p.full_name as patient_name,',
  `COALESCE(a.patient_name, p.full_name) as patient_name,
               COALESCE(a.patient_relationship, 'صاحب الحساب') as patient_relationship,
               COALESCE(a.patient_age, p.age) as patient_age,
               COALESCE(a.patient_gender, p.gender) as patient_gender,
               p.full_name as account_holder_name,`
);

fs.writeFileSync(apptPath, apptCode.replace(/\n/g, '\r\n'), 'utf8');
console.log('✅ appointments.js patched');

// 3. Patch queue.js
const queuePath = path.join(__dirname, '../src/routes/queue.js');
let queueCode = fs.readFileSync(queuePath, 'utf8').replace(/\r\n/g, '\n');

if (queueCode.includes('finalPatientName = appointment.p_name || finalPatientName;')) {
  queueCode = queueCode.replace(
    'finalPatientName = appointment.p_name || finalPatientName;',
    'finalPatientName = appointment.patient_name || appointment.p_name || finalPatientName;'
  );
}

if (!queueCode.includes('a.patient_relationship,')) {
  queueCode = queueCode.replace(
    'a.transaction_id,\n             d.full_name as doctor_name',
    'a.transaction_id,\n             a.patient_relationship,\n             a.patient_age,\n             a.patient_gender,\n             a.family_member_id,\n             d.full_name as doctor_name'
  );
}
fs.writeFileSync(queuePath, queueCode.replace(/\n/g, '\r\n'), 'utf8');
console.log('✅ queue.js patched');

// 4. Patch prescriptions.js
const prescPath = path.join(__dirname, '../src/routes/prescriptions.js');
let prescCode = fs.readFileSync(prescPath, 'utf8').replace(/\r\n/g, '\n');

prescCode = prescCode.replaceAll(
  'p.full_name as patient_name,',
  `COALESCE(a.patient_name, p.full_name) as patient_name,
        COALESCE(a.patient_relationship, 'صاحب الحساب') as patient_relationship,
        COALESCE(a.patient_age, p.age) as patient_age,
        COALESCE(a.patient_gender, p.gender) as patient_gender,
        p.full_name as account_holder_name,`
);
fs.writeFileSync(prescPath, prescCode.replace(/\n/g, '\r\n'), 'utf8');
console.log('✅ prescriptions.js patched');

console.log('🎉 All backend files patched successfully!');
