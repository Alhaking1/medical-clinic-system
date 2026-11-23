package com.medical.clinic.staff.ui.doctor

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.FileProvider
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.medical.clinic.staff.R
import com.medical.clinic.staff.data.models.AddMedicationRequest
import com.medical.clinic.staff.data.models.CreatePrescriptionRequest
import com.medical.clinic.staff.data.models.MedicationBankItem
import com.medical.clinic.staff.data.models.PrescriptionItemPayload
import com.medical.clinic.staff.data.repository.DoctorRepository
import com.medical.clinic.staff.data.utils.Resource
import com.medical.clinic.staff.utils.ThermalPrinterHelper
import android.content.Context
import android.print.PrintAttributes
import android.print.PrintManager
import android.webkit.WebView
import android.webkit.WebViewClient
import com.medical.clinic.staff.databinding.ActivityDoctorPrescriptionBinding
import com.medical.clinic.staff.databinding.DialogAddMedicationBinding
import com.medical.clinic.staff.databinding.DialogMedicationBankBinding
import dagger.hilt.android.AndroidEntryPoint
import androidx.core.widget.doAfterTextChanged
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import javax.inject.Inject

@AndroidEntryPoint
class DoctorPrescriptionActivity : AppCompatActivity() {

    private lateinit var binding: ActivityDoctorPrescriptionBinding

    @Inject
    lateinit var doctorRepository: DoctorRepository

    private lateinit var medicationsAdapter: PrescriptionMedicationsAdapter

    private var appointmentId: Int = -1
    private var patientId: Int? = null
    private var patientName: String = ""
    private var bookingCode: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityDoctorPrescriptionBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Read extras
        appointmentId = intent.getIntExtra(EXTRA_APPOINTMENT_ID, -1)
        val pId = intent.getIntExtra(EXTRA_PATIENT_ID, -1)
        if (pId > 0) patientId = pId
        patientName = intent.getStringExtra(EXTRA_PATIENT_NAME) ?: "المريض"
        bookingCode = intent.getStringExtra(EXTRA_BOOKING_CODE) ?: ""

