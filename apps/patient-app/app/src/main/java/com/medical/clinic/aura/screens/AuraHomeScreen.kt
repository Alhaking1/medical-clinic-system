package com.medical.clinic.aura.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.animateScrollBy
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.medical.clinic.aura.components.AuraConfetti
import com.medical.clinic.aura.components.AuraGlyph
import com.medical.clinic.aura.components.AuraIcon
import com.medical.clinic.aura.components.AuraPrimaryButton
import com.medical.clinic.aura.components.AuraGhostButton
import com.medical.clinic.aura.components.GlassCard
import com.medical.clinic.aura.components.GlassIconButton
import com.medical.clinic.aura.components.GlassPill
import com.medical.clinic.aura.components.GradientHeading
import com.medical.clinic.aura.components.LiveDot
import com.medical.clinic.aura.components.MeshGradientBackground
import com.medical.clinic.aura.components.ParticleExplosion
import com.medical.clinic.aura.components.PulseAvatar
import com.medical.clinic.aura.components.SectionTitle
import com.medical.clinic.aura.components.SkeletonDoctorCard
import com.medical.clinic.aura.components.Tilt3D
import com.medical.clinic.aura.components.rememberAuraHaptics
import com.medical.clinic.aura.components.rememberShimmerBrush
import com.medical.clinic.aura.data.AuraAppointment
import com.medical.clinic.aura.data.AuraDemoData
import com.medical.clinic.aura.data.AuraDoctor
import com.medical.clinic.aura.data.AuraOffer
import com.medical.clinic.aura.theme.Cairo
import com.medical.clinic.aura.theme.LocalAuraPalette
import com.medical.clinic.aura.theme.SilkWhite
import com.medical.clinic.aura.theme.SereneEmerald
import com.medical.clinic.aura.theme.SereneEmeraldLight
import com.medical.clinic.aura.theme.SoftApricot
import com.medical.clinic.aura.theme.SoftApricotBorder
import com.medical.clinic.aura.theme.RichCharcoal
import com.medical.clinic.aura.theme.MutedCharcoal
import com.medical.clinic.aura.theme.SoftGray
import com.medical.clinic.aura.theme.CanvasBorder
import com.medical.clinic.aura.theme.PastelHeart
import com.medical.clinic.aura.theme.PastelDental
import com.medical.clinic.aura.theme.PastelOrthopedic
import com.medical.clinic.aura.theme.PastelPediatrics
import com.medical.clinic.aura.theme.PastelGeneral
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.Calendar
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

