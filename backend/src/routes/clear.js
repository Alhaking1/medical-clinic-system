import express from 'express';
import db from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// مسح جدول محدد
router.delete('/clear/:table', authenticate, authorize('admin'), (req, res) => {  try {
    const { table } = req.params;

    const allowedTables = [
      'doctors',
      'secretaries',
      'patients',
      'appointments',
      'payments',
      'slots',
      'queue',
    ];

    if (!allowedTables.includes(table)) {
      return res.status(400).json({
        success: false,
        message: 'الجدول غير مسموح',
      });
    }

    db.prepare(`DELETE FROM ${table}`).run();

    try {
      db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(table);
    } catch (e) {
      // ignore
    }

    res.json({
      success: true,
      message: `تم مسح بيانات ${table} بنجاح`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// مسح كل الجداول
router.delete('/clear-all', authenticate, authorize('admin'), (req, res) => {
  
  
  try {
    const tables = [
      'queue',
      'payments',
      'appointments',
      'slots',
      'patients',
      'secretaries',
      'doctors',
    ];

    for (const table of tables) {
      db.prepare(`DELETE FROM ${table}`).run();
      try {
        db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(table);
      } catch (e) {
        // ignore
      }
    }

    res.json({
      success: true,
      message: 'تم مسح كل البيانات بنجاح',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;