        if (appointmentId <= 0) {
            Toast.makeText(this, "بيانات الحجز غير صالحة", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        setupToolbar()
        setupPatientInfo()
        setupRecyclerView()
        setupListeners()
    }

    private fun setupToolbar() {
        binding.toolbarPrescription.setNavigationOnClickListener {
            finish()
        }
    }

    private fun setupPatientInfo() {
        binding.tvPatientName.text = "المريض: $patientName"
        binding.tvBookingCode.text = if (bookingCode.isNotBlank()) "كود الحجز: $bookingCode" else "رقم الحجز: #$appointmentId"
    }

    private fun setupRecyclerView() {
        medicationsAdapter = PrescriptionMedicationsAdapter { position ->
            medicationsAdapter.removeItem(position)
            updateEmptyState()
        }
        binding.rvMedications.layoutManager = LinearLayoutManager(this)
        binding.rvMedications.adapter = medicationsAdapter
        updateEmptyState()
    }

    private fun updateEmptyState() {
        if (medicationsAdapter.itemCount == 0) {
            binding.tvEmptyMedications.visibility = View.VISIBLE
            binding.rvMedications.visibility = View.GONE
        } else {
            binding.tvEmptyMedications.visibility = View.GONE
            binding.rvMedications.visibility = View.VISIBLE
        }
    }

    private fun setupListeners() {
        binding.btnAddMedication.setOnClickListener {
            showAddMedicationDialog()
        }

        binding.btnMedicationBank.setOnClickListener {
            showMedicationBankDialog()
        }

        binding.btnPrintThermal.setOnClickListener {
            val printData = getPrescriptionPrintData() ?: return@setOnClickListener
            ThermalPrinterHelper.printPrescription(this, printData)
        }

        binding.btnPrintSystem.setOnClickListener {
            val printData = getPrescriptionPrintData() ?: return@setOnClickListener
            printViaSystemPrint(printData)
        }

        binding.btnSaveAndGeneratePdf.setOnClickListener {
            savePrescription()
        }
    }

    private fun showMedicationBankDialog() {
        val bankBinding = DialogMedicationBankBinding.inflate(LayoutInflater.from(this))
        val dialog = MaterialAlertDialogBuilder(this)
            .setView(bankBinding.root)
            .create()

        val bankAdapter = MedicationBankAdapter { pickedMed ->
            // إضافة الدواء المختار من البنك مباشرة إلى الروشتة
            val payload = PrescriptionItemPayload(
                medicationName = pickedMed.name,
                dosage = if (!pickedMed.defaultDosage.isNullOrBlank()) pickedMed.defaultDosage else "جرعة اعتيادية",
                frequency = "مرتين يومياً",
                duration = "5 أيام",
                instructions = if (!pickedMed.activeIngredient.isNullOrBlank()) "المادة الفعالة: ${pickedMed.activeIngredient}" else null
            )
            medicationsAdapter.addItem(payload)
            updateEmptyState()
            Toast.makeText(this, "تمت إضافة ${pickedMed.name} إلى الروشتة ✅", Toast.LENGTH_SHORT).show()
            dialog.dismiss()
        }

        bankBinding.rvMedBank.layoutManager = LinearLayoutManager(this)
        bankBinding.rvMedBank.adapter = bankAdapter

        fun loadBankMedications(query: String? = null) {
            bankBinding.pbLoadingBank.visibility = View.VISIBLE
            bankBinding.tvEmptyBank.visibility = View.GONE
            lifecycleScope.launch {
                when (val res = doctorRepository.getMedications(query)) {
                    is Resource.Success -> {
                        bankBinding.pbLoadingBank.visibility = View.GONE
                        val meds = res.data ?: emptyList()
                        bankAdapter.submitList(meds)
                        if (meds.isEmpty()) {
                            bankBinding.tvEmptyBank.visibility = View.VISIBLE
                        } else {
                            bankBinding.tvEmptyBank.visibility = View.GONE
                        }
                    }
                    is Resource.Error -> {
                        bankBinding.pbLoadingBank.visibility = View.GONE
                        bankBinding.tvEmptyBank.visibility = View.VISIBLE
                        bankBinding.tvEmptyBank.text = "تعذر تحميل بنك الأدوية: ${res.message}"
                    }
                    else -> bankBinding.pbLoadingBank.visibility = View.GONE
                }
            }
        }

        // البحث التفاعلي الفوري
        bankBinding.etSearchMedBank.doAfterTextChanged { text ->
            loadBankMedications(text?.toString()?.trim())
        }

        bankBinding.btnCloseBank.setOnClickListener {
            dialog.dismiss()
        }

        loadBankMedications()
        dialog.show()
    }

    private fun showAddMedicationDialog() {
        val dialogBinding = DialogAddMedicationBinding.inflate(LayoutInflater.from(this))
        val dialog = MaterialAlertDialogBuilder(this)
            .setView(dialogBinding.root)
            .create()

        dialogBinding.btnCancelDialog.setOnClickListener {
            dialog.dismiss()
        }

        dialogBinding.btnAddMedDialog.setOnClickListener {
            val name = dialogBinding.etMedName.text?.toString()?.trim() ?: ""
            val dosage = dialogBinding.etMedDosage.text?.toString()?.trim() ?: "جرعة اعتيادية"
            val frequency = dialogBinding.etMedFrequency.text?.toString()?.trim() ?: "مرتين يومياً"
            val duration = dialogBinding.etMedDuration.text?.toString()?.trim() ?: "5 أيام"
            val instructions = dialogBinding.etMedInstructions.text?.toString()?.trim()
            val saveToBank = dialogBinding.cbSaveToBank.isChecked

            if (name.isEmpty()) {
                dialogBinding.tilMedName.error = "اسم الدواء مطلوب"
                return@setOnClickListener
            }
            dialogBinding.tilMedName.error = null

            val item = PrescriptionItemPayload(
                medicationName = name,
                dosage = if (dosage.isNotEmpty()) dosage else "جرعة اعتيادية",
                frequency = if (frequency.isNotEmpty()) frequency else "مرتين يومياً",
                duration = if (duration.isNotEmpty()) duration else "5 أيام",
                instructions = if (!instructions.isNullOrBlank()) instructions else null
            )

            medicationsAdapter.addItem(item)
            updateEmptyState()

            // حفظ الدواء في بنك الأدوية الخاص بالطبيب إن تم تحديد الخيار
            if (saveToBank) {
                lifecycleScope.launch {
                    val addReq = AddMedicationRequest(
                        name = name,
                        activeIngredient = if (!instructions.isNullOrBlank()) instructions else null,
                        defaultDosage = dosage
                    )
                    doctorRepository.addMedicationToBank(addReq)
                }
            }

            dialog.dismiss()
        }

        dialog.show()
    }

    private fun savePrescription() {
        val diagnosis = binding.etDiagnosis.text?.toString()?.trim() ?: ""
        val notes = binding.etNotes.text?.toString()?.trim()
        val items = medicationsAdapter.getItems()

        if (diagnosis.isEmpty()) {
            binding.tilDiagnosis.error = "التشخيص الطبي مطلوب لإصدار الروشتة"
            binding.etDiagnosis.requestFocus()
            return
        }
        binding.tilDiagnosis.error = null

        if (items.isEmpty()) {
            Toast.makeText(this, "يرجى إضافة دواء واحد على الأقل للروشتة", Toast.LENGTH_SHORT).show()
            return
        }

        setLoading(true)

        lifecycleScope.launch {
            val req = CreatePrescriptionRequest(
                appointmentId = appointmentId,
                patientId = patientId,
                diagnosis = diagnosis,
                notes = if (!notes.isNullOrBlank()) notes else null,
                items = items
            )

            when (val result = doctorRepository.createPrescription(req)) {
                is Resource.Success -> {
                    val prescription = result.data
                    val prescriptionId = prescription?.id ?: -1
                    Toast.makeText(this@DoctorPrescriptionActivity, "تم حفظ الروشتة وإشعار المريض بنجاح ✅", Toast.LENGTH_SHORT).show()

                    if (prescriptionId > 0) {
                        downloadAndOpenPdf(prescriptionId)
                    } else {
                        setLoading(false)
                        finish()
                    }
                }
                is Resource.Error -> {
                    setLoading(false)
                    Toast.makeText(this@DoctorPrescriptionActivity, result.message, Toast.LENGTH_LONG).show()
                }
                else -> setLoading(false)
            }
        }
    }

    private fun downloadAndOpenPdf(prescriptionId: Int) {
        lifecycleScope.launch {
            when (val pdfRes = doctorRepository.downloadPrescriptionPdf(prescriptionId)) {
                is Resource.Success -> {
                    setLoading(false)
                    val body = pdfRes.data
                    if (body != null) {
                        saveAndOpenPdfFile(prescriptionId, body)
                    } else {
                        Toast.makeText(this@DoctorPrescriptionActivity, "تم حفظ الروشتة بنجاح", Toast.LENGTH_SHORT).show()
                        finish()
                    }
                }
                is Resource.Error -> {
                    setLoading(false)
                    Toast.makeText(this@DoctorPrescriptionActivity, "تم حفظ الروشتة (تعذر فتح PDF: ${pdfRes.message})", Toast.LENGTH_LONG).show()
                    finish()
                }
                else -> setLoading(false)
            }
        }
    }

    private suspend fun saveAndOpenPdfFile(prescriptionId: Int, body: okhttp3.ResponseBody) {
        withContext(Dispatchers.IO) {
            try {
                val pdfDir = File(cacheDir, "prescriptions")
                if (!pdfDir.exists()) pdfDir.mkdirs()
                val pdfFile = File(pdfDir, "prescription_${prescriptionId}_${System.currentTimeMillis()}.pdf")

                body.byteStream().use { input ->
                    FileOutputStream(pdfFile).use { output ->
                        input.copyTo(output)
                    }
                }

                withContext(Dispatchers.Main) {
                    openPdfViewer(pdfFile)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(this@DoctorPrescriptionActivity, "تم حفظ الروشتة. تعذر حفظ الملف محلياً", Toast.LENGTH_SHORT).show()
                    finish()
                }
            }
        }
    }

    private fun openPdfViewer(file: File) {
        try {
            val uri: Uri = FileProvider.getUriForFile(
                this,
                "${packageName}.provider",
                file
            )

            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/pdf")
                flags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }

            startActivity(Intent.createChooser(intent, "عرض الروشتة الطبية PDF"))
            finish()
        } catch (e: Exception) {
            Toast.makeText(this, "تم حفظ الروشتة بنجاح في سجل المريض", Toast.LENGTH_LONG).show()
            finish()
        }
    }