@Composable
fun AuraHomeScreen(
    userName: String?,
    unreadMessages: Int,
    snackbarHostState: SnackbarHostState,
    onOpenDoctor: (AuraDoctor) -> Unit,
    onOpenAllDoctors: () -> Unit,
    onOpenAppointments: () -> Unit,
    onOpenChat: () -> Unit,
    onOpenOffers: () -> Unit,
    onSearchDoctors: (String) -> Unit = {}
) {
    val palette = LocalAuraPalette.current
    val haptics = rememberAuraHaptics()
    val scope = rememberCoroutineScope()
    var loading by remember { mutableStateOf(true) }
    var adsLoading by remember { mutableStateOf(true) }
    var query by remember { mutableStateOf("") }
    var selectedSpecialty by remember { mutableStateOf("الكل") }
    var showGpsDialog by remember { mutableStateOf(false) }
    var confetti by remember { mutableIntStateOf(0) }
    val favorites = remember { mutableStateMapOf<Int, Boolean>() }
    val burst = remember { mutableIntStateOf(0) }

    LaunchedEffect(Unit) {
        delay(1500)
        loading = false
        adsLoading = false
    }

    val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
    val morning = hour in 5..11
    val greeting = if (morning) "صباح الخير" else "مساء الخير"
    val emoji = when {
        morning -> "☀️"
        hour in 12..17 -> "🌤️"
        else -> "🌙"
    }
    val shortName = userName?.trim()?.split(" ")?.firstOrNull()?.takeIf { it.isNotBlank() } ?: "أحمد"

    val specialties = listOf("الكل", "القلب", "الجلدية", "الأطفال", "العظام", "الباطنية")
    val filteredDoctors = AuraDemoData.doctors.filter { doctor ->
        val matchesQuery = query.isBlank() ||
            doctor.name.contains(query, true) ||
            doctor.specialty.contains(query, true) ||
            doctor.clinic.contains(query, true)
        val matchesSpecialty = selectedSpecialty == "الكل" || doctor.specialty.contains(selectedSpecialty)
        matchesQuery && matchesSpecialty
    }
    val smartAppointment = AuraDemoData.appointments.firstOrNull()

    Box(Modifier.fillMaxSize()) {
        MeshGradientBackground {
            Box(Modifier.fillMaxSize()) {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(start = 24.dp, end = 24.dp, top = 20.dp, bottom = 140.dp),
                    verticalArrangement = Arrangement.spacedBy(32.dp)
                ) {
                    item {
                        HomeHeader(
                            greeting = greeting,
                            name = shortName,
                            unread = unreadMessages,
                            onNotifications = {
                                scope.launch { snackbarHostState.showSnackbar("لا توجد إشعارات جديدة الآن") }
                            },
                            onProfile = { },
                            modifier = Modifier
                                .statusBarsPadding()
                                .padding(top = 10.dp)
                        )
                    }

                    item {
                        SearchBar(
                            query = query,
                            onQueryChange = {
                                query = it
                                onSearchDoctors(it)
                            }
                        )
                    }

                    if (smartAppointment != null) {
                        item {
                            HeroAppointmentWidget(
                                appointment = smartAppointment,
                                onOpen = onOpenAppointments
                            )
                        }
                    }

                    item {
                        SpecialtyBubbles(
                            selected = selectedSpecialty,
                            onSelect = {
                                haptics.tap()
                                selectedSpecialty = it
                            }
                        )
                    }

                    item {
                        SectionTitle(
                            title = if (query.isBlank()) "أطباء متميزون" else "نتائج البحث",
                            action = "عرض الكل",
                            onAction = onOpenAllDoctors
                        )
                    }

                    item {
                        if (loading) {
                            LazyRow(
                                horizontalArrangement = Arrangement.spacedBy(14.dp)
                            ) {
                                items(2) { SkeletonDoctorCard() }
                            }
                        } else if (filteredDoctors.isEmpty()) {
                            EmptySearchState(
                                modifier = Modifier.fillMaxWidth()
                            )
                        } else {
                            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                                filteredDoctors.forEach { doctor ->
                                    DoctorCardHealingCanvas(
                                        doctor = doctor,
                                        favorite = favorites[doctor.id] == true,
                                        onFavorite = {
                                            favorites[doctor.id] = favorites[doctor.id] != true
                                            haptics.like()
                                            burst.intValue++
                                        },
                                        onBook = {
                                            haptics.tap()
                                            onOpenDoctor(doctor)
                                        }
                                    )
                                }
                            }
                        }
                    }

                    item {
                        SectionTitle(
                            title = "عروض تنبض لك",
                            action = "كل العروض",
                            onAction = onOpenOffers
                        )
                    }

                    item {
                        HolographicOffers(
                            offers = AuraDemoData.offers,
                            loading = adsLoading,
                            onOffer = {
                                haptics.tap()
                                onOpenOffers()
                            }
                        )
                    }

                    item {
                        PulseStatsStrip(
                            onOpenAppointments = onOpenAppointments,
                            onOpenRecords = onOpenAllDoctors
                        )
                    }

                    item {
                        AuraInsightCard(
                            onOpenChat = onOpenChat
                        )
                    }
                }

                // Floating heartbeat chat bubble — only when unread
                AnimatedVisibility(
                    visible = unreadMessages > 0,
                    enter = scaleIn(spring(dampingRatio = Spring.DampingRatioMediumBouncy)) + fadeIn(),
                    exit = fadeOut(),
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .navigationBarsPadding()
                        .padding(end = 20.dp, bottom = 108.dp)
                ) {
                    ChatBubble(unread = unreadMessages, onClick = onOpenChat)
                }

                ParticleExplosion(
                    trigger = burst.intValue,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(top = 300.dp, end = 40.dp),
                    originX = 0.78f,
                    originY = 0.4f
                )
                AuraConfetti(trigger = confetti, modifier = Modifier.fillMaxSize())
            }
        }

        if (showGpsDialog) {
            GpsVerificationDialog(
                onDismiss = { showGpsDialog = false },
                onConfirm = {
                    showGpsDialog = false
                    confetti++
                    haptics.success()
                    scope.launch {
                        snackbarHostState.showSnackbar("تم التحقق من موقعك — نراك قريباً في العيادة 🚗")
                    }
                }
            )
        }
    }
}

