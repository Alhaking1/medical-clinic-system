package com.medical.clinic.staff.aura.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.medical.clinic.staff.aura.theme.SilkWhite

/**
 * 👑 THE HEALING CANVAS BACKGROUND (Staff App)
 * Silk White (#FDFBF7) — A warm, creamy white that feels like premium paper.
 */
@Composable
fun MeshGradientBackground(
    modifier: Modifier = Modifier,
    scrim: Float = 0f,
    content: @Composable BoxScope.() -> Unit
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(SilkWhite)
    ) {
        content()
    }
}
