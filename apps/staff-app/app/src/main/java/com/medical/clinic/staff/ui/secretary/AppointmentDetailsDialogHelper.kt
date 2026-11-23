package com.medical.clinic.staff.ui.secretary

import android.app.Dialog
import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.ColorDrawable
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.Window
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.ContextCompat
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import com.medical.clinic.staff.R
import com.medical.clinic.staff.data.models.StaffAppointmentItem

object AppointmentDetailsDialogHelper {

    fun showBookingsAndCapacityDialog(
        context: Context,
        appointments: List<StaffAppointmentItem>
    ) {
        val dialog = Dialog(context)
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE)
        dialog.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))

        val scrollView = android.widget.ScrollView(context).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            isFillViewport = true
        }

        val rootCard = MaterialCardView(context).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            radius = 24f * resources.displayMetrics.density
            cardElevation = 8f * resources.displayMetrics.density
            strokeWidth = (1.5f * resources.displayMetrics.density).toInt()
            setStrokeColor(Color.parseColor("#330D9488"))
            setCardBackgroundColor(Color.WHITE)
        }

        val container = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24, 24, 24, 24)
        }

        // --- Dialog Header ---
        val headerLayout = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER_VERTICAL
            setPadding(0, 0, 0, 16)
        }

        val tvIcon = TextView(context).apply {
            text = "📋"
            textSize = 24f
            setPadding(0, 0, 12, 0)
        }
        headerLayout.addView(tvIcon)

        val headerTextLayout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }

        val tvTitle = TextView(context).apply {
            text = "تفاصيل الحجوزات والمقاعد المتاحة"
            textSize = 17f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(ContextCompat.getColor(context, R.color.on_surface_dark))
        }
        headerTextLayout.addView(tvTitle)

        val tvSub = TextView(context).apply {
            text = "استعراض أسماء المرضى والمقاعد المتبقية لكل يوم"
            textSize = 12f
            setTextColor(ContextCompat.getColor(context, R.color.on_surface_dark_tertiary))
            setPadding(0, 4, 0, 0)
        }
        headerTextLayout.addView(tvSub)
        headerLayout.addView(headerTextLayout)
        container.addView(headerLayout)

        // Divider
        val div = View(context).apply {
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 2).apply {
                bottomMargin = 16
            }
            setBackgroundColor(Color.parseColor("#E2E8F0"))
        }
        container.addView(div)

        if (appointments.isEmpty()) {
            val tvEmpty = TextView(context).apply {
                text = "لا توجد حجوزات مسجلة حالياً بالعيادة."
                textSize = 14f
                setTextColor(ContextCompat.getColor(context, R.color.on_surface_dark_tertiary))
                gravity = android.view.Gravity.CENTER
                setPadding(0, 32, 0, 32)
            }
            container.addView(tvEmpty)
        } else {
            // Group appointments by Date -> Doctor
            val groupedByDate = appointments.groupBy { it.periodDate?.take(10) ?: "تاريخ غير محدد" }

            for ((date, dateAppointments) in groupedByDate) {
                // Date Section Header Card
                val dateCard = MaterialCardView(context).apply {
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply {
                        bottomMargin = 16
                    }
                    radius = 16f * resources.displayMetrics.density
                    cardElevation = 2f * resources.displayMetrics.density
                    strokeWidth = (1f * resources.displayMetrics.density).toInt()
                    setStrokeColor(Color.parseColor("#CBD5E1"))
                    setCardBackgroundColor(Color.parseColor("#F8FAFC"))
                }

                val dateLayout = LinearLayout(context).apply {
                    orientation = LinearLayout.VERTICAL
                    setPadding(16, 16, 16, 16)
                }

                // Date Title Bar
                val dateHeader = LinearLayout(context).apply {
                    orientation = LinearLayout.HORIZONTAL
                    gravity = android.view.Gravity.CENTER_VERTICAL
                }

                val tvDateTitle = TextView(context).apply {
                    layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                    text = "📅 تاريخ: $date"
                    textSize = 15f
                    typeface = Typeface.DEFAULT_BOLD
                    setTextColor(ContextCompat.getColor(context, R.color.brand_primary))
                }
                dateHeader.addView(tvDateTitle)

                val tvDateTotalBadge = TextView(context).apply {
                    text = "${dateAppointments.size} حجز"
                    textSize = 11f
                    typeface = Typeface.DEFAULT_BOLD
                    setTextColor(ContextCompat.getColor(context, R.color.brand_primary))
                    setBackgroundResource(R.drawable.bg_status_accepted)
                    setPadding(12, 4, 12, 4)
                }
                dateHeader.addView(tvDateTotalBadge)
                dateLayout.addView(dateHeader)

                // Sub-group by Doctor on this date
                val groupedByDoctor = dateAppointments.groupBy { it.doctorName ?: "الطبيب" }

                for ((doctorName, docAppts) in groupedByDoctor) {
                    val docSubCard = LinearLayout(context).apply {
                        orientation = LinearLayout.VERTICAL
                        setPadding(12, 12, 12, 12)
                        layoutParams = LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.MATCH_PARENT,
                            LinearLayout.LayoutParams.WRAP_CONTENT
                        ).apply {
                            topMargin = 10
                        }
                        setBackgroundResource(R.drawable.bg_card_outlined)
                    }

                    // Doctor Row + Capacity badge
                    val docHeader = LinearLayout(context).apply {
                        orientation = LinearLayout.HORIZONTAL
                        gravity = android.view.Gravity.CENTER_VERTICAL
                    }

                    val tvDoc = TextView(context).apply {
                        layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                        text = "👨‍⚕️ د. $doctorName"
                        textSize = 13.5f
                        typeface = Typeface.DEFAULT_BOLD
                        setTextColor(ContextCompat.getColor(context, R.color.on_surface_dark))
                    }
                    docHeader.addView(tvDoc)

                    // Capacity calculation:
                    // If periodMaxBookings is present on appointments
                    val maxCap: Int? = docAppts.firstOrNull { (it.periodMaxBookings ?: 0) > 0 }?.periodMaxBookings
                    val bookedCount: Int = docAppts.count { it.status != "cancelled" }
                    val remainingSeats: Int? = if (maxCap != null && maxCap > 0) (maxCap - bookedCount).coerceAtLeast(0) else null

                    val tvSeatsBadge = TextView(context).apply {
                        if (remainingSeats != null && remainingSeats is Int) {
                            val remVal: Int = remainingSeats
                            text = if (remVal > 0) "متبقي $remVal مقعد" else "مكتمل المقاعد 🔒"
                            val color = if (remVal > 0) Color.parseColor("#047857") else Color.parseColor("#B91C1C")
                            val bg = if (remVal > 0) Color.parseColor("#ECFDF5") else Color.parseColor("#FEF2F2")
                            setTextColor(color)
                            setBackgroundColor(bg)
                        } else {
                            text = "المحجوز: $bookedCount"
                            setTextColor(Color.parseColor("#1E3A8A"))
                            setBackgroundColor(Color.parseColor("#EFF6FF"))
                        }
                        textSize = 11f
                        typeface = Typeface.DEFAULT_BOLD
                        setPadding(10, 4, 10, 4)
                    }
                    docHeader.addView(tvSeatsBadge)
                    docSubCard.addView(docHeader)

                    // Patient list
                    val patientListLayout = LinearLayout(context).apply {
                        orientation = LinearLayout.VERTICAL
                        setPadding(8, 8, 8, 4)
                    }

                    for ((idx, appt) in docAppts.withIndex()) {
                        val patRow = LinearLayout(context).apply {
                            orientation = LinearLayout.HORIZONTAL
                            gravity = android.view.Gravity.CENTER_VERTICAL
                            setPadding(0, 4, 0, 4)
                        }

                        val queueTxt = if (appt.queueNumber != null && appt.queueNumber > 0) "#${appt.queueNumber}" else "${idx + 1}"
                        val tvQueue = TextView(context).apply {
                            text = queueTxt
                            textSize = 11f
                            typeface = Typeface.DEFAULT_BOLD
                            setTextColor(ContextCompat.getColor(context, R.color.brand_primary))
                            setPadding(0, 0, 8, 0)
                        }
                        patRow.addView(tvQueue)

                        val tvPName = TextView(context).apply {
                            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                            text = appt.patientName ?: "مريض (بدون اسم)"
                            textSize = 12.5f
                            setTextColor(ContextCompat.getColor(context, R.color.on_surface_dark))
                        }
                        patRow.addView(tvPName)

                        val statusLabel = when (appt.status) {
                            "confirmed" -> "مؤكد ✅"
                            "completed" -> "مكتمل 🟢"
                            "cancelled" -> "ملغي ❌"
                            "no_show" -> "لم يحضر 🚫"
                            else -> "انتظار ⏳"
                        }
                        val tvPStatus = TextView(context).apply {
                            text = statusLabel
                            textSize = 11f
                            setTextColor(ContextCompat.getColor(context, R.color.on_surface_dark_secondary))
                        }
                        patRow.addView(tvPStatus)

                        patientListLayout.addView(patRow)
                    }

                    docSubCard.addView(patientListLayout)
                    dateLayout.addView(docSubCard)
                }

                dateCard.addView(dateLayout)
                container.addView(dateCard)
            }
        }

        // Close Button
        val btnClose = MaterialButton(context).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                (44 * resources.displayMetrics.density).toInt()
            ).apply {
                topMargin = 12
            }
            text = "إغلاق النافذة"
            textSize = 13f
            setBackgroundColor(ContextCompat.getColor(context, R.color.brand_primary))
            setOnClickListener { dialog.dismiss() }
        }
        container.addView(btnClose)

        rootCard.addView(container)
        scrollView.addView(rootCard)
        dialog.setContentView(scrollView)

        // Make dialog responsive in width
        dialog.window?.setLayout(
            (context.resources.displayMetrics.widthPixels * 0.92).toInt(),
            ViewGroup.LayoutParams.WRAP_CONTENT
        )

        dialog.show()
    }
}