@Composable
private fun HomeHeader(
    greeting: String,
    name: String,
    unread: Int,
    onNotifications: () -> Unit,
    onProfile: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(Modifier.weight(1f)) {
            Text(
                text = "أهلاً بك، $name",
                color = RichCharcoal,
                fontFamily = Cairo,
                fontWeight = FontWeight.Bold,
                fontSize = 30.sp
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text = "كيف تشعر اليوم؟",
                color = SereneEmerald,
                fontFamily = Cairo,
                fontWeight = FontWeight.SemiBold,
                fontSize = 16.sp
            )
        }
        Spacer(Modifier.width(12.dp))
        GlassIconButton(
            glyph = AuraGlyph.Bell,
            contentDescription = "الإشعارات",
            onClick = onNotifications,
            badge = if (unread > 0) "$unread" else null
        )
        Spacer(Modifier.width(8.dp))
        Box(
            Modifier
                .size(56.dp)
                .shadow(elevation = 2.dp, shape = CircleShape, spotColor = Color(0x12000000))
                .clip(CircleShape)
                .background(Color.White)
                .border(1.5.dp, SereneEmeraldLight, CircleShape)
                .clickable(onClick = onProfile),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = name.firstOrNull()?.toString() ?: "أ",
                color = SereneEmerald,
                fontFamily = Cairo,
                fontWeight = FontWeight.Bold,
                fontSize = 22.sp
            )
        }
    }
}

@Composable
private fun HeroAppointmentWidget(
    appointment: AuraAppointment,
    modifier: Modifier = Modifier,
    onOpen: () -> Unit
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .shadow(
                elevation = 3.dp,
                shape = RoundedCornerShape(20.dp),
                spotColor = Color(0x18EA580C),
                ambientColor = Color(0x08000000)
            )
            .clip(RoundedCornerShape(20.dp))
            .background(SoftApricot)
            .border(1.dp, SoftApricotBorder, RoundedCornerShape(20.dp))
            .clickable(onClick = onOpen)
            .padding(20.dp)
    ) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(54.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFFFEDD5)),
                    contentAlignment = Alignment.Center
                ) {
                    AuraIcon(
                        glyph = AuraGlyph.Clock,
                        contentDescription = "ساعة الموعد",
                        size = 26.dp,
                        tint = Color(0xFFD97706),
                        stroke = 2.2f
                    )
                }

                Spacer(Modifier.width(16.dp))

                Column(Modifier.weight(1f)) {
                    Text(
                        text = "موعد قادم مؤكد 🗓️",
                        fontFamily = Cairo,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        color = Color(0xFFD97706)
                    )
                    Spacer(Modifier.height(2.dp))
                    Text(
                        text = "موعدك مع ${appointment.doctorName}",
                        fontFamily = Cairo,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = RichCharcoal
                    )
                    Spacer(Modifier.height(2.dp))
                    Text(
                        text = "غداً الساعة ${appointment.time}",
                        fontFamily = Cairo,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp,
                        color = SereneEmerald
                    )
                }
            }

            Spacer(Modifier.height(16.dp))

            // Dynamic progress bar showing how close the appointment is
            Text(
                text = "اقتراب الموعد: متبقي ساعتان تقريباً",
                fontFamily = Cairo,
                fontWeight = FontWeight.Medium,
                fontSize = 12.sp,
                color = MutedCharcoal
            )
            Spacer(Modifier.height(6.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .clip(CircleShape)
                    .background(Color(0xFFFED7AA))
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.75f)
                        .fillMaxHeight()
                        .clip(CircleShape)
                        .background(SereneEmerald)
                )
            }
        }
    }
}

// Compatibility wrapper
@Composable
private fun SmartAppointmentCard(
    appointment: AuraAppointment,
    modifier: Modifier = Modifier,
    onRoute: () -> Unit = {},
    onOpen: () -> Unit = {}
) {
    HeroAppointmentWidget(appointment = appointment, modifier = modifier, onOpen = onOpen)
}

@Composable
private fun SearchBar(
    query: String,
    onQueryChange: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(56.dp)
            .shadow(elevation = 2.dp, shape = CircleShape, spotColor = Color(0x0C000000))
            .clip(CircleShape)
            .background(SilkWhite)
            .border(1.dp, CanvasBorder, CircleShape)
            .padding(horizontal = 20.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        AuraIcon(
            glyph = AuraGlyph.Search,
            contentDescription = "بحث",
            size = 22.dp,
            tint = SereneEmerald
        )
        Spacer(Modifier.width(14.dp))
        BasicTextField(
            value = query,
            onValueChange = onQueryChange,
            singleLine = true,
            textStyle = TextStyle(
                color = RichCharcoal,
                fontFamily = Cairo,
                fontSize = 14.5.sp,
                fontWeight = FontWeight.Medium
            ),
            modifier = Modifier.weight(1f),
            decorationBox = { inner ->
                Box {
                    if (query.isEmpty()) {
                        Text(
                            "ابحث عن طبيب، تخصص، أو عيادة...",
                            color = SoftGray,
                            fontFamily = Cairo,
                            fontSize = 14.sp
                        )
                    }
                    inner()
                }
            }
        )
    }
}

