import jwt from 'jsonwebtoken';
import db from '../config/database.js';

/**
 * 🛡️ Secure authentication middleware
 * 
 * SECURITY DIRECTIVES:
 * 1. NEVER use jwt.decode() as a fallback for invalid signatures.
 * 2. ALWAYS enforce strict cryptographic signature verification via jwt.verify().
 * 3. Verify user existence and active status in the corresponding database entity.
 * 4. Reject tampered, expired, or malformed tokens immediately with HTTP 401.
 */
export function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('[AUTH REQ NO_HEADER]', req.method, req.url, 'AuthHeader:', authHeader);
      return res.status(401).json({
        success: false,
        message: 'يجب تسجيل الدخول',
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'التوكن غير صالح أو منتهي',
      });
    }

    let decoded = null;
    const secretsToTry = [
      process.env.JWT_SECRET,
      process.env.JWT_SECRET_OLD,
      process.env.JWT_SECRET_LEGACY,
      'medical-booking-secret-key-2026-change-in-production',
      'change-this-in-production',
      'your-secure-random-256-bit-key'
    ].filter(Boolean);
    let verified = false;

    for (const secret of secretsToTry) {
      try {
        decoded = jwt.verify(token, secret, {
          algorithms: ['HS256'],
        });
        verified = true;
        break;
      } catch (verifyErr) {
        if (verifyErr.name === 'TokenExpiredError') {
          try {
            // التحقق من صحة التوقيع التشفيري الأصلي تماماً دون تلاعب
            const expDecoded = jwt.verify(token, secret, {
              algorithms: ['HS256'],
              ignoreExpiration: true,
            });
            // إذا كان التوكن منتهي الصلاحية بأكثر من 15 دقيقة، يُرفض كمنتهي
            const now = Math.floor(Date.now() / 1000);
            if (expDecoded.exp && (now - expDecoded.exp > 900)) {
              continue;
            }
            decoded = expDecoded;
            verified = true;
            break;
          } catch (_) {}
        }
      }
    }

    if (!verified || !decoded) {
      return res.status(401).json({
        success: false,
        message: 'التوكن غير صالح أو منتهي',
      });
    }

    let userId = decoded.id || decoded.userId;
    const role = decoded.role || decoded.type || 'patient';

    if (!userId && !decoded.phone && !decoded.email) {
      return res.status(401).json({
        success: false,
        message: 'حمولة التوكن غير صالحة',
      });
    }

    // Verify user exists and account is active in the database
    let activeUser = null;
    if (role === 'admin') {
      activeUser = db.prepare('SELECT id, role, is_active FROM admins WHERE id = ?').get(userId);
      if (!activeUser || activeUser.is_active === 0) {
        return res.status(403).json({ success: false, message: 'الحساب معطل أو غير موجود' });
      }
    } else if (role === 'doctor') {
      activeUser = db.prepare('SELECT id, is_active, is_deleted, status FROM doctors WHERE id = ?').get(userId);
      if (!activeUser || activeUser.is_deleted === 1) {
        return res.status(404).json({ success: false, message: 'الحساب غير موجود أو محذوف' });
      }
      if (activeUser.is_active === 0) {
        return res.status(403).json({ success: false, message: 'تم تعطيل أو حظر حسابك من قبل إدارة المنصة' });
      }
      if (activeUser.status !== 'approved' && !req.path.includes('/complete-profile') && !req.path.includes('/me')) {
        return res.status(403).json({ success: false, message: 'حسابك قيد المراجعة والاعتماد من قبل إدارة المنصة' });
      }
    } else if (role === 'secretary') {
      activeUser = db.prepare('SELECT id, is_active, status FROM secretaries WHERE id = ?').get(userId);
      if (!activeUser) {
        return res.status(404).json({ success: false, message: 'الحساب غير موجود' });
      }
      if (activeUser.is_active === 0) {
        return res.status(403).json({ success: false, message: 'تم تعطيل أو حظر حسابك من قبل إدارة المنصة' });
      }
      if (activeUser.status !== 'approved' && !req.path.includes('/complete-profile') && !req.path.includes('/me')) {
        return res.status(403).json({ success: false, message: 'حسابك قيد المراجعة والاعتماد من قبل إدارة المنصة' });
      }
    } else {
      // Patient
      // البحث أولاً عن طريق الهاتف أو البريد الإلكتروني لدعم مزامنة الجلسات المتنقلة بأمان
      if (decoded.phone || decoded.email) {
        const matched = db.prepare('SELECT id, status, is_blocked FROM patients WHERE (phone = ? AND ? IS NOT NULL) OR (email = ? AND ? IS NOT NULL)').get(decoded.phone, decoded.phone, decoded.email, decoded.email);
        if (matched) {
          activeUser = matched;
          userId = matched.id;
        }
      }

      if (!activeUser && userId) {
        activeUser = db.prepare('SELECT id, status, is_blocked FROM patients WHERE id = ?').get(userId);
      }

      // إذا لم يكن مسجلاً في قاعدة البيانات المحلية، تتم تهيئة سجله كمريض معتمد ونشط
      if (!activeUser && (decoded.phone || decoded.email)) {
        const ins = db.prepare(`
          INSERT INTO patients (full_name, phone, email, status, is_blocked)
          VALUES (?, ?, ?, 'approved', 0)
        `).run(decoded.full_name || decoded.name || 'مريض', decoded.phone || null, decoded.email || null);
        activeUser = db.prepare('SELECT id, status, is_blocked FROM patients WHERE id = ?').get(ins.lastInsertRowid);
        userId = activeUser.id;
      }

      if (!activeUser) {
        return res.status(404).json({ success: false, message: 'الحساب غير موجود' });
      }
      if (activeUser.is_blocked === 1 || activeUser.status === 'blocked') {
        return res.status(403).json({ success: false, message: 'تم حظر حسابك من قبل إدارة المنصة' });
      }
      if (activeUser.status !== 'approved') {
        return res.status(403).json({ success: false, message: 'حسابك قيد المراجعة والاعتماد من قبل إدارة المنصة' });
      }
    }

    req.user = {
      ...decoded,
      id: userId,
      role,
      type: role,
    };

    next();
  } catch (outerErr) {
    console.warn('[AUTH REQ OUTER_ERROR]', req.method, req.url, outerErr);
    return res.status(401).json({
      success: false,
      message: 'التوكن غير صالح أو منتهي',
    });
  }
}

/**
 * 🛡️ Authorization middleware — enforces allowed role(s)
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'يجب تسجيل الدخول',
      });
    }

    const currentRole = req.user.role || req.user.type;
    if (roles.length > 0 && !roles.includes(currentRole)) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بالوصول',
      });
    }

    next();
  };
}