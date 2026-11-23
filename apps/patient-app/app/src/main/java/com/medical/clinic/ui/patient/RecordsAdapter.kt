package com.medical.clinic.ui.patient

import android.app.Dialog
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.Window
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton
import com.medical.clinic.R
import com.medical.clinic.data.models.MedicalRecord

class RecordsAdapter(
    private var items: List<MedicalRecord> = emptyList(),
    private val onRecordClick: (MedicalRecord) -> Unit = {}
) : RecyclerView.Adapter<RecordsAdapter.ViewHolder>() {

    fun updateList(newList: List<MedicalRecord>) {
        items = newList
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_medical_record_card, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = items[position]
        holder.bind(item)
    }

    override fun getItemCount() = items.size

    inner class ViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvType: TextView = itemView.findViewById(R.id.tvRecordType)
        private val tvDate: TextView = itemView.findViewById(R.id.tvRecordDate)
        private val tvDoctor: TextView = itemView.findViewById(R.id.tvRecordDoctor)
        private val tvDiagnosis: TextView = itemView.findViewById(R.id.tvRecordDiagnosis)
        private val tvPrescription: TextView = itemView.findViewById(R.id.tvRecordPrescription)
        private val layoutCircle: View? = itemView.findViewById(R.id.layoutRecordIconCircle)
        private val tvIcon: TextView? = itemView.findViewById(R.id.tvRecordIcon)
        private val tvStatusBadge: TextView? = itemView.findViewById(R.id.tvRecordStatusBadge)
        private val btnDetails: View = itemView.findViewById(R.id.btnViewRecordDetails)

        fun bind(item: MedicalRecord) {
            val hasPrescription = !item.prescription.isNullOrBlank()
            val hasLabs = !item.labTests.isNullOrBlank()

            if (hasPrescription && hasLabs) {
                tvType.text = "روشتة وفحوصات"
                layoutCircle?.setBackgroundResource(R.drawable.bg_circle_record_rx)
                tvIcon?.text = "💊"
            } else if (hasPrescription) {
                tvType.text = "روشتة"
                layoutCircle?.setBackgroundResource(R.drawable.bg_circle_record_rx)
                tvIcon?.text = "💊"
            } else if (hasLabs) {
                tvType.text = "فحص"
                layoutCircle?.setBackgroundResource(R.drawable.bg_circle_record_lab)
                tvIcon?.text = "🧪"
            } else {
                tvType.text = "تقرير"
                layoutCircle?.setBackgroundResource(R.drawable.bg_circle_record_report)
                tvIcon?.text = "📄"
            }

            tvStatusBadge?.text = "مفعل"
            tvStatusBadge?.setTextColor(Color.parseColor("#0D9488"))
            tvStatusBadge?.setBackgroundResource(R.drawable.bg_pill_status_confirmed)

            tvDate.text = item.periodDate ?: item.createdAt?.take(10) ?: "2026/10/14"
            val doc = item.doctorName ?: "طبيب استشاري"
            val spec = item.doctorSpecialty?.let { " ($it)" } ?: ""
            tvDoctor.text = "$doc$spec"

            tvDiagnosis.text = item.diagnosis ?: (if (hasPrescription) "روشتة أدوية طبية" else "تحليل وفحص طبي")
            tvPrescription.text = if (!item.prescription.isNullOrBlank()) {
                "💊 " + item.prescription
            } else {
                "🧪 " + (item.labTests ?: "كشف ومعاينة سريرية")
            }

            val clickListener = View.OnClickListener {
                onRecordClick(item)
                showDetailsDialog(item)
            }

            itemView.setOnClickListener(clickListener)
            btnDetails.setOnClickListener(clickListener)
        }

        private fun showDetailsDialog(item: MedicalRecord) {
            val context = itemView.context
            val dialog = Dialog(context)
            dialog.requestWindowFeature(Window.FEATURE_NO_TITLE)
            dialog.setContentView(R.layout.dialog_record_details)
            dialog.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
            dialog.window?.setLayout(
                (context.resources.displayMetrics.widthPixels * 0.94).toInt(),
                ViewGroup.LayoutParams.WRAP_CONTENT
            )

            val tvCode: TextView = dialog.findViewById(R.id.tvModalRecordCode)
            val tvDoctor: TextView = dialog.findViewById(R.id.tvModalRecordDoctor)
            val tvDate: TextView = dialog.findViewById(R.id.tvModalRecordDate)
            val tvDiagnosis: TextView = dialog.findViewById(R.id.tvModalDiagnosis)
            val tvPrescription: TextView = dialog.findViewById(R.id.tvModalPrescription)
            val tvLabTests: TextView = dialog.findViewById(R.id.tvModalLabTests)
            val tvNotes: TextView = dialog.findViewById(R.id.tvModalNotes)
            val btnClose: MaterialButton = dialog.findViewById(R.id.btnModalClose)

            tvCode.text = "كود الحجز: #${item.bookingCode ?: item.id}"
            tvDoctor.text = "الطبيب المعالج: ${item.doctorName ?: "غير محدد"}"
            tvDate.text = "تاريخ الكشف: ${item.periodDate ?: item.createdAt ?: "حديثاً"}"
            tvDiagnosis.text = item.diagnosis ?: "تم الفحص السريري العام بنجاح"
            tvPrescription.text = item.prescription ?: "لا توجد أدوية موصوفة"
            tvLabTests.text = item.labTests ?: "لا توجد فحوصات مخبرية مطلوبة"
            tvNotes.text = item.notes ?: "يرجى الالتزام بالراحة التامة ومراجعة الطبيب عند الحاجة"

            btnClose.setOnClickListener { dialog.dismiss() }
            dialog.show()
        }
    }
}
