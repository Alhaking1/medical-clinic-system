import logger from '../shared/utils/logger.js';

export { logger };

export function requestLogger(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    if (duration > 2000) {
      logger.warn('slow_request', {
        method: req.method,
        url: req.originalUrl,
        duration,
        ip: req.ip
      });
    }
    
    if (res.statusCode >= 500) {
      logger.error('server_error', {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        ip: req.ip
      });
    } else if (res.statusCode >= 400 && req.originalUrl.includes('/auth/')) {
      logger.warn('auth_failure', {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        ip: req.ip
      });
    }
  });
  
  next();
}
