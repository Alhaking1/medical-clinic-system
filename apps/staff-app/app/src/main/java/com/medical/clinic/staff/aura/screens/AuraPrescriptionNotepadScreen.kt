package com.medical.clinic.staff.aura.screens

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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.medical.clinic.staff.aura.components.*
import com.medical.clinic.staff.aura.theme.*

data class AuraPrescriptionMedItem(
    val name: String,
    val dosage: String,
    val frequency: String,
    val duration: String,
    val instructions: String? = null
)

/**
 * 👑 THE PRESCRIPTION CANVAS (Distraction-Free Clinical Canvas)
 * - Huge text field for Diagnosis.
 * - Dynamic list for prescribed medications.
 * - Sliding bottom sheet with real-time search bar to filter and pick from medication bank.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AuraPrescriptionNotepadScreen(
    patientName: String = "أحمد محمد الكبسي",
    bookingCode: String = "BK-9021",
    onBack: () -> Unit = {},
    onSaveAndPrint: (List<AuraPrescriptionMedItem>, String) -> Unit = { _, _ -> }
) {
    var diagnosisText by remember { mutableStateOf("") }
    var notesText by remember { mutableStateOf("") }
    var showMedBankSheet by remember { mutableStateOf(false) }
    var medBankSearchQuery by remember { mutableStateOf("") }

    val medicationsList = remember {
        mutableStateListOf(
            AuraPrescriptionMedItem("Amoxicillin 500mg", "حبة واحدة", "3 مرات يومياً", "7 أيام", "بعد الأكل"),
            AuraPrescriptionMedItem("Panadol Extra", "حبتين", "عند اللزوم", "5 أيام", "لتسكين الألم")
        )
    }

    val medBank = remember {
        listOf(
            AuraPrescriptionMedItem("Augmentin 1g", "حبة واحدة", "مرتين يومياً", "7 أيام", "بعد الأكل مباشرة"),
            AuraPrescriptionMedItem("Brufen 400mg", "حبة واحدة", "3 مرات يومياً", "5 أيام", "بعد الأكل"),
            AuraPrescriptionMedItem("Cataflam 50mg", "حبة واحدة", "مرتين يومياً", "3 أيام", "مسكن وخافض للحرارة"),
            AuraPrescriptionMedItem("Omeprazole 20mg", "كبسولة واحدة", "مرة يومياً", "14 يوماً", "قبل الإفطار بنصف ساعة"),
            AuraPrescriptionMedItem("Zithromax 500mg", "حبة واحدة", "مرة يومياً", "3 أيام", "قبل الأكل بساعة"),
            AuraPrescriptionMedItem("Ventolin Inhaler", "بختان", "عند اللزوم", "شهر", "موسع للشعب الهوائية"),
            AuraPrescriptionMedItem("Paracetamol 500mg", "قرصان", "عند اللزوم", "3 أيام", "مسكن ألم وخافض حرارة"),
            AuraPrescriptionMedItem("Ceftriaxone 1g", "حقنة عضلية", "مرة يومياً", "5 أيام", "مضاد حيوي واسع المجال")
        )
    }

    Scaffold(
        containerColor = SilkWhite
    ) { paddingVals ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingVals)
                .statusBarsPadding()
                .padding(horizontal = 20.dp)
        ) {
            // Clean Top Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .shadow(2.dp, CircleShape, spotColor = Color(0x10000000))
                            .clip(CircleShape)
                            .background(Color.White)
                            .border(1.dp, CanvasBorder, CircleShape)
                            .clickable { onBack() },
                        contentAlignment = Alignment.Center
                    ) {
                        Text("←", color = RichCharcoal, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = "تحرير روشتة طبية 📄",
                            fontFamily = Cairo,
                            fontSize = 19.sp,
                            fontWeight = FontWeight.Bold,
                            color = RichCharcoal
                        )
                        Spacer(Modifier.height(1.dp))
                        Text(
                            text = "المريض: $patientName (#$bookingCode)",
                            fontFamily = Cairo,
                            fontSize = 12.5.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = SereneEmerald
                        )
                    }
                }

                Button(
                    onClick = { showMedBankSheet = true },
                    colors = ButtonDefaults.buttonColors(containerColor = SereneEmeraldLight, contentColor = SereneEmerald),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, Color(0xFFA7F3D0)),
                    modifier = Modifier.height(38.dp)
                ) {
                    Text("بنك الأدوية ⭐", fontFamily = Cairo, fontSize = 12.5.sp, fontWeight = FontWeight.Bold)
                }
            }

            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                contentPadding = PaddingValues(bottom = 20.dp)
            ) {
                // Huge Diagnosis Canvas Section
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(2.dp, RoundedCornerShape(16.dp), spotColor = Color(0x0E000000))
                            .clip(RoundedCornerShape(16.dp))
                            .background(Color.White)
                            .border(1.dp, CanvasBorder, RoundedCornerShape(16.dp))
                            .padding(18.dp)
                    ) {
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(4.dp, 16.dp)
                                        .clip(CircleShape)
                                        .background(SereneEmerald)
                                )
                                Spacer(Modifier.width(8.dp))
                                Text(
                                    text = "التشخيص الطبي السريري *",
                                    fontFamily = Cairo,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = RichCharcoal
                                )
                            }
                            Spacer(modifier = Modifier.height(10.dp))
                            OutlinedTextField(
                                value = diagnosisText,
                                onValueChange = { diagnosisText = it },
                                placeholder = {
                                    Text(
                                        "اكتب التشخيص الطبي والأعراض المرضية وتفاصيل الفحص...",
                                        fontFamily = Cairo,
                                        fontSize = 13.5.sp,
                                        color = SoftGray
                                    )
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .heightIn(min = 96.dp),
                                shape = RoundedCornerShape(12.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = SereneEmerald,
                                    unfocusedBorderColor = CanvasBorder,
                                    focusedContainerColor = SilkWhite,
                                    unfocusedContainerColor = Color.White
                                )
                            )

                            Spacer(modifier = Modifier.height(16.dp))

                            Text(
                                text = "توصيات وملاحظات إضافية للمريض",
                                fontFamily = Cairo,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = MutedCharcoal
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            OutlinedTextField(
                                value = notesText,
                                onValueChange = { notesText = it },
                                placeholder = {
                                    Text(
                                        "حمية غذائية، راحة تامة، موعد المراجعة بعد أسبوع...",
                                        fontFamily = Cairo,
                                        fontSize = 13.sp,
                                        color = SoftGray
                                    )
                                },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = SereneEmerald,
                                    unfocusedBorderColor = CanvasBorder,
                                    focusedContainerColor = SilkWhite,
                                    unfocusedContainerColor = Color.White
                                )
                            )
                        }
                    }
                }

                // Medications Section Header
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "الأدوية الموصوفة (${medicationsList.size}) 💊",
                            fontFamily = Cairo,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = RichCharcoal
                        )

                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            // Add from bank button
                            Box(
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .background(SereneEmeraldLight)
                                    .clickable { showMedBankSheet = true }
                                    .padding(horizontal = 12.dp, vertical = 6.dp)
                            ) {
                                Text(
                                    text = "+ من البنك",
                                    fontFamily = Cairo,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = SereneEmerald
                                )
                            }

                            // Manual Add
                            Box(
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .background(Color.White)
                                    .border(1.dp, CanvasBorder, CircleShape)
                                    .clickable {
                                        medicationsList.add(
                                            AuraPrescriptionMedItem("دواء جديد", "جرعة اعتيادية", "مرتين يومياً", "5 أيام")
                                        )
                                    }
                                    .padding(horizontal = 12.dp, vertical = 6.dp)
                            ) {
                                Text(
                                    text = "+ إضافة يدوي",
                                    fontFamily = Cairo,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MutedCharcoal
                                )
                            }
                        }
                    }
                }

                // Medications List
                itemsIndexed(medicationsList) { index, item ->
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(2.dp, RoundedCornerShape(14.dp), spotColor = Color(0x0D000000))
                            .clip(RoundedCornerShape(14.dp))
                            .background(Color.White)
                            .border(1.dp, CanvasBorder, RoundedCornerShape(14.dp))
                            .padding(14.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                Box(
                                    modifier = Modifier
                                        .size(34.dp)
                                        .clip(CircleShape)
                                        .background(SereneEmeraldLight)
                                        .border(1.dp, Color(0xFFA7F3D0), CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = "${index + 1}",
                                        fontFamily = Cairo,
                                        fontWeight = FontWeight.Bold,
                                        color = SereneEmerald,
                                        fontSize = 13.5.sp
                                    )
                                }

                                Spacer(modifier = Modifier.width(12.dp))

                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = item.name,
                                        fontFamily = Cairo,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.5.sp,
                                        color = RichCharcoal
                                    )
                                    Spacer(Modifier.height(2.dp))
                                    Text(
                                        text = "${item.dosage} · ${item.frequency} · ${item.duration}",
                                        fontFamily = Cairo,
                                        fontSize = 12.sp,
                                        color = MutedCharcoal
                                    )
                                    if (!item.instructions.isNullOrBlank()) {
                                        Text(
                                            text = "تعليمات: ${item.instructions}",
                                            fontFamily = Cairo,
                                            fontSize = 11.5.sp,
                                            color = SereneEmerald
                                        )
                                    }
                                }
                            }

                            // Delete button
                            Box(
                                modifier = Modifier
                                    .size(30.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFFFEF2F2))
                                    .clickable { medicationsList.removeAt(index) },
                                contentAlignment = Alignment.Center
                            ) {
                                Text("✕", color = Color(0xFFDC2626), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            // Bottom Save & Print Button
            Button(
                onClick = { onSaveAndPrint(medicationsList.toList(), diagnosisText) },
                colors = ButtonDefaults.buttonColors(containerColor = SereneEmerald),
                shape = RoundedCornerShape(14.dp),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 3.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 14.dp)
                    .height(52.dp)
            ) {
                Text(
                    "حفظ الروشتة وإصدار PDF المعتمد 📄",
                    fontFamily = Cairo,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
        }
    }

    // Modal Bottom Sheet with Search Bar for Med Bank
    if (showMedBankSheet) {
        val filteredBank = medBank.filter {
            medBankSearchQuery.isBlank() ||
                it.name.contains(medBankSearchQuery, ignoreCase = true) ||
                it.dosage.contains(medBankSearchQuery, ignoreCase = true)
        }

        ModalBottomSheet(
            onDismissRequest = {
                showMedBankSheet = false
                medBankSearchQuery = ""
            },
            containerColor = Color.White,
            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
            ) {
                Text(
                    text = "بنك الأدوية المفضلة ⭐",
                    fontFamily = Cairo,
                    fontSize = 19.sp,
                    fontWeight = FontWeight.Bold,
                    color = RichCharcoal
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    text = "ابحث واختر أي دواء لإضافته فوراً إلى الروشتة",
                    fontFamily = Cairo,
                    fontSize = 13.sp,
                    color = MutedCharcoal
                )

                Spacer(modifier = Modifier.height(14.dp))

                // Search Bar inside Bottom Sheet
                OutlinedTextField(
                    value = medBankSearchQuery,
                    onValueChange = { medBankSearchQuery = it },
                    placeholder = { Text("ابحث في بنك الأدوية (الاسم، الجرعة)...", fontFamily = Cairo, fontSize = 13.sp) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = SereneEmerald,
                        unfocusedBorderColor = CanvasBorder,
                        focusedContainerColor = SilkWhite,
                        unfocusedContainerColor = Color.White
                    )
                )

                Spacer(modifier = Modifier.height(14.dp))

                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxHeight(0.6f)
                ) {
                    itemsIndexed(filteredBank) { _, med ->
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .shadow(1.dp, RoundedCornerShape(12.dp), spotColor = Color(0x0C000000))
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color(0xFFF9FAFB))
                                .border(1.dp, CanvasBorder, RoundedCornerShape(12.dp))
                                .clickable {
                                    medicationsList.add(med)
                                    showMedBankSheet = false
                                    medBankSearchQuery = ""
                                }
                                .padding(14.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = med.name,
                                        fontFamily = Cairo,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.5.sp,
                                        color = RichCharcoal
                                    )
                                    Spacer(Modifier.height(2.dp))
                                    Text(
                                        text = "${med.dosage} · ${med.frequency} · ${med.duration}",
                                        fontFamily = Cairo,
                                        fontSize = 12.sp,
                                        color = MutedCharcoal
                                    )
                                }

                                Box(
                                    modifier = Modifier
                                        .clip(CircleShape)
                                        .background(SereneEmeraldLight)
                                        .padding(horizontal = 12.dp, vertical = 6.dp)
                                ) {
                                    Text(
                                        text = "+ اختيار",
                                        fontFamily = Cairo,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = SereneEmerald
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