private data class SpecialtyBubbleData(
    val title: String,
    val bg: Color,
    val iconColor: Color,
    val glyph: AuraGlyph
)

@Composable
private fun SpecialtyBubbles(
    selected: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val bubbles = remember {
        listOf(
            SpecialtyBubbleData("الكل", Color(0xFFF3F4F6), SereneEmerald, AuraGlyph.Doctor),
            SpecialtyBubbleData("القلب", Color(0xFFE0F2FE), Color(0xFF0284C7), AuraGlyph.Heart),
            SpecialtyBubbleData("الجلدية", Color(0xFFFCE7F3), Color(0xFFDB2777), AuraGlyph.Shield),
            SpecialtyBubbleData("الأطفال", Color(0xFFFEF3C7), Color(0xFFD97706), AuraGlyph.Spark),
            SpecialtyBubbleData("العظام", Color(0xFFF3E8FF), Color(0xFF7C3AED), AuraGlyph.Plus),
            SpecialtyBubbleData("الباطنية", Color(0xFFECFDF5), Color(0xFF059669), AuraGlyph.Pill)
        )
    }

    LazyRow(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(bubbles) { bubble ->
            val isSelected = bubble.title == selected
            val scale by animateFloatAsState(
                targetValue = if (isSelected) 1.06f else 1.0f,
                animationSpec = tween(durationMillis = 300),
                label = "bubble_scale_${bubble.title}"
            )

            Box(
                modifier = Modifier
                    .width(88.dp)
                    .height(98.dp)
                    .graphicsLayer {
                        scaleX = scale
                        scaleY = scale
                    }
                    .shadow(
                        elevation = if (isSelected) 3.dp else 1.dp,
                        shape = RoundedCornerShape(20.dp),
                        spotColor = if (isSelected) bubble.iconColor.copy(alpha = 0.25f) else Color(0x0A000000)
                    )
                    .clip(RoundedCornerShape(20.dp))
                    .background(if (isSelected) bubble.bg else bubble.bg.copy(alpha = 0.7f))
                    .border(
                        width = if (isSelected) 2.dp else 1.dp,
                        color = if (isSelected) bubble.iconColor else Color.Transparent,
                        shape = RoundedCornerShape(20.dp)
                    )
                    .clickable { onSelect(bubble.title) }
                    .padding(vertical = 10.dp, horizontal = 6.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    AuraIcon(
                        glyph = bubble.glyph,
                        contentDescription = bubble.title,
                        size = 30.dp,
                        tint = bubble.iconColor,
                        stroke = 2.3f
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        text = bubble.title,
                        fontFamily = Cairo,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.SemiBold,
                        fontSize = 12.5.sp,
                        color = RichCharcoal
                    )
                }
            }
        }
    }
}

