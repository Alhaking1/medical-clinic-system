const fs = require('fs');

// 1. Patch activity_main_patient.xml
const xmlPath = 'C:/Users/lenovo/AndroidProjects/MedicalClinicApp/app/src/main/res/layout/activity_main_patient.xml';
let xmlCode = fs.readFileSync(xmlPath, 'utf8').replace(/\r\n/g, '\n');

if (!xmlCode.includes('fabAiBubble')) {
  const bubbleXml = `
    <!-- فقاعة الذكاء الاصطناعي العائمة القابلة للتحريك في أي مكان -->
    <FrameLayout
        android:id="@+id/fabAiBubble"
        android:layout_width="60dp"
        android:layout_height="60dp"
        android:clickable="true"
        android:focusable="true"
        android:elevation="16dp"
        app:layout_constraintBottom_toTopOf="@id/patientBottomNav"
        app:layout_constraintEnd_toEndOf="parent"
        android:layout_marginEnd="16dp"
        android:layout_marginBottom="16dp">

        <androidx.cardview.widget.CardView
            android:layout_width="56dp"
            android:layout_height="56dp"
            android:layout_gravity="center"
            app:cardCornerRadius="28dp"
            app:cardElevation="8dp"
            app:cardBackgroundColor="#00897B">

            <FrameLayout
                android:layout_width="match_parent"
                android:layout_height="match_parent">

                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_gravity="center"
                    android:text="🤖"
                    android:textSize="26sp" />

                <TextView
                    android:layout_width="16dp"
                    android:layout_height="16dp"
                    android:layout_gravity="top|end"
                    android:layout_margin="3dp"
                    android:background="@drawable/bg_badge_red_circle"
                    android:backgroundTint="#10B981"
                    android:text="AI"
                    android:textColor="#FFFFFF"
                    android:textSize="8sp"
                    android:textStyle="bold"
                    android:gravity="center" />
            </FrameLayout>
        </androidx.cardview.widget.CardView>
    </FrameLayout>
`;

  xmlCode = xmlCode.replace(
    '</androidx.constraintlayout.widget.ConstraintLayout>',
    bubbleXml + '\n</androidx.constraintlayout.widget.ConstraintLayout>'
  );
  fs.writeFileSync(xmlPath, xmlCode.replace(/\n/g, '\r\n'), 'utf8');
  console.log('✅ Added fabAiBubble to activity_main_patient.xml');
}

// 2. Patch MainActivity.kt
const mainPath = 'C:/Users/lenovo/AndroidProjects/MedicalClinicApp/app/src/main/java/com/medical/clinic/ui/main/MainActivity.kt';
let mainCode = fs.readFileSync(mainPath, 'utf8').replace(/\r\n/g, '\n');

if (!mainCode.includes('setupDraggableAiBubble')) {
  // Add imports
  if (!mainCode.includes('import android.view.MotionEvent')) {
    mainCode = mainCode.replace(
      'import android.os.Bundle',
      'import android.os.Bundle\nimport android.view.MotionEvent\nimport android.view.View\nimport android.content.Intent'
    );
  }

  // Call setupDraggableAiBubble in setupPatientUI
  mainCode = mainCode.replace(
    'setupPatientUI()',
    'setupPatientUI()\n                setupDraggableAiBubble()'
  );

  const bubbleLogic = `
    private fun setupDraggableAiBubble() {
        val bubble = findViewById<View>(R.id.fabAiBubble) ?: return

        var dX = 0f
        var dY = 0f
        var startX = 0f
        var startY = 0f
        val touchSlop = 12f

        bubble.setOnTouchListener { view, event ->
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    dX = view.x - event.rawX
                    dY = view.y - event.rawY
                    startX = event.rawX
                    startY = event.rawY
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val parent = view.parent as? View ?: return@setOnTouchListener false
                    val newX = (event.rawX + dX).coerceIn(0f, (parent.width - view.width).toFloat())
                    val newY = (event.rawY + dY).coerceIn(0f, (parent.height - view.height).toFloat())
                    view.animate()
                        .x(newX)
                        .y(newY)
                        .setDuration(0)
                        .start()
                    true
                }
                MotionEvent.ACTION_UP -> {
                    val diffX = Math.abs(event.rawX - startX)
                    val diffY = Math.abs(event.rawY - startY)
                    if (diffX < touchSlop && diffY < touchSlop) {
                        // Tapped: open Assistant!
                        val intent = Intent(this, com.medical.clinic.ui.assistant.ClinicalAssistantActivity::class.java)
                        startActivity(intent)
                    } else {
                        // Dragged: smoothly snap to nearest edge
                        val parent = view.parent as? View
                        if (parent != null) {
                            val midX = parent.width / 2f
                            val targetX = if (view.x + view.width / 2f < midX) 24f else (parent.width - view.width - 24f)
                            view.animate()
                                .x(targetX)
                                .setDuration(250)
                                .setInterpolator(android.view.animation.OvershootInterpolator(1.2f))
                                .start()
                        }
                    }
                    true
                }
                else -> false
            }
        }
    }
`;

  const lastBrace = mainCode.lastIndexOf('}');
  mainCode = mainCode.slice(0, lastBrace) + bubbleLogic + '\n}\n';
  fs.writeFileSync(mainPath, mainCode.replace(/\n/g, '\r\n'), 'utf8');
  console.log('✅ Added setupDraggableAiBubble to MainActivity.kt');
}
