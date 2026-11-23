const fs = require('fs');

// 1. Patch fragment_patient_home.xml
const xmlPath = 'C:/Users/lenovo/AndroidProjects/MedicalClinicApp/app/src/main/res/layout/fragment_patient_home.xml';
let xmlCode = fs.readFileSync(xmlPath, 'utf8').replace(/\r\n/g, '\n');

if (!xmlCode.includes('btnHeaderAssistant')) {
  const headerBtnAssistant = `
                        <!-- زر المساعد الطبي الذكي -->
                        <FrameLayout
                            android:id="@+id/btnHeaderAssistant"
                            android:layout_width="42dp"
                            android:layout_height="42dp"
                            android:layout_marginEnd="8dp"
                            android:background="@drawable/bg_circle_primary"
                            android:backgroundTint="#33FFFFFF"
                            android:clickable="true"
                            android:focusable="true">

                            <TextView
                                android:layout_width="wrap_content"
                                android:layout_height="wrap_content"
                                android:layout_gravity="center"
                                android:text="🤖"
                                android:textSize="18sp" />
                        </FrameLayout>
`;

  xmlCode = xmlCode.replace(
    '<!-- زر المحادثات المباشرة -->',
    headerBtnAssistant + '\n                        <!-- زر المحادثات المباشرة -->'
  );
  console.log('✅ Added btnHeaderAssistant to header in fragment_patient_home.xml');
}

if (!xmlCode.includes('cardAiAssistant')) {
  const assistantCard = `
            <!-- بطاقة المساعد الطبي الذكي -->
            <androidx.cardview.widget.CardView
                android:id="@+id/cardAiAssistant"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:layout_marginStart="16dp"
                android:layout_marginEnd="16dp"
                android:layout_marginTop="12dp"
                android:layout_marginBottom="6dp"
                app:cardCornerRadius="16dp"
                app:cardElevation="2dp"
                android:clickable="true"
                android:focusable="true"
                android:foreground="?attr/selectableItemBackground"
                app:cardBackgroundColor="#F0FDF4">

                <LinearLayout
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:orientation="horizontal"
                    android:gravity="center_vertical"
                    android:padding="14dp">

                    <TextView
                        android:layout_width="44dp"
                        android:layout_height="44dp"
                        android:gravity="center"
                        android:background="@drawable/bg_circle_primary"
                        android:backgroundTint="#DCFCE7"
                        android:text="🤖"
                        android:textSize="22sp" />

                    <LinearLayout
                        android:layout_width="0dp"
                        android:layout_height="wrap_content"
                        android:layout_weight="1"
                        android:orientation="vertical"
                        android:paddingStart="12dp"
                        android:paddingEnd="12dp">

                        <TextView
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:text="المساعد الطبي ومرشد التطبيق 🤖"
                            android:textColor="#166534"
                            android:textSize="14.5sp"
                            android:textStyle="bold" />

                        <TextView
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:text="فحص وتوجيه الأعراض للتخصص المناسب، وشرح ميزات التطبيق"
                            android:textColor="#15803D"
                            android:textSize="11.5sp"
                            android:layout_marginTop="2dp" />
                    </LinearLayout>

                    <TextView
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:text="ابدأ ❯"
                        android:textColor="#16A34A"
                        android:textSize="12sp"
                        android:textStyle="bold" />
                </LinearLayout>
            </androidx.cardview.widget.CardView>
`;

  xmlCode = xmlCode.replace(
    '<!-- 3. بطاقة الطوارئ الطبية السريعة (195) -->',
    assistantCard + '\n            <!-- 3. بطاقة الطوارئ الطبية السريعة (195) -->'
  );
  console.log('✅ Added cardAiAssistant to fragment_patient_home.xml');
}

fs.writeFileSync(xmlPath, xmlCode.replace(/\n/g, '\r\n'), 'utf8');

// 2. Patch PatientHomeFragment.kt
const fragPath = 'C:/Users/lenovo/AndroidProjects/MedicalClinicApp/app/src/main/java/com/medical/clinic/ui/patient/PatientHomeFragment.kt';
let fragCode = fs.readFileSync(fragPath, 'utf8').replace(/\r\n/g, '\n');

if (!fragCode.includes('ClinicalAssistantActivity')) {
  // Add import
  fragCode = fragCode.replace(
    'import com.medical.clinic.ui.chat.PatientConversationsActivity',
    'import com.medical.clinic.ui.chat.PatientConversationsActivity\nimport com.medical.clinic.ui.assistant.ClinicalAssistantActivity'
  );

  // Wire click listeners
  const openAssistantLogic = `
        val openAssistantAction = View.OnClickListener {
            val intent = Intent(requireContext(), ClinicalAssistantActivity::class.java)
            startActivity(intent)
        }
        view.findViewById<View>(R.id.btnHeaderAssistant)?.setOnClickListener(openAssistantAction)
        view.findViewById<View>(R.id.cardAiAssistant)?.setOnClickListener(openAssistantAction)
`;

  fragCode = fragCode.replace(
    'view.findViewById<View>(R.id.btnHeaderChat)?.setOnClickListener {',
    openAssistantLogic + '\n        view.findViewById<View>(R.id.btnHeaderChat)?.setOnClickListener {'
  );

  fs.writeFileSync(fragPath, fragCode.replace(/\n/g, '\r\n'), 'utf8');
  console.log('✅ Wired openAssistantAction in PatientHomeFragment.kt');
} else {
  console.log('ℹ️ ClinicalAssistantActivity already referenced in PatientHomeFragment.kt');
}
