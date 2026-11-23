import fs from 'fs';
const file = 'C:/Users/lenovo/AndroidProjects/MedicalClinicApp/app/build.gradle.kts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  'buildConfigField("String", "BASE_URL", "\\"http://127.0.0.1:8000/api/v1/\\"")',
  'buildConfigField("String", "BASE_URL", "\\"https://medical-booking-backend-production.up.railway.app/api/v1/\\"")'
);
fs.writeFileSync(file, content, 'utf8');
console.log('Patient app build.gradle.kts BASE_URL restored to Railway successfully!');
