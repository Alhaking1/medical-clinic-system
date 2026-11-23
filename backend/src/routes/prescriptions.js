import express from 'express';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import db from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { createNotification } from './notifications.js';

const router = express.Router();

// ════════════════════════════════════════════════════════════════════
// REQ 10: الأدوية (Medications CRUD) — خاص بالأطباء
// ════════════════════════════════════════════════════════════════════

// GET /api/v1/prescriptions/medications (عرض وبحث الأدوية الخاصة بالطبيب أو العامة)
router.get('/medications', authenticate, (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM medications WHERE 1=1';
    const params = [];

    const role = req.user.role || req.user.type;
    if (role === 'doctor') {
      query += ' AND (doctor_id = ? OR doctor_id IS NULL)';
      params.push(req.user.id);
    }

    if (search && search.trim()) {
      query += ' AND (name LIKE ? OR active_ingredient LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    query += ' ORDER BY name ASC';
    const meds = db.prepare(query).all(...params);

    res.json({ success: true, data: meds });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/prescriptions/medications (إضافة دواء جديد بواسطة الطبيب)
router.post('/medications', authenticate, authorize('doctor', 'admin'), (req, res) => {
  try {
    const { name, active_ingredient, default_dosage } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'اسم الدواء مطلوب' });
    }

    const doctorId = req.user.id;
    const result = db.prepare(`
      INSERT INTO medications (doctor_id, name, active_ingredient, default_dosage)
      VALUES (?, ?, ?, ?)
    `).run(doctorId, name.trim(), active_ingredient?.trim() || null, default_dosage?.trim() || null);

    res.status(201).json({
      success: true,
      message: 'تمت إضافة الدواء بنجاح 💊',
      data: {
        id: result.lastInsertRowid,
        doctor_id: doctorId,
        name: name.trim(),
        active_ingredient,
        default_dosage
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/prescriptions/medications/:id (تعديل دواء)
router.put('/medications/:id', authenticate, authorize('doctor', 'admin'), (req, res) => {
  try {
    const medId = Number(req.params.id);
    const { name, active_ingredient, default_dosage } = req.body;

    const existing = db.prepare('SELECT * FROM medications WHERE id = ?').get(medId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'الدواء غير موجود' });
    }

    const role = req.user.role || req.user.type;
    if (role === 'doctor' && existing.doctor_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بتعديل أدوية طبيب آخر' });
    }

    db.prepare(`
      UPDATE medications
      SET name = COALESCE(?, name),
          active_ingredient = COALESCE(?, active_ingredient),
          default_dosage = COALESCE(?, default_dosage)
      WHERE id = ?
    `).run(name?.trim() || null, active_ingredient?.trim() || null, default_dosage?.trim() || null, medId);

    res.json({ success: true, message: 'تم تعديل بيانات الدواء بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/v1/prescriptions/medications/:id (حذف دواء)
router.delete('/medications/:id', authenticate, authorize('doctor', 'admin'), (req, res) => {
  try {
    const medId = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM medications WHERE id = ?').get(medId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'الدواء غير موجود' });
    }

    const role = req.user.role || req.user.type;
    if (role === 'doctor' && existing.doctor_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بحذف أدوية طبيب آخر' });
    }

    db.prepare('DELETE FROM medications WHERE id = ?').run(medId);
    res.json({ success: true, message: 'تم حذف الدواء بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// ════════════════════════════════════════════════════════════════════
// REQ 10: إنشاء الروشتة الطبية وتفاصيلها (Prescriptions)
// ════════════════════════════════════════════════════════════════════

// POST /api/v1/prescriptions (حفظ الروشتة وبنود الأدوية في Transaction واحدة)
router.post('/', authenticate, authorize('doctor', 'admin'), (req, res) => {
  try {
    const { appointment_id, patient_id, diagnosis, notes, items } = req.body;

    if (!appointment_id || !diagnosis || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'بيانات الروشتة غير مكتملة (appointment_id، التشخيص، وقائمة الأدوية مطلوبة)'
      });
    }

    const doctorId = req.user.id;

    // التحقق من الحجز
    const appt = db.prepare(`
      SELECT a.*, p.id as patient_id, COALESCE(a.patient_name, p.full_name) as patient_name,
        COALESCE(a.patient_relationship, 'صاحب الحساب') as patient_relationship,
        COALESCE(a.patient_age, p.age) as patient_age,
        COALESCE(a.patient_gender, p.gender) as patient_gender,
        p.full_name as account_holder_name, d.full_name as doctor_name
      FROM appointments a
      LEFT JOIN patients p ON a.user_id = p.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
      WHERE a.id = ?
    `).get(appointment_id);

    if (!appt) {
      return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    }

    const resolvedPatientId = patient_id || appt.user_id;

    // تنفيذ الحفظ الذري عبر Database Transaction
    const insertTransaction = db.transaction(() => {
      // 1. إدراج الروشتة الرئيسية
      const pResult = db.prepare(`
        INSERT INTO prescriptions (appointment_id, doctor_id, patient_id, diagnosis, notes)
        VALUES (?, ?, ?, ?, ?)
      `).run(appointment_id, doctorId, resolvedPatientId, diagnosis.trim(), notes?.trim() || null);

      const prescriptionId = pResult.lastInsertRowid;

      // 2. إدراج بنود الأدوية
      const itemStmt = db.prepare(`
        INSERT INTO prescription_items (prescription_id, medication_name, dosage, frequency, duration, instructions)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const item of items) {
        if (!item.medication_name) continue;
        itemStmt.run(
          prescriptionId,
          item.medication_name.trim(),
          item.dosage || 'جرعة اعتيادية',
          item.frequency || 'مرتين يومياً',
          item.duration || '5 أيام',
          item.instructions || null
        );
      }

      // مزامنة التشخيص أيضاً في سجل medical_records إن وجد
      try {
        const medSummary = items.map(i => `${i.medication_name} (${i.dosage}) - ${i.frequency}`).join(', ');
        db.prepare(`
          INSERT INTO medical_records (appointment_id, user_id, doctor_id, diagnosis, prescription, notes)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(appointment_id, resolvedPatientId, doctorId, diagnosis.trim(), medSummary, notes || null);
      } catch (_) {}

      return prescriptionId;
    });

    const newPrescriptionId = insertTransaction();

    // إرسال إشعار فوري للمريض بجاهزية الروشتة
    try {
      createNotification(
        resolvedPatientId,
        'patient',
        'صدور روشتة طبية جديدة 📄💊',
        `أصدر د. ${appt.doctor_name || 'طبيبك'} الوصفة الطبية لموعدك #${appt.booking_code}. يمكنك تحميلها كملف PDF الآن.`,
        'prescription_created',
        { prescription_id: newPrescriptionId, appointment_id: appointment_id }
      );
    } catch (_) {}

    res.status(201).json({
      success: true,
      message: 'تم حفظ الروشتة الطبية بنجاح 📄✅',
      data: {
        id: newPrescriptionId,
        appointment_id,
        diagnosis,
        items_count: items.length
      }
    });
  } catch (err) {
    console.error('❌ خطأ في حفظ الروشتة:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/prescriptions/my (جلب كافة الروشتات الخاصة بالمريض المسجل حالياً للحفظ في الذاكرة دون اتصال)
router.get('/my', authenticate, (req, res) => {
  try {
    const patientId = req.user.id;
    const list = db.prepare(`
      SELECT 
        pr.*,
        d.full_name as doctor_name,
        d.specialty as doctor_specialty,
        COALESCE(c.name, d.clinic_name) as clinic_name,
        a.booking_code,
        (SELECT COUNT(*) FROM prescription_items WHERE prescription_id = pr.id) as items_count
      FROM prescriptions pr
      LEFT JOIN appointments a ON pr.appointment_id = a.id
      LEFT JOIN doctors d ON pr.doctor_id = d.id
      LEFT JOIN clinics c ON (d.clinic_id = c.id OR d.clinic_name = c.name)
      WHERE pr.patient_id = ?
      ORDER BY pr.created_at DESC
    `).all(patientId);

    const itemStmt = db.prepare('SELECT * FROM prescription_items WHERE prescription_id = ?');
    const withItems = list.map(p => ({
      ...p,
      items: itemStmt.all(p.id)
    }));

    res.json({ success: true, data: withItems });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/prescriptions/:id (جلب بيانات الروشتة)
router.get('/:id', authenticate, (req, res) => {
  try {
    const prescriptionId = Number(req.params.id);

    const prescription = db.prepare(`
      SELECT 
        pr.*,
        COALESCE(a.patient_name, p.full_name) as patient_name,
        COALESCE(a.patient_relationship, 'صاحب الحساب') as patient_relationship,
        COALESCE(a.patient_age, p.age) as patient_age,
        COALESCE(a.patient_gender, p.gender) as patient_gender,
        p.full_name as account_holder_name,
        p.phone as patient_phone,
        p.age as patient_age,
        p.gender as patient_gender,
        d.full_name as doctor_name,
        d.specialty as doctor_specialty,
        d.phone as doctor_phone,
        COALESCE(c.name, d.clinic_name) as clinic_name,
        c.address as clinic_address,
        c.phone as clinic_phone,
        c.logo_url as clinic_logo_url,
        a.booking_code
      FROM prescriptions pr
      LEFT JOIN appointments a ON pr.appointment_id = a.id
      LEFT JOIN patients p ON pr.patient_id = p.id
      LEFT JOIN doctors d ON pr.doctor_id = d.id
      LEFT JOIN clinics c ON (d.clinic_id = c.id OR d.clinic_name = c.name)
      WHERE pr.id = ?
    `).get(prescriptionId);

    if (!prescription) {
      return res.status(404).json({ success: false, message: 'الروشتة غير موجودة' });
    }

    const items = db.prepare('SELECT * FROM prescription_items WHERE prescription_id = ?').all(prescriptionId);

    res.json({
      success: true,
      data: {
        ...prescription,
        items
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════
// REQ 10: توليد وبث ملف PDF للروشتة الطبية (Highly Styled PDF Prescription)
// GET /api/v1/prescriptions/:id/pdf
// ════════════════════════════════════════════════════════════════════
router.get('/:id/pdf', authenticate, (req, res) => {
  try {
    const prescriptionId = Number(req.params.id);

    const pr = db.prepare(`
      SELECT 
        pr.*,
        COALESCE(a.patient_name, p.full_name) as patient_name,
        COALESCE(a.patient_relationship, 'صاحب الحساب') as patient_relationship,
        COALESCE(a.patient_age, p.age) as patient_age,
        COALESCE(a.patient_gender, p.gender) as patient_gender,
        p.full_name as account_holder_name,
        p.phone as patient_phone,
        p.age as patient_age,
        p.gender as patient_gender,
        d.full_name as doctor_name,
        d.specialty as doctor_specialty,
        d.phone as doctor_phone,
        COALESCE(c.name, d.clinic_name) as clinic_name,
        c.address as clinic_address,
        c.phone as clinic_phone,
        c.logo_url as clinic_logo_url,
        a.booking_code
      FROM prescriptions pr
      LEFT JOIN appointments a ON pr.appointment_id = a.id
      LEFT JOIN patients p ON pr.patient_id = p.id
      LEFT JOIN doctors d ON pr.doctor_id = d.id
      LEFT JOIN clinics c ON (d.clinic_id = c.id OR d.clinic_name = c.name)
      WHERE pr.id = ?
    `).get(prescriptionId);

    if (!pr) {
      return res.status(404).json({ success: false, message: 'الروشتة غير موجودة' });
    }

    const items = db.prepare('SELECT * FROM prescription_items WHERE prescription_id = ?').all(prescriptionId);

    // إعداد مستند PDF منسق وعصري
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    // تسجيل الخط العربي إن وجد
    const amiriPath = path.join(process.cwd(), 'assets/fonts/Amiri-Regular.ttf');
    const hasArabicFont = fs.existsSync(amiriPath);
    if (hasArabicFont) {
      doc.registerFont('Amiri', amiriPath);
      doc.font('Amiri');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="prescription-${prescriptionId}.pdf"`);
    doc.pipe(res);

    // 🎨 ترويسة الروشتة (Header)
    doc.rect(40, 40, 515, 80).fill('#00695C'); // Emerald Teal Banner

    // فحص وعرض شعار العيادة إذا توفر محلياً
    let headerTextX = 55;
    if (pr.clinic_logo_url && fs.existsSync(pr.clinic_logo_url)) {
      try {
        doc.image(pr.clinic_logo_url, 50, 48, { width: 55, height: 60 });
        headerTextX = 115;
      } catch (imgErr) {
        console.warn('Could not render clinic logo:', imgErr.message);
      }
    }

    doc.fillColor('#FFFFFF').fontSize(18).text(pr.clinic_name || 'Medical Clinic Center', headerTextX, 52);
    doc.fontSize(11).text(`Dr. ${pr.doctor_name || 'Doctor'} - ${pr.doctor_specialty || 'General Practitioner'}`, headerTextX, 76);
    doc.fontSize(9).text(`Address: ${pr.clinic_address || 'Yemen'}`, headerTextX, 94);

    doc.fontSize(10).text(`Ref Code: ${pr.booking_code || `RX-${prescriptionId}`}`, 410, 55, { align: 'right', width: 135 });
    doc.fontSize(9).text(`Date: ${new Date(pr.created_at).toLocaleDateString()}`, 410, 80, { align: 'right', width: 135 });

    doc.moveDown(4);

    // 📋 صندوق بيانات المريض (Patient Information Box)
    const patY = 132;
    doc.rect(40, patY, 515, 52).fillAndStroke('#F4FBF9', '#B2DFDB');
    doc.fillColor('#004D40').fontSize(11);
    doc.text(`Patient: ${pr.patient_name || 'Patient'}`, 55, patY + 12);
    doc.text(`Phone: ${pr.patient_phone || '-'}`, 55, patY + 30);
    doc.text(`Age: ${pr.patient_age || '-'}`, 300, patY + 12);
    doc.text(`Gender: ${pr.patient_gender || '-'}`, 420, patY + 12);

    // 🩺 التشخيص الطبي (Diagnosis)
    const diagY = 196;
    doc.fillColor('#263238').fontSize(11).text('Clinical Diagnosis / التشخيص السريري:', 45, diagY);
    doc.rect(40, diagY + 18, 515, 30).fillAndStroke('#ECEFF1', '#CFD8DC');
    doc.fillColor('#37474F').fontSize(11).text(pr.diagnosis, 55, diagY + 26);

    // 💊 رمز الوصفة الطبية (Rx Symbol)
    const rxY = 252;
    doc.fillColor('#00796B').fontSize(24).text('Rx', 45, rxY);

    // 📊 جدول الأدوية (Medications Table Header)
    const tableTop = rxY + 32;
    doc.rect(40, tableTop, 515, 24).fill('#E0F2F1');
    doc.fillColor('#004D40').fontSize(10);
    doc.text('Medication Name / الدواء', 50, tableTop + 7, { width: 150 });
    doc.text('Dosage / الجرعة', 205, tableTop + 7, { width: 75 });
    doc.text('Frequency / التكرار', 285, tableTop + 7, { width: 90 });
    doc.text('Duration / المدة', 380, tableTop + 7, { width: 70 });
    doc.text('Instructions / التعليمات', 455, tableTop + 7, { width: 95 });

    let currentY = tableTop + 24;

    // صفوف الأدوية (Table Rows)
    items.forEach((item, index) => {
      const bg = index % 2 === 0 ? '#FFFFFF' : '#FAFAFA';
      doc.rect(40, currentY, 515, 24).fill(bg);
      doc.fillColor('#212121').fontSize(9);
      doc.text(item.medication_name, 50, currentY + 7, { width: 150 });
      doc.text(item.dosage || '-', 205, currentY + 7, { width: 75 });
      doc.text(item.frequency || '-', 285, currentY + 7, { width: 90 });
      doc.text(item.duration || '-', 380, currentY + 7, { width: 70 });
      doc.text(item.instructions || '-', 455, currentY + 7, { width: 95 });
      currentY += 24;
    });

    // 📝 ملاحظات إضافية (Notes)
    if (pr.notes) {
      currentY += 15;
      doc.fillColor('#37474F').fontSize(10).text('Doctor Notes & Instructions / ملاحظات وتعليمات الطبيب:', 45, currentY);
      doc.rect(40, currentY + 14, 515, 30).fillAndStroke('#FFFDE7', '#FFF59D');
      doc.fillColor('#F57F17').fontSize(9).text(pr.notes, 55, currentY + 22);
      currentY += 50;
    }

    // ✍️ توقيع الطبيب (Doctor Signature Line)
    const signY = 680;
    doc.moveTo(380, signY).lineTo(540, signY).strokeColor('#78909C').stroke();
    doc.fillColor('#546E7A').fontSize(10).text(`Dr. ${pr.doctor_name || 'Doctor'}`, 380, signY + 6, { align: 'center', width: 160 });
    doc.fontSize(8).text('Stamp & Signature / الختم والتوقيع', 380, signY + 20, { align: 'center', width: 160 });

    // 📞 التذييل ومعلومات التواصل (Footer)
    const footerY = 745;
    doc.rect(40, footerY, 515, 42).fill('#ECEFF1');
    doc.fillColor('#455A64').fontSize(8);
    doc.text(`Clinic Address: ${pr.clinic_address || 'Yemen'}  |  Contact: ${pr.clinic_phone || pr.doctor_phone || '770000000'}`, 50, footerY + 8, { align: 'center', width: 495 });
    doc.text('This official medical electronic prescription is generated securely via Tabibak Health Platform.', 50, footerY + 20, { align: 'center', width: 495 });
    doc.text('تم إنشاء هذه الروشتة الإلكترونية المعتمدة رسمياً عبر منصة طبيبك للرعاية الصحية', 50, footerY + 30, { align: 'center', width: 495 });

    doc.end();
  } catch (err) {
    console.error('❌ خطأ في توليد PDF للروشتة:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