@Composable
private fun HolographicOffers(
    offers: List<AuraOffer>,
    loading: Boolean,
    onOffer: (AuraOffer) -> Unit,
    modifier: Modifier = Modifier
) {
    val palette = LocalAuraPalette.current
    val pagerState = rememberPagerState(pageCount = { offers.size })
    val shimmer = rememberShimmerBrush()
    val transition = rememberInfiniteTransition(label = "holo")
    val sheen by transition.animateFloat(
        -0.4f, 1.4f,
        infiniteRepeatable(tween(3600, easing = LinearEasing), RepeatMode.Restart),
        label = "holo-sheen"
    )

    LaunchedEffect(pagerState) {
        while (true) {
            delay(4000)
            val next = (pagerState.currentPage + 1) % offers.size
            pagerState.animateScrollToPage(next, animationSpec = tween(900, easing = FastOutSlowInEasing))
        }
    }

    Column(modifier) {
        HorizontalPager(
            state = pagerState,
            pageSpacing = 12.dp,
            contentPadding = PaddingValues(end = 28.dp)
        ) { page ->
            val offer = offers[page]
            val offset = (pagerState.currentPage - page) + pagerState.currentPageOffsetFraction
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(178.dp)
                    .graphicsLayer {
                        translationX = offset * 18.dp.toPx()
                        rotationY = offset * 4f
                        cameraDistance = 16f * density
                    }
                    .clip(RoundedCornerShape(24.dp))
                    .background(Brush.linearGradient(offer.colors))
                    .border(
                        1.dp,
                        Brush.linearGradient(
                            listOf(Color.White.copy(alpha = 0.45f), Color.Transparent, Color.White.copy(alpha = 0.18f))
                        ),
                        RoundedCornerShape(24.dp)
                    )
                    .clickable { onOffer(offer) }
            ) {
                // Holo bands
                Canvas(Modifier.fillMaxSize()) {
                    repeat(5) { i ->
                        val x = size.width * (0.12f + i * 0.20f) - sheen * size.width * 1.2f
                        drawRect(
                            Brush.linearGradient(
                                listOf(Color.Transparent, Color.White.copy(alpha = 0.10f), Color.Transparent),
                                start = Offset(x, 0f),
                                end = Offset(x + 64.dp.toPx(), size.height)
                            ),
                            topLeft = Offset(x, 0f),
                            size = androidx.compose.ui.geometry.Size(64.dp.toPx(), size.height)
                        )
                    }
                    drawCircle(
                        Color.White.copy(alpha = 0.10f),
                        radius = size.height * 0.55f,
                        center = Offset(size.width * 0.86f, size.height * 0.16f)
                    )
                    drawCircle(
                        Color.Black.copy(alpha = 0.12f),
                        radius = size.height * 0.36f,
                        center = Offset(size.width * 0.12f, size.height * 0.95f)
                    )
                }

                // Faint glyph watermark
                Box(
                    Modifier
                        .align(Alignment.CenterEnd)
                        .padding(end = 14.dp)
                        .size(112.dp)
                        .graphicsLayer { alpha = 0.18f; rotationZ = -12f }
                ) {
                    AuraIcon(
                        when (page % 3) {
                            0 -> AuraGlyph.Heart
                            1 -> AuraGlyph.Spark
                            else -> AuraGlyph.Doctor
                        },
                        null,
                        size = 112.dp,
                        tint = Color.White,
                        stroke = 1f,
                        filled = page % 3 == 0
                    )
                }

                Column(
                    Modifier
                        .fillMaxSize()
                        .padding(18.dp),
                    verticalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            offer.eyebrow,
                            color = Color.White.copy(alpha = 0.8f),
                            fontFamily = Cairo,
                            fontSize = 8.5.sp,
                            letterSpacing = 2.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(Modifier.weight(1f))
                        GlassPill(color = Color.White) {
                            Text(
                                offer.badge,
                                color = Color.White,
                                fontFamily = Cairo,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                    Column {
                        Text(
                            offer.title,
                            color = Color.White,
                            fontFamily = Cairo,
                            fontWeight = FontWeight.Black,
                            fontSize = 24.sp
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            offer.subtitle,
                            color = Color.White.copy(alpha = 0.82f),
                            fontFamily = Cairo,
                            fontSize = 11.sp
                        )
                        Spacer(Modifier.height(10.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                offer.glyphTag,
                                color = Color.White.copy(alpha = 0.66f),
                                fontFamily = Cairo,
                                fontSize = 9.sp
                            )
                            Spacer(Modifier.width(8.dp))
                            Box(
                                Modifier
                                    .clip(CircleShape)
                                    .background(Color.White.copy(alpha = 0.18f))
                                    .padding(horizontal = 9.dp, vertical = 4.dp)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        "اكتشف",
                                        color = Color.White,
                                        fontFamily = Cairo,
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                    Spacer(Modifier.width(3.dp))
                                    AuraIcon(
                                        AuraGlyph.ChevronEnd,
                                        null,
                                        size = 11.dp,
                                        tint = Color.White,
                                        stroke = 2f
                                    )
                                }
                            }
                        }
                    }
                }

                if (loading) {
                    Box(
                        Modifier
                            .fillMaxSize()
                            .background(shimmer)
                    )
                }
            }
        }

        Spacer(Modifier.height(12.dp))

        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            offers.indices.forEach { index ->
                val active = pagerState.currentPage == index
                val width by animateDpAsState(
                    targetValue = if (active) 24.dp else 6.dp,
                    animationSpec = spring(stiffness = Spring.StiffnessMediumLow),
                    label = "dot-$index"
                )
                Box(
                    Modifier
                        .padding(horizontal = 3.dp)
                        .size(width = width, height = 6.dp)
                        .clip(CircleShape)
                        .background(
                            if (active) {
                                Brush.horizontalGradient(listOf(palette.teal, palette.violet))
                            } else {
                                Brush.horizontalGradient(listOf(Color.White.copy(alpha = 0.22f), Color.White.copy(alpha = 0.22f)))
                            }
                        )
                )
            }
        }
    }
}

