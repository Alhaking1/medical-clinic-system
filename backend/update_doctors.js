import fs from 'fs';

let code = fs.readFileSync('src/routes/doctors.js', 'utf8');

const targetStr = 'let query = "SELECT * FROM doctors WHERE is_deleted = 0";';
const replacementStr = `let query = \`
      SELECT 
        id, full_name, specialty, clinic_name, governorate, address, avatar, bio,
        experience_years, consultation_fee, slot_duration, is_active, status, rating,
        google_maps_url, clinic_id,
        COALESCE((
          SELECT SUM(max_bookings - booked_count)
          FROM doctor_periods dp
          WHERE dp.doctor_id = doctors.id 
            AND dp.is_cancelled = 0 
            AND dp.is_stopped = 0 
            AND dp.date >= date('now')
        ), 10) as available_seats
      FROM doctors
      WHERE is_deleted = 0
    \`;`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
  code = code.replace('OR phone LIKE ?', '');
  code = code.replace("params.push(`%${search}%`, `%${search}%`, `%${search}%`);", "params.push(`%${search}%`, `%${search}%`);");
  fs.writeFileSync('src/routes/doctors.js', code, 'utf8');
  console.log('✅ doctors.js updated successfully!');
} else {
  console.log('Target string not found, inspecting excerpt:');
  console.log(code.substring(100, 400));
}
