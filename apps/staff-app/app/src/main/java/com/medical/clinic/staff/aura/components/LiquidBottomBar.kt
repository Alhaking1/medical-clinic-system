package com.medical.clinic.staff.aura.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.medical.clinic.staff.aura.theme.Cairo
import com.medical.clinic.staff.aura.theme.SereneEmerald
import com.medical.clinic.staff.aura.theme.SereneEmeraldLight
import com.medical.clinic.staff.aura.theme.SoftGray

data class AuraTab(
    val key: String,
    val label: String,
    val glyph: AuraGlyph
)

val AuraStaffTabs = listOf(
    AuraTab("dashboard", "نبضي", AuraGlyph.Dashboard),
    AuraTab("queue", "الطابور", AuraGlyph.Users),
    AuraTab("prescription", "الروشتة", AuraGlyph.Pill),
    AuraTab("profile", "حسابي", AuraGlyph.Profile)
)

/**
 * 👑 THE FOOTER (The "Floating Capsule" - Staff App)
 * - A floating, pill-shaped navigation bar at the bottom (margin 24.dp).
 * - Background: Pure White with a very soft shadow.
 * - Icons: Elegant outlines. When a tab is selected, the icon fills with Serene Emerald,
 *   and the text appears beneath it smoothly (animateFloatAsState with tween(300)).
 */
@Composable
fun FloatingCapsuleNav(
    tabs: List<AuraTab>,
    selectedIndex: Int,
    onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 8.dp)
            .shadow(
                elevation = 6.dp,
                shape = CircleShape,
                spotColor = Color(0x18000000),
                ambientColor = Color(0x0A000000)
            )
            .clip(CircleShape)
            .background(Color.White)
            .border(1.dp, Color(0xFFF3F4F6), CircleShape)
            .padding(horizontal = 12.dp, vertical = 6.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically
        ) {
            tabs.forEachIndexed { index, tab ->
                val isSelected = index == selectedIndex
                val animProgress by animateFloatAsState(
                    targetValue = if (isSelected) 1f else 0f,
                    animationSpec = tween(durationMillis = 300),
                    label = "tab_anim_$index"
                )

                val interactionSource = remember { MutableInteractionSource() }

                Column(
                    modifier = Modifier
                        .clip(CircleShape)
                        .clickable(
                            interactionSource = interactionSource,
                            indication = null
                        ) { onSelect(index) }
                        .padding(horizontal = 14.dp, vertical = 6.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(
                                if (isSelected) SereneEmeraldLight.copy(alpha = animProgress)
                                else Color.Transparent
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        AuraIcon(
                            glyph = tab.glyph,
                            tint = if (isSelected) SereneEmerald else SoftGray,
                            modifier = Modifier.size(22.dp)
                        )
                    }

                    if (isSelected) {
                        Text(
                            text = tab.label,
                            fontFamily = Cairo,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            color = SereneEmerald,
                            modifier = Modifier.graphicsLayer {
                                alpha = animProgress
                                translationY = (1f - animProgress) * -4f
                            }
                        )
                    }
                }
            }
        }
    }
}

// Alias for compatibility
@Composable
fun LiquidBottomBar(
    tabs: List<AuraTab>,
    selectedIndex: Int,
    onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    FloatingCapsuleNav(
        tabs = tabs,
        selectedIndex = selectedIndex,
        onSelect = onSelect,
        modifier = modifier
    )
}
