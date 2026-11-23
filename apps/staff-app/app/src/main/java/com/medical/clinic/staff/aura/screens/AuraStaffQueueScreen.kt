package com.medical.clinic.staff.aura.screens

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.medical.clinic.staff.aura.components.*
import com.medical.clinic.staff.aura.theme.*

data class AuraQueuePatient(
    val id: Int,
    val queueNumber: Int,
    val name: String,
    val bookingCode: String,
    val phone: String,
    val timeSlot: String,
    val isGolden: Boolean = false,
    val status: String = "waiting" // "waiting", "arrived", "no_show"
)

/**
 * 👑 THE STAFF QUEUE SCREEN (Clinical Precision & Speed)
 * - The Queue: A clean list. Each patient card is White with a "Status Ribbon" on the right edge.
 * - Fast Action Buttons: "حضر" and "تغيب" are pill-shaped (outlined).
 * - "Write Prescription (روشتة)" button is prominent and filled with Serene Emerald.
 */
@Composable
fun AuraStaffQueueScreen(
    onPatientClick: (AuraQueuePatient) -> Unit = {},
    onOpenPrescription: (AuraQueuePatient) -> Unit = {}
) {
    var selectedFilter by remember { mutableStateOf("الكل") }

    val initialPatients = remember {
        listOf(
            AuraQueuePatient(1, 1, "أحمد محمد الكبسي", "BK-9021", "777102938", "09:00 ص", isGolden = true, status = "waiting"),
            AuraQueuePatient(2, 2, "سارة عبدالحميد العنسي", "BK-9022", "771239044", "09:20 ص", isGolden = false, status = "arrived"),
            AuraQueuePatient(3, 3, "عمر يحيى المؤيد", "BK-9023", "770984321", "09:40 ص", isGolden = false, status = "waiting"),
            AuraQueuePatient(4, 4, "فاطمة أحمد باحميد", "BK-9024", "775612349", "10:00 ص", isGolden = true, status = "waiting"),
            AuraQueuePatient(5, 5, "وليد خالد الحكيمي", "BK-9025", "733918274", "10:20 ص", isGolden = false, status = "no_show")
        )
    }

    var patientsList by remember { mutableStateOf(initialPatients) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SilkWhite)
            .statusBarsPadding()
            .padding(horizontal = 20.dp)
    ) {
        // Top Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 16.dp, bottom = 18.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "طابور المرضى 🩺",
                    fontFamily = Cairo,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = RichCharcoal
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    text = "إدارة التدفق السريري وحالات الحضور",
                    fontFamily = Cairo,
                    fontSize = 13.5.sp,
                    color = MutedCharcoal
                )
            }

            // Real-time counter badge
            Box(
                modifier = Modifier
                    .clip(CircleShape)
                    .background(SereneEmeraldLight)
                    .border(1.dp, Color(0xFFA7F3D0), CircleShape)
                    .padding(horizontal = 14.dp, vertical = 7.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(SereneEmerald)
                    )
                    Spacer(modifier = Modifier.width(7.dp))
                    Text(
                        text = "${patientsList.count { it.status == "waiting" }} بالانتظار",
                        fontFamily = Cairo,
                        fontSize = 12.5.sp,
                        fontWeight = FontWeight.Bold,
                        color = SereneEmerald
                    )
                }
            }
        }

        // Clean Filter Chips
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 18.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            listOf("الكل", "بالانتظار", "حضر", "تغيب").forEach { filter ->
                val isSelected = selectedFilter == filter
                val animScale by animateFloatAsState(
                    targetValue = if (isSelected) 1.03f else 1.0f,
                    animationSpec = tween(300),
                    label = "filter_$filter"
                )
                val bg = if (isSelected) SereneEmerald else Color.White
                val textColor = if (isSelected) Color.White else MutedCharcoal
                val border = if (isSelected) SereneEmerald else CanvasBorder

                Box(
                    modifier = Modifier
                        .weight(1f)
                        .graphicsLayer {
                            scaleX = animScale
                            scaleY = animScale
                        }
                        .shadow(if (isSelected) 3.dp else 1.dp, CircleShape, spotColor = Color(0x10000000))
                        .clip(CircleShape)
                        .background(bg)
                        .border(1.dp, border, CircleShape)
                        .clickable { selectedFilter = filter }
                        .padding(vertical = 9.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = filter,
                        fontFamily = Cairo,
                        fontSize = 12.5.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                        color = textColor
                    )
                }
            }
        }

        // Patients List
        val filtered = when (selectedFilter) {
            "بالانتظار" -> patientsList.filter { it.status == "waiting" }
            "حضر" -> patientsList.filter { it.status == "arrived" }
            "تغيب" -> patientsList.filter { it.status == "no_show" }
            else -> patientsList
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            contentPadding = PaddingValues(bottom = 110.dp)
        ) {
            itemsIndexed(filtered, key = { _, p -> p.id }) { _, patient ->
                StaffPatientCardWithRibbon(
                    patient = patient,
                    onArrived = {
                        patientsList = patientsList.map { if (it.id == patient.id) it.copy(status = "arrived") else it }
                    },
                    onNoShow = {
                        patientsList = patientsList.map { if (it.id == patient.id) it.copy(status = "no_show") else it }
                    },
                    onOpenPrescription = {
                        onOpenPrescription(patient)
                    }
                )
            }
        }
    }
}

