package com.medical.clinic.staff.utils

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.os.Build
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.medical.clinic.staff.data.models.PrescriptionItemPayload
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.OutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

/**
 * 🖨️ مساعد الطباعة الحرارية عبر البلوتوث (ESC/POS Thermal Printing)
 * مصمم خصيصاً للعيادات والمراكز الصحية لطباعة الروشتات وتذاكر الكشف بالعربية 100%
 * عبر تقنية تحويل النصوص إلى صورة نقطية (Bitmap Rasterizer) لدعم أي طابعة 58mm أو 80mm دون مشاكل ترميز.
 */
object ThermalPrinterHelper {

    private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
    private const val PREFS_NAME = "tabeebak_printer_prefs"
    private const val KEY_LAST_PRINTER_MAC = "last_printer_mac"
    private const val PRINTER_WIDTH_58MM = 384 // عرض الورق الحراري 58mm القياسي بالبكسل

    data class PrescriptionPrintData(
        val clinicName: String = "عيادة طبية",
        val doctorName: String = "الطبيب",
        val doctorSpecialty: String = "استشاري",
        val patientName: String = "المريض",
        val bookingCode: String = "",
        val appointmentId: Int = 0,
        val diagnosis: String = "",
        val notes: String? = null,
        val items: List<PrescriptionItemPayload> = emptyList(),
        val dateStr: String = SimpleDateFormat("yyyy-MM-dd hh:mm a", Locale("ar")).format(Date())
    )

    /**
     * بدء عملية الطباعة مع اختيار الطابعة المقترنة
     */
    fun printPrescription(
        context: Context,
        data: PrescriptionPrintData,
        onComplete: ((Boolean, String) -> Unit)? = null
    ) {
        val adapter = BluetoothAdapter.getDefaultAdapter()
        if (adapter == null) {
            val msg = "هذا الجهاز لا يدعم البلوتوث"
            Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
            onComplete?.invoke(false, msg)
            return
        }

        if (!adapter.isEnabled) {
            val msg = "يرجى تشغيل البلوتوث أولاً للطباعة"
            Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
            onComplete?.invoke(false, msg)
            return
        }

        // جلب الطابعات المقترنة
        @SuppressLint("MissingPermission")
        val pairedDevices = adapter.bondedDevices?.toList() ?: emptyList()
        if (pairedDevices.isEmpty()) {
            val msg = "لا توجد طابعات بلوتوث مقترنة. يرجى إقران الطابعة من إعدادات البلوتوث في الهاتف أولاً."
            MaterialAlertDialogBuilder(context)
                .setTitle("طابعة البلوتوث غير متصلة")
                .setMessage(msg)
                .setPositiveButton("حسناً", null)
                .show()
            onComplete?.invoke(false, msg)
            return
        }

        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val lastMac = prefs.getString(KEY_LAST_PRINTER_MAC, null)
        val lastDevice = pairedDevices.find { it.address == lastMac }

        val deviceNames = pairedDevices.map { dev ->
            @SuppressLint("MissingPermission")
            val name = dev.name ?: "طابعة غير معروفة"
            "$name (${dev.address})"
        }.toTypedArray()

        val defaultIndex = if (lastDevice != null) pairedDevices.indexOf(lastDevice) else 0

        MaterialAlertDialogBuilder(context)
            .setTitle("اختر طابعة البلوتوث الحرارية 🖨️")
            .setSingleChoiceItems(deviceNames, defaultIndex) { dialog, which ->
                val selectedDevice = pairedDevices[which]
                prefs.edit().putString(KEY_LAST_PRINTER_MAC, selectedDevice.address).apply()
                dialog.dismiss()
                sendToPrinter(context, selectedDevice, data, onComplete)
            }
            .setNegativeButton("إلغاء", null)
            .show()
    }

