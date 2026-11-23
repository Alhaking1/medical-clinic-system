const fs = require('fs');
const path = require('path');

const sPath = path.join(__dirname, '../src/server.js');
let sCode = fs.readFileSync(sPath, 'utf8').replace(/\r\n/g, '\n');

if (!sCode.includes('assistantRoutes')) {
  sCode = sCode.replace(
    "import familyRoutes from './routes/family.js';",
    "import familyRoutes from './routes/family.js';\nimport assistantRoutes from './routes/assistant.js';"
  );
  sCode = sCode.replace(
    "app.use('/api/v1/family', familyRoutes);",
    "app.use('/api/v1/family', familyRoutes);\napp.use('/api/v1/assistant', assistantRoutes);"
  );
  fs.writeFileSync(sPath, sCode.replace(/\n/g, '\r\n'), 'utf8');
  console.log('✅ Mounted /api/v1/assistant in server.js');
} else {
  console.log('ℹ️ assistantRoutes already mounted');
}
