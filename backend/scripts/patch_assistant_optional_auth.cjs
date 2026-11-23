const fs = require('fs');
const path = require('path');

const aPath = path.join(__dirname, '../src/routes/assistant.js');
let aCode = fs.readFileSync(aPath, 'utf8').replace(/\r\n/g, '\n');

aCode = aCode.replace(
  "import { authenticate } from '../middleware/auth.js';",
  `import jwt from 'jsonwebtoken';

function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        req.user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      }
    }
  } catch (_) {}
  next();
}`
);

aCode = aCode.replace(
  "router.post('/chat', authenticate,",
  "router.post('/chat', optionalAuth,"
);

fs.writeFileSync(aPath, aCode.replace(/\n/g, '\r\n'), 'utf8');
console.log('✅ assistant.js updated with optionalAuth');