    /**
     * إرسال بيانات الطباعة للطابعة المحددة
     */
    @SuppressLint("MissingPermission")
    private fun sendToPrinter(
        context: Context,
        device: BluetoothDevice,
        data: PrescriptionPrintData,
        onComplete: ((Boolean, String) -> Unit)?
    ) {
        Toast.makeText(context, "جاري الاتصال بالطابعة والطباعة...", Toast.LENGTH_SHORT).show()

        CoroutineScope(Dispatchers.IO).launch {
            var socket: BluetoothSocket? = null
            var outStream: OutputStream? = null
            try {
                socket = device.createRfcommSocketToServiceRecord(SPP_UUID)
                socket.connect()
                outStream = socket.outputStream

                // تهيئة الطابعة ESC/POS (ESC @)
                outStream.write(byteArrayOf(0x1B, 0x40))

                // توليد صورة الروشتة بالعربية بجودة نقطية عالية
                val bitmap = renderPrescriptionBitmap(data, PRINTER_WIDTH_58MM)
                val escPosBytes = bitmapToEscPosRaster(bitmap)

                outStream.write(escPosBytes)

                // تغذية الورق والقص الجزئي (Feed & Cut)
                outStream.write(byteArrayOf(0x1B, 0x64, 0x04)) // Feed 4 lines
                outStream.write(byteArrayOf(0x1D, 0x56, 0x42, 0x00)) // Partial Cut

                outStream.flush()

                withContext(Dispatchers.Main) {
                    Toast.makeText(context, "تمت طباعة الروشتة بنجاح 🖨️✅", Toast.LENGTH_LONG).show()
                    onComplete?.invoke(true, "تمت الطباعة بنجاح")
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    val err = "فشل الاتصال بالطابعة: ${e.message}"
                    Toast.makeText(context, err, Toast.LENGTH_LONG).show()
                    onComplete?.invoke(false, err)
                }
            } finally {
                try {
                    outStream?.close()
                    socket?.close()
                } catch (_: Exception) {}
            }
        }
    }

    /**
     * رسم الروشتة الطبية بدقة كـ Bitmap لدعم الخط العربي المتصل على أي طابعة حرارية
     */
    private fun renderPrescriptionBitmap(data: PrescriptionPrintData, width: Int): Bitmap {
        // حساب الارتفاع المطلوب ديناميكياً
        val estimatedHeight = 500 + (data.items.size * 130) + (if (!data.notes.isNullOrBlank()) 140 else 0)
        val bitmap = Bitmap.createBitmap(width, estimatedHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.WHITE)

        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.BLACK
            textAlign = Paint.Align.CENTER
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        }

        var y = 40f

        // 1. ترويسة العيادة
        paint.textSize = 26f
        canvas.drawText("🏥 " + data.clinicName, width / 2f, y, paint)
        y += 34f