@Composable
private fun DoctorCardHealingCanvas(
    doctor: AuraDoctor,
    favorite: Boolean,
    onFavorite: () -> Unit,
    onBook: () -> Unit,
    modifier: Modifier = Modifier
) {
    val heartScale by animateFloatAsState(
        targetValue = if (favorite) 1.2f else 1f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy),
        label = "heart-scale"
    )

    Box(
        modifier = modifier
            .fillMaxWidth()
            .shadow(
                elevation = 2.dp,
                shape = RoundedCornerShape(18.dp),
                spotColor = Color(0x10000000),
                ambientColor = Color(0x06000000)
            )
            .clip(RoundedCornerShape(18.dp))
            .background(Color.White)
            .border(1.dp, CanvasBorder, RoundedCornerShape(18.dp))
            .clickable(onClick = onBook)
            .padding(18.dp)
    ) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Doctor Photo / Avatar on the RIGHT (60.dp fully rounded)
                Box(
                    modifier = Modifier
                        .size(60.dp)
                        .clip(CircleShape)
                        .background(SereneEmeraldLight)
                        .border(1.5.dp, Color(0xFFA7F3D0), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = doctor.initial,
                        color = SereneEmerald,
                        fontFamily = Cairo,
                        fontWeight = FontWeight.Bold,
                        fontSize = 24.sp
                    )
                }

                Spacer(Modifier.width(14.dp))

                // Name & specialty
                Column(Modifier.weight(1f)) {
                    Text(
                        text = doctor.name,
                        color = RichCharcoal,
                        fontFamily = Cairo,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(Modifier.height(3.dp))
                    Text(
                        text = doctor.specialty,
                        color = SereneEmerald,
                        fontFamily = Cairo,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 13.sp
                    )
                    Spacer(Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        AuraIcon(AuraGlyph.Star, null, size = 13.dp, tint = Color(0xFFD97706))
                        Spacer(Modifier.width(4.dp))
                        Text(
                            "${doctor.rating} (${doctor.reviews} تقييم)",
                            color = MutedCharcoal,
                            fontFamily = Cairo,
                            fontSize = 11.5.sp
                        )
                    }
                }

                // Favorite button
                Box(
                    modifier = Modifier
                        .size(38.dp)
                        .graphicsLayer { scaleX = heartScale; scaleY = heartScale }
                        .clip(CircleShape)
                        .background(if (favorite) Color(0xFFFEF2F2) else Color(0xFFF9FAFB))
                        .clickable(onClick = onFavorite),
                    contentAlignment = Alignment.Center
                ) {
                    AuraIcon(
                        glyph = AuraGlyph.Heart,
                        contentDescription = "مفضلة",
                        size = 18.dp,
                        tint = if (favorite) Color(0xFFDC2626) else SoftGray
                    )
                }
            }

            Spacer(Modifier.height(14.dp))

            // Sleek "Book" button at the bottom
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "${doctor.fee} ريال / كشفية",
                    fontFamily = Cairo,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.5.sp,
                    color = RichCharcoal
                )

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(10.dp))
                        .background(SereneEmerald)
                        .clickable(onClick = onBook)
                        .padding(horizontal = 18.dp, vertical = 8.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        AuraIcon(
                            glyph = AuraGlyph.Calendar,
                            contentDescription = null,
                            size = 16.dp,
                            tint = Color.White
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(
                            text = "احجز الآن",
                            color = Color.White,
                            fontFamily = Cairo,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.5.sp
                        )
                    }
                }
            }
        }
    }
}

// Wrapper for compatibility
@Composable
private fun DoctorCard(
    doctor: AuraDoctor,
    favorite: Boolean,
    onFavorite: () -> Unit,
    onClick: () -> Unit
) {
    DoctorCardHealingCanvas(
        doctor = doctor,
        favorite = favorite,
        onFavorite = onFavorite,
        onBook = onClick
    )
}

@Composable
private fun PulseStatsStrip(
    modifier: Modifier = Modifier,
    onOpenAppointments: () -> Unit,
    onOpenRecords: () -> Unit
) {
    val palette = LocalAuraPalette.current
    GlassCard(
        modifier = modifier.fillMaxWidth(),
        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 14.dp)
    ) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            StatCell("٢٤/٧", "نبض متواصل", palette.teal, Modifier.weight(1f), onOpenAppointments)
            Box(Modifier.width(1.dp).height(34.dp).background(Color.White.copy(alpha = 0.10f)))
            StatCell("٤.٩", "تقييم الأطباء", palette.gold, Modifier.weight(1f), onOpenRecords)
            Box(Modifier.width(1.dp).height(34.dp).background(Color.White.copy(alpha = 0.10f)))
            StatCell("٩٨٪", "رضا المرضى", palette.violet, Modifier.weight(1f), onOpenRecords)
        }
    }
}

