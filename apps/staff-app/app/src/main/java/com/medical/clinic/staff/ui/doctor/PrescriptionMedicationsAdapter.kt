package com.medical.clinic.staff.ui.doctor

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.medical.clinic.staff.data.models.PrescriptionItemPayload
import com.medical.clinic.staff.databinding.ItemPrescriptionMedicineBinding

class PrescriptionMedicationsAdapter(
    private val onRemove: (Int) -> Unit
) : RecyclerView.Adapter<PrescriptionMedicationsAdapter.MedViewHolder>() {

    private val items = mutableListOf<PrescriptionItemPayload>()

    fun submitList(newList: List<PrescriptionItemPayload>) {
        items.clear()
        items.addAll(newList)
        notifyDataSetChanged()
    }

    fun addItem(item: PrescriptionItemPayload) {
        items.add(item)
        notifyItemInserted(items.size - 1)
    }

    fun removeItem(position: Int) {
        if (position in 0 until items.size) {
            items.removeAt(position)
            notifyItemRemoved(position)
            notifyItemRangeChanged(position, items.size - position)
        }
    }

    fun getItems(): List<PrescriptionItemPayload> = items.toList()

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): MedViewHolder {
        val binding = ItemPrescriptionMedicineBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return MedViewHolder(binding)
    }

    override fun onBindViewHolder(holder: MedViewHolder, position: Int) {
        holder.bind(items[position], position)
    }

    override fun getItemCount(): Int = items.size

    inner class MedViewHolder(private val binding: ItemPrescriptionMedicineBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(item: PrescriptionItemPayload, position: Int) {
            binding.tvMedicationIndex.text = "${position + 1}"
            binding.tvMedicationName.text = item.medicationName
            binding.tvMedicationDosage.text = "الجرعة: ${item.dosage}"
            binding.tvMedicationFrequency.text = "التكرار: ${item.frequency}"
            binding.tvMedicationDuration.text = "المدة: ${item.duration}"

            if (!item.instructions.isNullOrBlank()) {
                binding.tvMedicationInstructions.visibility = View.VISIBLE
                binding.tvMedicationInstructions.text = "تعليمات: ${item.instructions}"
            } else {
                binding.tvMedicationInstructions.visibility = View.GONE
            }

            binding.btnRemoveMedication.setOnClickListener {
                onRemove(bindingAdapterPosition)
            }
        }
    }
}