    private fun setLoading(loading: Boolean) {
        binding.pbLoading.visibility = if (loading) View.VISIBLE else View.GONE
        binding.btnSaveAndGeneratePdf.isEnabled = !loading
        binding.btnAddMedication.isEnabled = !loading
    }


    private fun getPrescriptionPrintData(): ThermalPrinterHelper.PrescriptionPrintData? {
        val diagnosis = binding.etDiagnosis.text?.toString()?.trim() ?: ""
        val notes = binding.etNotes.text?.toString()?.trim()
        val items = medicationsAdapter.getItems()

        if (diagnosis.isEmpty()) {
            binding.tilDiagnosis.error = "التشخيص الطبي مطلوب للطباعة"
            binding.etDiagnosis.requestFocus()
            return null
        }
        if (items.isEmpty()) {
            Toast.makeText(this, "يرجى إضافة دواء واحد على الأقل للروشتة قبل الطباعة", Toast.LENGTH_SHORT).show()
            return null
        }

        return ThermalPrinterHelper.PrescriptionPrintData(
            clinicName = "عيادة الرعاية الطبية التخصصية",
            doctorName = "الطبيب المعالج",
            doctorSpecialty = "الطب الباطني العام",
            patientName = patientName,
            bookingCode = bookingCode,
            appointmentId = appointmentId,
            diagnosis = diagnosis,
            notes = notes,
            items = items
        )
    }