/**
 * Patient card with right-edge Status Ribbon and Pill-shaped buttons
 */
@Composable
fun StaffPatientCardWithRibbon(
    patient: AuraQueuePatient,
    onArrived: () -> Unit,
    onNoShow: () -> Unit,
    onOpenPrescription: () -> Unit
) {
    val (statusText, ribbonColor, statusBg) = when (patient.status) {
        "arrived" -> Triple("حضر", SereneEmerald, SereneEmeraldLight)
        "no_show" -> Triple("تغيب", Color(0xFFDC2626), Color(0xFFFEE2E2))
        else -> Triple("بالانتظار", Color(0xFFD97706), Color(0xFFFEF3C7))
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(2.dp, RoundedCornerShape(16.dp), spotColor = Color(0x10000000), ambientColor = Color(0x06000000))
            .clip(RoundedCornerShape(16.dp))
            .background(Color.White)
            .border(1.dp, CanvasBorder, RoundedCornerShape(16.dp))
    ) {
        // Status Ribbon on the right edge
        Box(
            modifier = Modifier
                .align(Alignment.CenterEnd)
                .fillMaxHeight()
                .width(6.dp)
                .background(ribbonColor)
        )

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(end = 10.dp) // space for the ribbon
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    // Queue Number Circle
                    Box(
                        modifier = Modifier
                            .size(42.dp)
                            .clip(CircleShape)
                            .background(if (patient.isGolden) Color(0xFFFEF3C7) else SereneEmeraldLight)
                            .border(1.dp, if (patient.isGolden) Color(0xFFFDE68A) else Color(0xFFA7F3D0), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "#${patient.queueNumber}",
                            fontFamily = Cairo,
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                            color = if (patient.isGolden) Color(0xFFD97706) else SereneEmerald
                        )
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = patient.name,
                                fontFamily = Cairo,
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.5.sp,
                                color = RichCharcoal
                            )
                            if (patient.isGolden) {
                                Spacer(modifier = Modifier.width(6.dp))
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(Color(0xFFFEF3C7))
                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                ) {
                                    Text(
                                        text = "VIP",
                                        fontFamily = Cairo,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFFD97706)
                                    )
                                }
                            }
                        }
                        Spacer(Modifier.height(2.dp))
                        Text(
                            text = "كود الحجز: ${patient.bookingCode} | موعد: ${patient.timeSlot}",
                            fontFamily = Cairo,
                            fontSize = 12.sp,
                            color = MutedCharcoal
                        )
                    }
                }

                // Status Badge
                Box(
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(statusBg)
                        .padding(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(7.dp)
                                .clip(CircleShape)
                                .background(ribbonColor)
                        )
                        Spacer(modifier = Modifier.width(5.dp))
                        Text(
                            text = statusText,
                            fontFamily = Cairo,
                            fontSize = 11.5.sp,
                            fontWeight = FontWeight.Bold,
                            color = ribbonColor
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Fast Action Buttons: pill-shaped outlined and prominent Serene Emerald prescription button
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Prominent Serene Emerald button
                Button(
                    onClick = onOpenPrescription,
                    colors = ButtonDefaults.buttonColors(containerColor = SereneEmerald),
                    shape = RoundedCornerShape(20.dp),
                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp),
                    modifier = Modifier
                        .weight(1.3f)
                        .height(40.dp)
                ) {
                    Text(
                        "كتابة روشتة 📄",
                        fontFamily = Cairo,
                        fontSize = 12.5.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }

                // Pill-shaped outlined button: حضر
                OutlinedButton(
                    onClick = onArrived,
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = SereneEmerald),
                    border = BorderStroke(1.2.dp, SereneEmerald),
                    shape = CircleShape,
                    modifier = Modifier
                        .weight(0.85f)
                        .height(40.dp)
                ) {
                    Text(
                        "حضر",
                        fontFamily = Cairo,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = SereneEmerald
                    )
                }

                // Pill-shaped outlined button: تغيب
                OutlinedButton(
                    onClick = onNoShow,
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFDC2626)),
                    border = BorderStroke(1.2.dp, Color(0xFFDC2626)),
                    shape = CircleShape,
                    modifier = Modifier
                        .weight(0.85f)
                        .height(40.dp)
                ) {
                    Text(
                        "تغيب",
                        fontFamily = Cairo,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFFDC2626)
                    )
                }
            }
        }
    }
}