@Composable
private fun StatCell(
    value: String,
    label: String,
    color: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Column(
        modifier
            .clip(RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 3.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            value,
            color = color,
            fontFamily = Cairo,
            fontWeight = FontWeight.Black,
            fontSize = 19.sp
        )
        Spacer(Modifier.height(2.dp))
        Text(
            label,
            color = LocalAuraPalette.current.textSecondary,
            fontFamily = Cairo,
            fontSize = 8.5.sp
        )
    }
}

@Composable
private fun AuraInsightCard(
    modifier: Modifier = Modifier,
    onOpenChat: () -> Unit
) {
    val palette = LocalAuraPalette.current
    GlassCard(
        modifier = modifier.fillMaxWidth(),
        onClick = onOpenChat,
        glowColor = palette.violet,
        contentPadding = PaddingValues(16.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(42.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(Brush.linearGradient(listOf(palette.violet.copy(alpha = 0.7f), palette.purple)))
                    .border(1.dp, Color.White.copy(alpha = 0.2f), RoundedCornerShape(14.dp)),
                contentAlignment = Alignment.Center
            ) {
                AuraIcon(AuraGlyph.Chat, null, size = 20.dp, tint = Color.White)
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    "مساعد AURA الذكي",
                    color = palette.textPrimary,
                    fontFamily = Cairo,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.5.sp
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    "اسأل عن أعراضك، أدويتك، أو حضّر أسئلتك للطبيب.",
                    color = palette.textSecondary,
                    fontFamily = Cairo,
                    fontSize = 10.sp
                )
            }
            AuraIcon(AuraGlyph.ChevronEnd, null, size = 18.dp, tint = palette.teal)
        }
    }
}

