import * as Sentry from '@sentry/node';
import { AppError } from '../core/errors/index.js';
import { logger } from './auditLog.js';

/**
 * 🛡️ Enterprise Global Error Handler
 */
export function errorHandler(err, req, res, next) {
  const status = err.statusCode || err.status || 500;
  let message = err.message || 'حدث خطأ في الخادم';
  const code = err.code || (status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR');

  // Explicitly capture unhandled/500 errors to Sentry if DSN is set
  if (process.env.SENTRY_DSN && status >= 500) {
    Sentry.captureException(err);
  }

  logger.error('unhandled_error', {
    method: req.method,
    url: req.originalUrl,
    statusCode: status,
    code,
    message: err.message,
    stack: err.stack,
    userId: req.user?.id,
    ip: req.ip,
  });

  // Protect internal database details from leaking in production for unhandled server errors
  if (process.env.NODE_ENV === 'production' && status >= 500 && !(err instanceof AppError)) {
    message = 'حدث خطأ غير متوقع في النظام. يرجى المحاولة لاحقاً.';
  }

  res.status(status).json({
    success: false,
    code,
    message,
    ...(err.details && { details: err.details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * 404 Route Not Found
 */
export function notFound(req, res) {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: 'المسار غير موجود',
  });
}