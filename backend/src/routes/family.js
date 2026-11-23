import express from 'express';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// ════════════════════════════════════════════════════════════════════
// 👨‍👩‍👧‍👦 إدارة أفراد العائلة والتابعين للمريض (Family Members & Dependents)
// ════════════════════════════════════════════════════════════════════

// إنشاء الجدول والأعمدة إن لم تكن موجودة
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS family_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      relationship TEXT NOT NULL,
      gender TEXT NOT NULL,
      age INTEGER,
      birth_date TEXT,
      blood_group TEXT,
      chronic_diseases TEXT,
      allergies TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES patients(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_family_user ON family_members(user_id);
  `);

  // إضافة أعمدة العائلة لجدول الحجوزات appointments
  const apptCols = db.prepare('PRAGMA table_info(appointments)').all().map(c => c.name);
  if (!apptCols.includes('family_member_id')) {
    db.exec('ALTER TABLE appointments ADD COLUMN family_member_id INTEGER');
  }
  if (!apptCols.includes('patient_name')) {
    db.exec('ALTER TABLE appointments ADD COLUMN patient_name TEXT');
  }
  if (!apptCols.includes('patient_relationship')) {
    db.exec('ALTER TABLE appointments ADD COLUMN patient_relationship TEXT');
  }
  if (!apptCols.includes('patient_age')) {
    db.exec('ALTER TABLE appointments ADD COLUMN patient_age INTEGER');
  }
  if (!apptCols.includes('patient_gender')) {
    db.exec('ALTER TABLE appointments ADD COLUMN patient_gender TEXT');
  }
} catch (e) {
  console.error('Family migration note:', e.message);
}

/**
 * 📋 GET /api/v1/family
 * جلب جميع أفراد عائلة المريض المسجل
 */
router.get('/', authenticate, (req, res) => {
  try {
    const userId = req.user.id;
    const members = db.prepare(`
      SELECT 
        id, user_id, name, relationship, gender, age, birth_date,
        blood_group, chronic_diseases, allergies, notes, created_at
      FROM family_members
      WHERE user_id = ?
      ORDER BY id ASC
    `).all(userId);

    res.json({
      success: true,
      data: members
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ➕ POST /api/v1/family
 * إضافة فرد جديد للعائلة (ابن، ابنة، زوج/زوجة، أب، أم، إلخ)
 */
router.post('/', authenticate, (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      relationship,
      gender = 'male',
      age,
      birth_date,
      blood_group,
      chronic_diseases,
      allergies,
      notes
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'اسم فرد العائلة مطلوب' });
    }
    if (!relationship || !relationship.trim()) {
      return res.status(400).json({ success: false, message: 'صلة القرابة مطلوبة (ابن، ابنة، زوجة، إلخ)' });
    }

    const result = db.prepare(`
      INSERT INTO family_members
        (user_id, name, relationship, gender, age, birth_date, blood_group, chronic_diseases, allergies, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      name.trim(),
      relationship.trim(),
      gender === 'female' ? 'female' : 'male',
      age ? Number(age) : null,
      birth_date ? String(birth_date).trim() : null,
      blood_group ? String(blood_group).trim() : null,
      chronic_diseases ? String(chronic_diseases).trim() : null,
      allergies ? String(allergies).trim() : null,
      notes ? String(notes).trim() : null
    );

    const newMember = db.prepare('SELECT * FROM family_members WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: 'تمت إضافة فرد العائلة بنجاح 👨‍👩‍👧‍👦',
      data: newMember
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ✏️ PUT /api/v1/family/:id
 * تعديل بيانات فرد عائلة
 */
router.put('/:id', authenticate, (req, res) => {
  try {
    const userId = req.user.id;
    const memberId = Number(req.params.id);

    const existing = db.prepare('SELECT * FROM family_members WHERE id = ? AND user_id = ?').get(memberId, userId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'فرد العائلة غير موجود' });
    }

    const {
      name,
      relationship,
      gender,
      age,
      birth_date,
      blood_group,
      chronic_diseases,
      allergies,
      notes
    } = req.body;

    db.prepare(`
      UPDATE family_members
      SET name = COALESCE(?, name),
          relationship = COALESCE(?, relationship),
          gender = COALESCE(?, gender),
          age = COALESCE(?, age),
          birth_date = COALESCE(?, birth_date),
          blood_group = COALESCE(?, blood_group),
          chronic_diseases = COALESCE(?, chronic_diseases),
          allergies = COALESCE(?, allergies),
          notes = COALESCE(?, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(
      name?.trim() || null,
      relationship?.trim() || null,
      gender || null,
      age !== undefined ? Number(age) : null,
      birth_date || null,
      blood_group || null,
      chronic_diseases || null,
      allergies || null,
      notes || null,
      memberId,
      userId
    );

    const updated = db.prepare('SELECT * FROM family_members WHERE id = ?').get(memberId);

    res.json({
      success: true,
      message: 'تم تحديث بيانات فرد العائلة بنجاح',
      data: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 🗑️ DELETE /api/v1/family/:id
 * حذف فرد عائلة
 */
router.delete('/:id', authenticate, (req, res) => {
  try {
    const userId = req.user.id;
    const memberId = Number(req.params.id);

    const existing = db.prepare('SELECT id FROM family_members WHERE id = ? AND user_id = ?').get(memberId, userId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'فرد العائلة غير موجود' });
    }

    db.prepare('DELETE FROM family_members WHERE id = ? AND user_id = ?').run(memberId, userId);

    res.json({
      success: true,
      message: 'تم حذف فرد العائلة بنجاح'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