@Composable
private fun ChatBubble(unread: Int, onClick: () -> Unit) {
    val palette = LocalAuraPalette.current
    val transition = rememberInfiniteTransition(label = "chat-bubble")
    val beat by transition.animateFloat(
        1f, 1.10f,
        infiniteRepeatable(
            animation = tween(620, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "chat-beat"
    )
    Box(contentAlignment = Alignment.Center) {
        Canvas(Modifier.size(92.dp)) {
            repeat(2) { i ->
                drawCircle(
                    color = palette.teal.copy(alpha = 0.14f - i * 0.05f),
                    radius = size.minDimension * (0.34f + i * 0.10f)
                )
            }
        }
        Box(
            Modifier
                .size(58.dp)
                .graphicsLayer {
                    scaleX = beat
                    scaleY = beat
                }
                .shadow(
                    elevation = 20.dp,
                    shape = CircleShape,
                    ambientColor = palette.teal,
                    spotColor = palette.violet
                )
                .clip(CircleShape)
                .background(
                    Brush.linearGradient(listOf(palette.teal, palette.tealDeep, palette.violet))
                )
                .clickable(onClick = onClick),
            contentAlignment = Alignment.Center
        ) {
            AuraIcon(AuraGlyph.Chat, "المحادثة", size = 25.dp, tint = Color(0xFF031412), stroke = 2f)
            Box(
                Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 2.dp, end = 1.dp)
                    .size(18.dp)
                    .clip(CircleShape)
                    .background(palette.danger),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    "${unread}",
                    color = Color.White,
                    fontFamily = Cairo,
                    fontSize = 8.5.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

@Composable
private fun EmptySearchState(modifier: Modifier = Modifier) {
    val palette = LocalAuraPalette.current
    GlassCard(modifier = modifier, contentPadding = PaddingValues(24.dp)) {
        Column(
            Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Canvas(Modifier.size(120.dp)) {
                drawCircle(
                    Brush.radialGradient(
                        listOf(palette.teal.copy(alpha = 0.22f), Color.Transparent)
                    ),
                    radius = size.minDimension * 0.5f
                )
                drawCircle(
                    color = palette.teal.copy(alpha = 0.35f),
                    radius = size.minDimension * 0.34f,
                    style = androidx.compose.ui.graphics.drawscope.Stroke(width = 1.5.dp.toPx())
                )
                drawCircle(
                    color = palette.violet.copy(alpha = 0.40f),
                    radius = size.minDimension * 0.22f,
                    style = androidx.compose.ui.graphics.drawscope.Stroke(width = 1.dp.toPx())
                )
                drawCircle(
                    color = palette.teal,
                    radius = 5.dp.toPx(),
                    center = Offset(size.width * 0.72f, size.height * 0.32f)
                )
                drawCircle(
                    color = palette.violet,
                    radius = 3.dp.toPx(),
                    center = Offset(size.width * 0.24f, size.height * 0.68f)
                )
            }
            Spacer(Modifier.height(10.dp))
            Text(
                "لا توجد نتائج في هذا المسار",
                color = palette.textPrimary,
                fontFamily = Cairo,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp
            )
            Spacer(Modifier.height(4.dp))
            Text(
                "جرّب تخصصاً آخر أو امسح البحث — عالم الأطباء أوسع.",
                color = palette.textSecondary,
                fontFamily = Cairo,
                fontSize = 10.5.sp,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )
        }
    }
}

@Composable
private fun GpsVerificationDialog(
    onDismiss: () -> Unit,
    onConfirm: () -> Unit
) {
    val palette = LocalAuraPalette.current
    val transition = rememberInfiniteTransition(label = "radar")
    val sweep by transition.animateFloat(
        0f, 360f,
        infiniteRepeatable(tween(3400, easing = LinearEasing), RepeatMode.Restart),
        label = "radar-sweep"
    )
    val pulse by transition.animateFloat(
        0.4f, 1f,
        infiniteRepeatable(tween(1400, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "radar-pulse"
    )
    Dialog(onDismissRequest = onDismiss) {
        GlassCard(
            modifier = Modifier.fillMaxWidth(),
            glowColor = palette.teal,
            contentPadding = PaddingValues(22.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier
                        .size(38.dp)
                        .clip(CircleShape)
                        .background(palette.teal.copy(alpha = 0.14f)),
                    contentAlignment = Alignment.Center
                ) {
                    AuraIcon(AuraGlyph.Location, null, size = 19.dp, tint = palette.teal)
                }
                Spacer(Modifier.width(10.dp))
                Column {
                    Text(
                        "تحقق الموقع الحي",
                        color = palette.textPrimary,
                        fontFamily = Cairo,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                    Text(
                        "AURA GPS · دقة عالية",
                        color = palette.teal,
                        fontFamily = Cairo,
                        fontSize = 9.sp,
                        letterSpacing = 1.sp
                    )
                }
            }
            Spacer(Modifier.height(18.dp))
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(150.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .background(
                        Brush.radialGradient(
                            listOf(palette.emerald.copy(alpha = 0.15f), Color(0xFFF1F5F9))
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                Canvas(Modifier.fillMaxSize()) {
                    val c = center
                    repeat(4) { i ->
                        drawCircle(
                            color = palette.teal.copy(alpha = 0.16f - i * 0.03f),
                            radius = size.minDimension * (0.12f + i * 0.11f),
                            center = c,
                            style = androidx.compose.ui.graphics.drawscope.Stroke(width = 1.dp.toPx())
                        )
                    }
                    rotate(sweep, pivot = c) {
                        drawArc(
                            brush = Brush.sweepGradient(
                                listOf(
                                    Color.Transparent,
                                    palette.teal.copy(alpha = 0.45f),
                                    Color.Transparent
                                ),
                                center = c
                            ),
                            startAngle = 0f,
                            sweepAngle = 70f,
                            useCenter = true,
                            topLeft = Offset(c.x - size.minDimension * 0.36f, c.y - size.minDimension * 0.36f),
                            size = androidx.compose.ui.geometry.Size(size.minDimension * 0.72f, size.minDimension * 0.72f)
                        )
                    }
                    drawCircle(
                        color = palette.teal.copy(alpha = 0.18f * pulse),
                        radius = 20.dp.toPx(),
                        center = c
                    )
                    drawCircle(color = palette.teal, radius = 5.dp.toPx(), center = c)
                }
                Text(
                    "أنت على بعد ١.٢ كم من العيادة",
                    color = palette.textSecondary,
                    fontFamily = Cairo,
                    fontSize = 9.5.sp,
                    modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 10.dp)
                )
            }
            Spacer(Modifier.height(16.dp))
            Text(
                "سنُعلم العيادة بوصولك المتوقع خلال ١٢ دقيقة. لا تتم مشاركة موقعك إلا لهذا الموعد.",
                color = palette.textSecondary,
                fontFamily = Cairo,
                fontSize = 10.5.sp,
                lineHeight = 18.sp
            )
            Spacer(Modifier.height(18.dp))
            AuraPrimaryButton(
                text = "تأكيد الموقع والانطلاق",
                onClick = onConfirm,
                icon = AuraGlyph.Location
            )
            Spacer(Modifier.height(8.dp))
            AuraGhostButton(
                text = "ليس الآن",
                onClick = onDismiss,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}