        paint.textSize = 21f
        paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.NORMAL)
        canvas.drawText("د. " + data.doctorName + " - " + data.doctorSpecialty, width / 2f, y, paint)
        y += 30f

        // خط فاصل
        paint.strokeWidth = 2f
        canvas.drawLine(15f, y, width - 15f, y, paint)
        y += 25f

        // 2. بيانات المريض والكود
        paint.textAlign = Paint.Align.RIGHT
        paint.textSize = 19f
        paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        canvas.drawText("المريض: " + data.patientName, width - 20f, y, paint)
        y += 26f

        paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.NORMAL)
        paint.textSize = 17f
        val codeText = if (data.bookingCode.isNotBlank()) "كود الحجز: #${data.bookingCode}" else "رقم الحجز: #${data.appointmentId}"
        canvas.drawText(codeText, width - 20f, y, paint)
        y += 24f

        canvas.drawText("التاريخ: " + data.dateStr, width - 20f, y, paint)
        y += 30f

        // خط فاصل
        paint.strokeWidth = 1.5f
        canvas.drawLine(20f, y, width - 20f, y, paint)
        y += 25f

        // 3. التشخيص الطبي
        if (data.diagnosis.isNotBlank()) {
            paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            paint.textSize = 18f
            canvas.drawText("التشخيص: " + data.diagnosis, width - 20f, y, paint)
            y += 32f
        }

        // 4. رمز الوصفة الطبية Rx
        paint.textAlign = Paint.Align.LEFT
        paint.textSize = 28f
        paint.typeface = Typeface.create(Typeface.SERIF, Typeface.BOLD)
        canvas.drawText("Rx 💊", 25f, y, paint)
        y += 25f

        paint.strokeWidth = 1f
        canvas.drawLine(20f, y, width - 20f, y, paint)
        y += 25f

        // 5. جدول وبنود الأدوية
        paint.textAlign = Paint.Align.RIGHT
        data.items.forEachIndexed { index, item ->
            paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            paint.textSize = 20f
            canvas.drawText("${index + 1}. ${item.medicationName}", width - 20f, y, paint)
            y += 26f

            paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.NORMAL)
            paint.textSize = 16f
            val dosageDetail = "الجرعة: ${item.dosage}  |  ${item.frequency}"
            canvas.drawText(dosageDetail, width - 35f, y, paint)
            y += 24f

            val durationDetail = "المدة: ${item.duration}"
            canvas.drawText(durationDetail, width - 35f, y, paint)
            y += 24f

            if (!item.instructions.isNullOrBlank()) {
                canvas.drawText("تعليمات: ${item.instructions}", width - 35f, y, paint)
                y += 24f
            }

            paint.strokeWidth = 1f
            canvas.drawLine(30f, y, width - 30f, y, paint)
            y += 20f
        }

        // 6. ملاحظات إضافية
        if (!data.notes.isNullOrBlank()) {
            y += 10f
            paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            paint.textSize = 17f
            canvas.drawText("ملاحظات الطبيب: " + data.notes, width - 20f, y, paint)
            y += 35f
        }

        // 7. تذييل وختم
        y += 20f
        paint.textAlign = Paint.Align.CENTER
        paint.textSize = 16f
        paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.NORMAL)
        canvas.drawText("ختم وتوقيع الطبيب: ______________", width / 2f, y, paint)
        y += 35f

        paint.textSize = 14f
        canvas.drawText("منصة طبيبك للرعاية الصحية • Tabeebak", width / 2f, y, paint)
        y += 35f

        // اقتصاص البتماب للارتفاع الفعلي
        val finalHeight = y.toInt() + 20
        return if (finalHeight < bitmap.height) {
            Bitmap.createBitmap(bitmap, 0, 0, width, finalHeight)
        } else {
            bitmap
        }
    }

    /**
     * تحويل صورة Bitmap إلى صيغة ESC/POS Raster Bit Image (GS v 0)
     */
    private fun bitmapToEscPosRaster(bitmap: Bitmap): ByteArray {
        val width = bitmap.width
        val height = bitmap.height
        val widthBytes = (width + 7) / 8

        val buffer = java.io.ByteArrayOutputStream()

        // أمر GS v 0 m xL xH yL yH
        val xL = (widthBytes % 256).toByte()
        val xH = (widthBytes / 256).toByte()
        val yL = (height % 256).toByte()
        val yH = (height / 256).toByte()

        buffer.write(byteArrayOf(0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH))

        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, 0, 0, width, height)

        for (y in 0 until height) {
            for (xByte in 0 until widthBytes) {
                var byteVal = 0
                for (bit in 0 until 8) {
                    val x = xByte * 8 + bit
                    if (x < width) {
                        val pixel = pixels[y * width + x]
                        val r = (pixel shr 16) and 0xFF
                        val g = (pixel shr 8) and 0xFF
                        val b = pixel and 0xFF
                        val gray = (r * 299 + g * 587 + b * 114) / 1000
                        // عتبة التحويل لأبيض وأسود (Monochrome threshold)
                        if (gray < 160) {
                            byteVal = byteVal or (1 shl (7 - bit))
                        }
                    }
                }
                buffer.write(byteVal)
            }
        }

        return buffer.toByteArray()
    }
}
