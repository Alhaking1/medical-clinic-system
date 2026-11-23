package com.medical.clinic.aura.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.medical.clinic.aura.theme.SilkWhite

/**
 * 👑 THE HEALING CANVAS BACKGROUND
 * Silk White (#FDFBF7) — A warm, creamy white that feels like premium paper, reducing eye strain.
 * Absolutely NO dark modes, NO mesh gradients, NO neon.
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
