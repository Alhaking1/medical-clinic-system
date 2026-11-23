/**
 * 🏛️ Standardized API Response Helpers
 */

export function success(res, data = null, message = null, meta = {}) {
  const payload = {
    success: true,
    ...(data !== null && { data }),
    ...(message && { message }),
    ...meta,
  };
  return res.json(payload);
}

export function created(res, data = null, message = 'تم الإنشاء بنجاح') {
  return res.status(201).json({
    success: true,
    ...(data !== null && { data }),
    message,
  });
}

export function error(res, message = 'حدث خطأ', statusCode = 500, code = 'ERROR', details = null) {
  return res.status(statusCode).json({
    success: false,
    code,
    message,
    ...(details && { details }),
  });
}
