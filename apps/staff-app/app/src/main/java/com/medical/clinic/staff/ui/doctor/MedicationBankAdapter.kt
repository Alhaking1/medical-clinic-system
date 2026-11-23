package com.medical.clinic.staff.ui.doctor

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.medical.clinic.staff.data.models.MedicationBankItem
import com.medical.clinic.staff.databinding.ItemMedicationBankBinding

class MedicationBankAdapter(
    private val onPickClicked: (MedicationBankItem) -> Unit
) : RecyclerView.Adapter<MedicationBankAdapter.ViewHolder>() {

    private val items = mutableListOf<MedicationBankItem>()

    fun submitList(newItems: List<MedicationBankItem>) {
        items.clear()
        items.addAll(newItems)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemMedicationBankBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(items[position])
    }

    override fun getItemCount(): Int = items.size

    inner class ViewHolder(private val binding: ItemMedicationBankBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(item: MedicationBankItem) {
            binding.tvBankMedName.text = item.name

            val details = StringBuilder()
            if (!item.activeIngredient.isNullOrBlank()) {
                details.append("المادة: ").append(item.activeIngredient).append(" | ")
            }
            if (!item.defaultDosage.isNullOrBlank()) {
                details.append("الجرعة: ").append(item.defaultDosage)
            } else {
                details.append("جرعة اعتيادية")
            }
            binding.tvBankMedDetails.text = details.toString()

            binding.btnPickBankMed.setOnClickListener {
                onPickClicked(item)
            }

            binding.root.setOnClickListener {
                onPickClicked(item)
            }
        }
    }
}
