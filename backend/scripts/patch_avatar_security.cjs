const fs = require('fs');
const file = 'C:/Users/lenovo/AndroidProjects/MedicalClinicApp/app/src/main/java/com/medical/clinic/ui/patient/PatientProfileFragment.kt';
let code = fs.readFileSync(file, 'utf8');

const targetStart = '    private fun processAndUploadAvatar(uri: Uri) {';
const targetEnd = '    private fun displayAvatar(url: String?) {';

const idxStart = code.indexOf(targetStart);
const idxEnd = code.indexOf(targetEnd);

if (idxStart === -1 || idxEnd === -1) {
  console.error('Target not found', idxStart, idxEnd);
  process.exit(1);
}

const replacement = `    private fun processAndUploadAvatar(uri: Uri) {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                progressAvatarUpload?.visibility = View.VISIBLE
                layoutAvatarContainer?.isEnabled = false

                val context = requireContext()

                // 1. فحص الحجم المسموح (الحد الأقصى 3 ميجابايت)
                val rawBytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
                    ?: throw IllegalStateException("تعذر قراءة بيانات ملف الصورة المختارة")

                val maxSizeBytes = 3 * 1024 * 1024 // 3MB
                if (rawBytes.size > maxSizeBytes) {
                    val sizeMb = String.format(java.util.Locale.US, "%.2f", rawBytes.size / (1024.0 * 1024.0))
                    android.app.AlertDialog.Builder(context)
                        .setTitle("⚠️ حجم الصورة كبير جداً")
                        .setMessage("الحد الأقصى المسموح به لحجم الصورة هو 3 ميجابايت، بينما حجم الصورة المختارة هو " + sizeMb + " ميجابايت.\\n\\nيرجى اختيار صورة أصغر حجماً.")
                        .setPositiveButton("حسناً", null)
                        .show()
                    return@launch
                }

                // 2. فحص الهيدر السحري (Magic Bytes) للتحقق من كونها صورة حقيقية
                val isJpeg = rawBytes.size >= 3 && rawBytes[0] == 0xFF.toByte() && rawBytes[1] == 0xD8.toByte() && rawBytes[2] == 0xFF.toByte()
                val isPng = rawBytes.size >= 4 && rawBytes[0] == 0x89.toByte() && rawBytes[1] == 0x50.toByte() && rawBytes[2] == 0x4E.toByte() && rawBytes[3] == 0x47.toByte()
                val isWebp = rawBytes.size >= 12 && rawBytes[0] == 'R'.code.toByte() && rawBytes[1] == 'I'.code.toByte() && rawBytes[2] == 'F'.code.toByte() && rawBytes[3] == 'F'.code.toByte() && rawBytes[8] == 'W'.code.toByte() && rawBytes[9] == 'E'.code.toByte() && rawBytes[10] == 'B'.code.toByte() && rawBytes[11] == 'P'.code.toByte()

                if (!isJpeg && !isPng && !isWebp) {
                    android.app.AlertDialog.Builder(context)
                        .setTitle("⚠️ صيغة غير مدعومة")
                        .setMessage("الملف المختار ليس صورة صالحة. يرجى اختيار ملف صورة حقيقي بصيغة (JPG, PNG, WEBP).")
                        .setPositiveButton("حسناً", null)
                        .show()
                    return@launch
                }

                // 3. الفاحص الأمني الصارم ضد التلغيم والبرمجيات الخبيثة والأكواد المحقونة (Malware & Script Scanner)
                val rawString = String(rawBytes, java.nio.charset.StandardCharsets.ISO_8859_1).lowercase()
                val dangerousSignatures = listOf(
                    "<?php", "<script", "<html", "<svg", "javascript:",
                    "onerror=", "onload=", "eval(", "base64_decode",
                    "exec(", "system(", "passthru(", "shell_exec(",
                    "<!entity", "<!doctype", "/bin/sh", "/bin/bash",
                    "powershell", "cmd.exe", "mshta", "cscript"
                )

                val detectedPayload = dangerousSignatures.firstOrNull { rawString.contains(it) }
                if (detectedPayload != null) {
                    android.app.AlertDialog.Builder(context)
                        .setTitle("🚨 تنبيه أمني عاجل")
                        .setMessage("تم فحص الملف واكتشاف نصوص برمجية أو أكواد مشبوهة داخل الملف!\\n\\nتم رفض رفع الصورة فوراً لحماية أمان حسابك وهاتفك وبيانات المنصة الطبية.")
                        .setIcon(android.R.drawable.ic_dialog_alert)
                        .setPositiveButton("فهمت ذلك", null)
                        .show()
                    return@launch
                }

                // 4. إعادة بناء البكسلات النقية وتجريد الملف من أي كود أو بيانات خفية (Pure Pixel Reconstruction)
                val originalBitmap = BitmapFactory.decodeByteArray(rawBytes, 0, rawBytes.size)
                    ?: throw IllegalStateException("تعذر فك ترميز بكسلات الصورة. قد يكون الملف تالفاً.")

                val size = minOf(originalBitmap.width, originalBitmap.height)
                val x = (originalBitmap.width - size) / 2
                val y = (originalBitmap.height - size) / 2
                val croppedBitmap = Bitmap.createBitmap(originalBitmap, x, y, size, size)
                val finalBitmap = Bitmap.createScaledBitmap(croppedBitmap, 400, 400, true)

                // توليد ملف صورة نظيف 100% يحتوي على بكسلات نقية فقط دون أي إضافات
                val tempFile = File(context.cacheDir, "clean_avatar_" + System.currentTimeMillis() + ".jpg")
                FileOutputStream(tempFile).use { out ->
                    finalBitmap.compress(Bitmap.CompressFormat.JPEG, 92, out)
                }

                val requestBody = tempFile.asRequestBody("image/jpeg".toMediaTypeOrNull())
                val part = MultipartBody.Part.createFormData("image", tempFile.name, requestBody)

                val response = apiClient.apiService.uploadAvatar(part)
                if (response.isSuccessful && response.body()?.success == true) {
                    val avatarUrl = response.body()?.avatarUrl
                    Toast.makeText(context, "تم فحص وتحديث صورتك الشخصية بأمان بنجاح ✨", Toast.LENGTH_SHORT).show()
                    val currentUser = sessionManager.getUser()
                    if (currentUser != null && avatarUrl != null) {
                        val updatedUser = currentUser.copy(avatarUrl = avatarUrl)
                        sessionManager.saveUser(updatedUser)
                        displayAvatar(updatedUser.bestAvatar)
                    }
                } else {
                    val rawErr = response.errorBody()?.string()
                    val parsedMsg = try {
                        org.json.JSONObject(rawErr ?: "").optString("message", rawErr ?: "تعذر رفع الصورة")
                    } catch (_: Exception) {
                        rawErr ?: "فشل خادم التطبيق في رفع الصورة"
                    }
                    Toast.makeText(context, "فشل الرفع: " + parsedMsg, Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "خطأ: " + (e.localizedMessage ?: "تعذر رفع الصورة"), Toast.LENGTH_LONG).show()
            } finally {
                progressAvatarUpload?.visibility = View.GONE
                layoutAvatarContainer?.isEnabled = true
            }
        }
    }

`;

code = code.substring(0, idxStart) + replacement + code.substring(idxEnd);
fs.writeFileSync(file, code, 'utf8');
console.log('Successfully updated PatientProfileFragment.kt with security scanner!');
