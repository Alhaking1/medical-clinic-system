import db from '../config/database.js';
import fs from 'fs';
import path from 'path';

const BACKUP_DIR = process.env.BACKUP_PATH || (fs.existsSync('/data') ? '/data/backups' : path.join(process.cwd(), 'backups'));
const MAX_BACKUPS = 30;

/**
 * 🛡️ Performs an atomic, non-blocking backup of the SQLite database using SQLite's native backup API.
 * Safely checkpoints and handles WAL journal mode without torn pages or data corruption.
 */
export async function performBackup() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `medical-${timestamp}.db`);

    // better-sqlite3 native backup API (promises-based)
    await db.backup(backupFile);
    console.log(`[BACKUP] ✅ Backup completed safely: ${path.basename(backupFile)}`);

    // Clean old backups keeping max MAX_BACKUPS
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('medical-') && f.endsWith('.db'))
      .map(f => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time);

    files.slice(MAX_BACKUPS).forEach(f => {
      try {
        fs.unlinkSync(f.path);
        console.log(`[BACKUP] 🗑️ Cleaned old backup: ${f.name}`);
      } catch (delErr) {
        console.warn(`[BACKUP] Warning deleting old backup ${f.name}:`, delErr.message);
      }
    });

    return backupFile;
  } catch (err) {
    console.error('[BACKUP] ❌ Backup failed:', err.message);
    return null;
  }
}

export function startBackupSchedule() {
  // Backup schedule every 6 hours
  setInterval(performBackup, 6 * 60 * 60 * 1000);
  
  // Initial backup after 1 minute of server boot
  setTimeout(performBackup, 60 * 1000);
  console.log('✅ SQLite WAL Backup scheduled (every 6h, max 30 snapshots)');
}