    private fun printViaSystemPrint(data: ThermalPrinterHelper.PrescriptionPrintData) {
        val printManager = getSystemService(Context.PRINT_SERVICE) as? PrintManager ?: run {
            Toast.makeText(this, "خدمة الطباعة بالنظام غير متاحة", Toast.LENGTH_SHORT).show()
            return
        }

        val jobName = "روشتة_${data.bookingCode.ifEmpty { data.appointmentId.toString() }}"
        val webView = WebView(this)

        val itemsHtml = StringBuilder()
        data.items.forEachIndexed { idx, itm ->
            itemsHtml.append("""
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${idx + 1}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">${itm.medicationName}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${itm.dosage}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${itm.frequency}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${itm.duration}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${itm.instructions ?: "—"}</td>
                </tr>
            """.trimIndent())
        }

        val html = """
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: sans-serif; padding: 24px; color: #222; }
                    .header { text-align: center; border-bottom: 2px solid #00796B; padding-bottom: 12px; margin-bottom: 16px; }
                    .header h1 { margin: 0; color: #00796B; font-size: 22px; }
                    .info-box { background: #f4fbf9; border: 1px solid #b2dfdb; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
                    .rx-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
                    .rx-table th { background: #E0F2F1; color: #004D40; padding: 8px; text-align: right; }
                    .footer { margin-top: 40px; text-align: left; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🏥 ${data.clinicName}</h1>
                    <p style="margin: 4px 0; font-size: 14px;">د. ${data.doctorName} • ${data.doctorSpecialty}</p>
                </div>
                <div class="info-box">
                    <table style="width: 100%;">
                        <tr>
                            <td><strong>المريض:</strong> ${data.patientName}</td>
                            <td><strong>كود الحجز:</strong> #${data.bookingCode.ifEmpty { data.appointmentId.toString() }}</td>
                        </tr>
                        <tr>
                            <td><strong>التاريخ:</strong> ${data.dateStr}</td>
                            <td><strong>التشخيص:</strong> ${data.diagnosis}</td>
                        </tr>
                    </table>
                </div>

                <h3 style="color: #00796B; margin-bottom: 8px;">💊 الوصفة الطبية (Rx):</h3>
                <table class="rx-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>اسم الدواء</th>
                            <th>الجرعة</th>
                            <th>التكرار</th>
                            <th>المدة</th>
                            <th>إرشادات الاستخدام</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                ${if (!data.notes.isNullOrBlank()) "<div style='margin-top: 16px; padding: 10px; background: #FFFDE7; border-radius: 6px;'><strong>ملاحظات الطبيب:</strong> " + data.notes + "</div>" else ""}

                <div class="footer" style="float: left; width: 220px; text-align: center;">
                    <div style="border-top: 1px solid #78909C; padding-top: 8px; margin-top: 40px;">
                        <strong>ختم وتوقيع الطبيب</strong>
                    </div>
                </div>
            </body>
            </html>
        """.trimIndent()

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                val printAdapter = webView.createPrintDocumentAdapter(jobName)
                printManager.print(jobName, printAdapter, PrintAttributes.Builder().build())
            }
        }
        webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null)
    }

    companion object {
        const val EXTRA_APPOINTMENT_ID = "extra_appointment_id"
        const val EXTRA_PATIENT_ID = "extra_patient_id"
        const val EXTRA_PATIENT_NAME = "extra_patient_name"
        const val EXTRA_BOOKING_CODE = "extra_booking_code"
    }
}
