/**
 * 🏛️ Application Error Hierarchy
 * Standardized operational error classes for enterprise resilience
 */

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'بيانات غير صحيحة', details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'يجب تسجيل الدخول') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'غير مصرح لك بالوصول') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'العنصر') {
    super(`${resource} غير موجود`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'البيانات موجودة مسبقاً أو هناك تعارض') {
    super(message, 409, 'CONFLICT');
  }
}

export class InternalError extends AppError {
  constructor(message = 'حدث خطأ في النظام') {
    super(message, 500, 'INTERNAL_ERROR', false);
  }
}
