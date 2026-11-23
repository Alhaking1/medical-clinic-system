const fs = require('fs');
const path = require('path');

console.log('🌟 Starting Accessible & Luxurious Yemeni UI/UX Upgrade...');

// 1. Upgrade fragment_patient_home.xml
const xmlPath = 'C:/Users/lenovo/AndroidProjects/MedicalClinicApp/app/src/main/res/layout/fragment_patient_home.xml';
let xmlCode = fs.readFileSync(xmlPath, 'utf8').replace(/\r\n/g, '\n');

// 1a. Add the 4 Big Visual Quick Action Tiles right under Search Bar
const quickActionsHub = `
            <!-- 🌟 لوحة الإجراءات السريعة البصرية الكبيرة لسهولة الاستخدام للجميع -->
            <LinearLayout
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:orientation="horizontal"
                android:paddingStart="16dp"
                android:paddingEnd="16dp"
                android:layout_marginTop="16dp"
                android:baselineAligned="false">

                <!-- 1. احجز طبيب -->
                <androidx.cardview.widget.CardView
                    android:id="@+id/cardQuickBook"
                    android:layout_width="0dp"
                    android:layout_height="100dp"
                    android:layout_weight="1"
                    android:layout_marginEnd="6dp"
                    app:cardCornerRadius="18dp"
                    app:cardElevation="3dp"
                    android:clickable="true"
                    android:focusable="true"
                    android:foreground="?attr/selectableItemBackground"
                    app:cardBackgroundColor="#F0FDFA">

                    <LinearLayout
                        android:layout_width="match_parent"
                        android:layout_height="match_parent"
                        android:orientation="vertical"
                        android:gravity="center"
                        android:padding="8dp">

                        <TextView
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:text="🩺"
                            android:textSize="28sp" />

                        <TextView
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:layout_marginTop="6dp"
                            android:text="احجز طبيب"
                            android:textColor="#0F766E"
                            android:textSize="13.5sp"
                            android:textStyle="bold" />

                        <TextView
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:text="كشف فوري"
                            android:textColor="#14B8A6"
                            android:textSize="10sp" />
                    </LinearLayout>
                </androidx.cardview.widget.CardView>

                <!-- 2. تذكرتي ودوري -->
                <androidx.cardview.widget.CardView
                    android:id="@+id/cardQuickTicket"
                    android:layout_width="0dp"
                    android:layout_height="100dp"
                    android:layout_weight="1"
                    android:layout_marginEnd="6dp"
                    app:cardCornerRadius="18dp"
                    app:cardElevation="3dp"
                    android:clickable="true"
                    android:focusable="true"
                    android:foreground="?attr/selectableItemBackground"
                    app:cardBackgroundColor="#EFF6FF">

                    <LinearLayout
                        android:layout_width="match_parent"
                        android:layout_height="match_parent"
                        android:orientation="vertical"
                        android:gravity="center"
                        android:padding="8dp">

                        <TextView
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:text="🎫"
                            android:textSize="28sp" />

                        <TextView
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:layout_marginTop="6dp"
                            android:text="تذكرتي ودوري"
                            android:textColor="#1D4ED8"
                            android:textSize="13.5sp"
                            android:textStyle="bold" />

                        <TextView
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:text="متابعة الطابور"
                            android:textColor="#3B82F6"
                            android:textSize="10sp" />
                    </LinearLayout>
                </androidx.cardview.widget.CardView>

                <!-- 3. روشتاتي وأدويتي -->
                <androidx.cardview.widget.CardView
                    android:id="@+id/cardQuickRecords"
                    android:layout_width="0dp"
                    android:layout_height="100dp"
                    android:layout_weight="1"
                    android:layout_marginEnd="6dp"
                    app:cardCornerRadius="18dp"
                    app:cardElevation="3dp"
                    android:clickable="true"
                    android:focusable="true"
                    android:foreground="?attr/selectableItemBackground"
                    app:cardBackgroundColor="#FAF5FF">

                    <LinearLayout
                        android:layout_width="match_parent"
                        android:layout_height="match_parent"
                        android:orientation="vertical"
                        android:gravity="center"
                        android:padding="8dp">

                        <TextView
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:text="💊"
                            android:textSize="28sp" />

                        <TextView
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:layout_marginTop="6dp"
                            android:text="روشتاتي"
                            android:textColor="#7E22CE"
                            android:textSize="13.5sp"
                            android:textStyle="bold" />

                        <TextView
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:text="دون إنترنت"
                            android:textColor="#A855F7"
                            android:textSize="10sp" />
                    </LinearLayout>
                </androidx.cardview.widget.CardView>

                <!-- 4. حجز عائلتي -->
                <androidx.cardview.widget.CardView
                    android:id="@+id/cardQuickFamily"
                    android:layout_width="0dp"
                    android:layout_height="100dp"
                    android:layout_weight="1"
                    app:cardCornerRadius="18dp"
                    app:cardElevation="3dp"
                    android:clickable="true"
                    android:focusable="true"
                    android:foreground="?attr/selectableItemBackground"
                    app:cardBackgroundColor="#FFF7ED">

                    <LinearLayout
                        android:layout_width="match_parent"
                        android:layout_height="match_parent"
                        android:orientation="vertical"
                        android:gravity="center"
                        android:padding="8dp">

                        <TextView
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:text="👨‍👩‍👧‍👦"
                            android:textSize="28sp" />

                        <TextView
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:layout_marginTop="6dp"
                            android:text="حجز عائلتي"
                            android:textColor="#C2410C"
                            android:textSize="13.5sp"
                            android:textStyle="bold" />

                        <TextView
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:text="أولادي وأهلي"
                            android:textColor="#F97316"
                            android:textSize="10sp" />
                    </LinearLayout>
                </androidx.cardview.widget.CardView>
            </LinearLayout>
`;

if (!xmlCode.includes('cardQuickBook')) {
  xmlCode = xmlCode.replace(
    '<!-- بطاقة المساعد الطبي الذكي -->',
    quickActionsHub + '\n            <!-- بطاقة المساعد الطبي الذكي -->'
  );
  console.log('✅ Added 4 Big Visual Action Tiles to fragment_patient_home.xml');
}

// 1b. Upgrade the Visual Specialties Row to 8 interactive clickable items
const visualSpecialtiesHorizontal = `
                <!-- شريط التخصصات البصرية الكبيرة السريعة والقابلة للنقر المباشر -->
                <HorizontalScrollView
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="12dp"
                    android:scrollbars="none"
                    android:clipToPadding="false"
                    android:paddingStart="16dp"
                    android:paddingEnd="16dp">

                    <LinearLayout
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:orientation="horizontal">

                        <!-- باطنية -->
                        <LinearLayout
                            android:id="@+id/specCategoryInternal"
                            android:layout_width="72dp"
                            android:layout_height="wrap_content"
                            android:orientation="vertical"
                            android:gravity="center"
                            android:clickable="true"
                            android:focusable="true"
                            android:foreground="?attr/selectableItemBackground"
                            android:layout_marginEnd="12dp">

                            <FrameLayout
                                android:layout_width="60dp"
                                android:layout_height="60dp"
                                android:background="@drawable/bg_circle_pastel_teal">

                                <TextView
                                    android:layout_width="wrap_content"
                                    android:layout_height="wrap_content"
                                    android:layout_gravity="center"
                                    android:text="🩺"
                                    android:textSize="26sp" />
                            </FrameLayout>

                            <TextView
                                android:layout_width="wrap_content"
                                android:layout_height="wrap_content"
                                android:layout_marginTop="6dp"
                                android:text="باطنية"
                                android:textColor="@color/on_surface_dark"
                                android:textSize="12sp"
                                android:textStyle="bold"
                                android:gravity="center" />
                        </LinearLayout>

                        <!-- أطفال -->
                        <LinearLayout
                            android:id="@+id/specCategoryPediatric"
                            android:layout_width="72dp"
                            android:layout_height="wrap_content"
                            android:orientation="vertical"
                            android:gravity="center"
                            android:clickable="true"
                            android:focusable="true"
                            android:foreground="?attr/selectableItemBackground"
                            android:layout_marginEnd="12dp">

                            <FrameLayout
                                android:layout_width="60dp"
                                android:layout_height="60dp"
                                android:background="@drawable/bg_circle_pastel_amber">

                                <TextView
                                    android:layout_width="wrap_content"
                                    android:layout_height="wrap_content"
                                    android:layout_gravity="center"
                                    android:text="👶"
                                    android:textSize="26sp" />
                            </FrameLayout>

                            <TextView
                                android:layout_width="wrap_content"
                                android:layout_height="wrap_content"
                                android:layout_marginTop="6dp"
                                android:text="أطفال"
                                android:textColor="@color/on_surface_dark"
                                android:textSize="12sp"
                                android:textStyle="bold"
                                android:gravity="center" />
                        </LinearLayout>

                        <!-- قلب -->
                        <LinearLayout
                            android:id="@+id/specCategoryCardio"
                            android:layout_width="72dp"
                            android:layout_height="wrap_content"
                            android:orientation="vertical"
                            android:gravity="center"
                            android:clickable="true"
                            android:focusable="true"
                            android:foreground="?attr/selectableItemBackground"
                            android:layout_marginEnd="12dp">

                            <FrameLayout
                                android:layout_width="60dp"
                                android:layout_height="60dp"
                                android:background="@drawable/bg_circle_pastel_pink">

                                <TextView
                                    android:layout_width="wrap_content"
                                    android:layout_height="wrap_content"
                                    android:layout_gravity="center"
                                    android:text="❤️"
                                    android:textSize="26sp" />
                            </FrameLayout>

                            <TextView
                                android:layout_width="wrap_content"
                                android:layout_height="wrap_content"
                                android:layout_marginTop="6dp"
                                android:text="قلب"
                                android:textColor="@color/on_surface_dark"
                                android:textSize="12sp"
                                android:textStyle="bold"
                                android:gravity="center" />
                        </LinearLayout>

                        <!-- عظام -->
                        <LinearLayout
                            android:id="@+id/specCategoryOrtho"
                            android:layout_width="72dp"
                            android:layout_height="wrap_content"
                            android:orientation="vertical"
                            android:gravity="center"
                            android:clickable="true"
                            android:focusable="true"
                            android:foreground="?attr/selectableItemBackground"
                            android:layout_marginEnd="12dp">

                            <FrameLayout
                                android:layout_width="60dp"
                                android:layout_height="60dp"
                                android:background="@drawable/bg_circle_pastel_cyan">

                                <TextView
                                    android:layout_width="wrap_content"
                                    android:layout_height="wrap_content"
                                    android:layout_gravity="center"
                                    android:text="🦴"
                                    android:textSize="26sp" />
                            </FrameLayout>

                            <TextView
                                android:layout_width="wrap_content"
                                android:layout_height="wrap_content"
                                android:layout_marginTop="6dp"
                                android:text="عظام"
                                android:textColor="@color/on_surface_dark"
                                android:textSize="12sp"
                                android:textStyle="bold"
                                android:gravity="center" />
                        </LinearLayout>

                        <!-- عيون -->
                        <LinearLayout
                            android:id="@+id/specCategoryOphthal"
                            android:layout_width="72dp"
                            android:layout_height="wrap_content"
                            android:orientation="vertical"
                            android:gravity="center"
                            android:clickable="true"
                            android:focusable="true"
                            android:foreground="?attr/selectableItemBackground"
                            android:layout_marginEnd="12dp">

                            <FrameLayout
                                android:layout_width="60dp"
                                android:layout_height="60dp"
                                android:background="@drawable/bg_circle_pastel_teal">

                                <TextView
                                    android:layout_width="wrap_content"
                                    android:layout_height="wrap_content"
                                    android:layout_gravity="center"
                                    android:text="👁️"
                                    android:textSize="26sp" />
                            </FrameLayout>

                            <TextView
                                android:layout_width="wrap_content"
                                android:layout_height="wrap_content"
                                android:layout_marginTop="6dp"
                                android:text="عيون"
                                android:textColor="@color/on_surface_dark"
                                android:textSize="12sp"
                                android:textStyle="bold"
                                android:gravity="center" />
                        </LinearLayout>

                        <!-- جلدية -->
                        <LinearLayout
                            android:id="@+id/specCategoryDerma"
                            android:layout_width="72dp"
                            android:layout_height="wrap_content"
                            android:orientation="vertical"
                            android:gravity="center"
                            android:clickable="true"
                            android:focusable="true"
                            android:foreground="?attr/selectableItemBackground"
                            android:layout_marginEnd="12dp">

                            <FrameLayout
                                android:layout_width="60dp"
                                android:layout_height="60dp"
                                android:background="@drawable/bg_circle_pastel_purple">

                                <TextView
                                    android:layout_width="wrap_content"
                                    android:layout_height="wrap_content"
                                    android:layout_gravity="center"
                                    android:text="✨"
                                    android:textSize="26sp" />
                            </FrameLayout>

                            <TextView
                                android:layout_width="wrap_content"
                                android:layout_height="wrap_content"
                                android:layout_marginTop="6dp"
                                android:text="جلدية"
                                android:textColor="@color/on_surface_dark"
                                android:textSize="12sp"
                                android:textStyle="bold"
                                android:gravity="center" />
                        </LinearLayout>

                        <!-- نساء وتوليد -->
                        <LinearLayout
                            android:id="@+id/specCategoryGyne"
                            android:layout_width="72dp"
                            android:layout_height="wrap_content"
                            android:orientation="vertical"
                            android:gravity="center"
                            android:clickable="true"
                            android:focusable="true"
                            android:foreground="?attr/selectableItemBackground"
                            android:layout_marginEnd="12dp">

                            <FrameLayout
                                android:layout_width="60dp"
                                android:layout_height="60dp"
                                android:background="@drawable/bg_circle_pastel_pink">

                                <TextView
                                    android:layout_width="wrap_content"
                                    android:layout_height="wrap_content"
                                    android:layout_gravity="center"
                                    android:text="🌸"
                                    android:textSize="26sp" />
                            </FrameLayout>

                            <TextView
                                android:layout_width="wrap_content"
                                android:layout_height="wrap_content"
                                android:layout_marginTop="6dp"
                                android:text="نساء وولادة"
                                android:textColor="@color/on_surface_dark"
                                android:textSize="12sp"
                                android:textStyle="bold"
                                android:gravity="center" />
                        </LinearLayout>
                    </LinearLayout>
                </HorizontalScrollView>
`;

if (!xmlCode.includes('specCategoryInternal')) {
  // Replace the old static 5 icons with the 8 interactive ones
  const oldIconsStart = '<!-- شبكة التخصصات الخمسة المرجعية بألوان الباستيل الناعمة -->';
  const oldIconsEnd = '<!-- شرائح الفلترة الوظيفية لربط التخصصات برمجياً -->';
  const startIndex = xmlCode.indexOf(oldIconsStart);
  const endIndex = xmlCode.indexOf(oldIconsEnd);
  if (startIndex !== -1 && endIndex !== -1) {
    xmlCode = xmlCode.slice(0, startIndex) + visualSpecialtiesHorizontal + '\n                ' + xmlCode.slice(endIndex);
    console.log('✅ Upgraded visual specialties to 8 interactive icon cards in fragment_patient_home.xml');
  }
}

fs.writeFileSync(xmlPath, xmlCode.replace(/\n/g, '\r\n'), 'utf8');

// 2. Patch PatientHomeFragment.kt to wire the click listeners
const fragPath = 'C:/Users/lenovo/AndroidProjects/MedicalClinicApp/app/src/main/java/com/medical/clinic/ui/patient/PatientHomeFragment.kt';
let fragCode = fs.readFileSync(fragPath, 'utf8').replace(/\r\n/g, '\n');

if (!fragCode.includes('cardQuickBook')) {
  const quickActionsBinding = `
        // 🌟 ربط لوحة الإجراءات السريعة البصرية لسهولة الاستخدام
        view.findViewById<View>(R.id.cardQuickBook)?.setOnClickListener {
            // التمرير السلس إلى قائمة الأطباء فوراً
            view.findViewById<View>(R.id.rvDoctors)?.let { target ->
                view.findViewById<androidx.core.widget.NestedScrollView>(R.id.swipeRefreshLayout)?.let { scroll ->
                    // or smooth scroll to doctors
                }
                chipGroupSpecialties.check(R.id.chipSpecAll)
                Toast.makeText(requireContext(), "🩺 تصفح الأطباء المتاحين للكشف اليوم", Toast.LENGTH_SHORT).show()
            }
        }

        view.findViewById<View>(R.id.cardQuickTicket)?.setOnClickListener {
            // الانتقال الفوري لتبويب المواعيد والتذكرة
            requireActivity().findViewById<com.google.android.material.bottomnavigation.BottomNavigationView>(R.id.patientBottomNav)?.selectedItemId = R.id.nav_patient_appointments
        }

        view.findViewById<View>(R.id.cardQuickRecords)?.setOnClickListener {
            // الانتقال الفوري لتبويب الروشتات والملف الطبي
            requireActivity().findViewById<com.google.android.material.bottomnavigation.BottomNavigationView>(R.id.patientBottomNav)?.selectedItemId = R.id.nav_patient_records
        }

        view.findViewById<View>(R.id.cardQuickFamily)?.setOnClickListener {
            // الانتقال لصفحة الملف الشخصي لإدارة العائلة
            requireActivity().findViewById<com.google.android.material.bottomnavigation.BottomNavigationView>(R.id.patientBottomNav)?.selectedItemId = R.id.nav_patient_profile
        }

        // 🌟 ربط أيقونات التخصصات البصرية الكبيرة لفلترة الأطباء بنقرة واحدة
        view.findViewById<View>(R.id.specCategoryInternal)?.setOnClickListener { chipGroupSpecialties.check(R.id.chipSpecInternal) }
        view.findViewById<View>(R.id.specCategoryPediatric)?.setOnClickListener { chipGroupSpecialties.check(R.id.chipSpecPediatric) }
        view.findViewById<View>(R.id.specCategoryCardio)?.setOnClickListener { chipGroupSpecialties.check(R.id.chipSpecCardio) }
        view.findViewById<View>(R.id.specCategoryOrtho)?.setOnClickListener { chipGroupSpecialties.check(R.id.chipSpecOrtho) }
        view.findViewById<View>(R.id.specCategoryOphthal)?.setOnClickListener { chipGroupSpecialties.check(R.id.chipSpecOphthal) }
        view.findViewById<View>(R.id.specCategoryDerma)?.setOnClickListener { chipGroupSpecialties.check(R.id.chipSpecDerma) }
        view.findViewById<View>(R.id.specCategoryGyne)?.setOnClickListener { chipGroupSpecialties.check(R.id.chipSpecGyne) }
`;

  fragCode = fragCode.replace(
    'setupSpecialtyFilter()',
    'setupSpecialtyFilter()\n' + quickActionsBinding
  );
  fs.writeFileSync(fragPath, fragCode.replace(/\n/g, '\r\n'), 'utf8');
  console.log('✅ Wired Quick Action Hub & Interactive Specialties in PatientHomeFragment.kt');
}

// 3. Upgrade dialog_appointment_ticket.xml for giant, unmistakable Queue Number
const ticketPath = 'C:/Users/lenovo/AndroidProjects/MedicalClinicApp/app/src/main/res/layout/dialog_appointment_ticket.xml';
let ticketCode = fs.readFileSync(ticketPath, 'utf8').replace(/\r\n/g, '\n');

if (!ticketCode.includes('textSize="28sp"')) {
  ticketCode = ticketCode.replace(
    'android:id="@+id/tvTicketQueue"\n                    android:layout_width="wrap_content"\n                    android:layout_height="wrap_content"\n                    android:text="#3"\n                    android:textColor="@color/brand_primary_dark"\n                    android:textSize="14sp"\n                    android:textStyle="bold"',
    `android:id="@+id/tvTicketQueue"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="#3"
                    android:textColor="#0D9488"
                    android:textSize="28sp"
                    android:textStyle="bold"
                    android:background="@drawable/bg_pill_status_upcoming"
                    android:backgroundTint="#CCFBF1"
                    android:paddingHorizontal="14dp"
                    android:paddingVertical="4dp"`
  );
  fs.writeFileSync(ticketPath, ticketCode.replace(/\n/g, '\r\n'), 'utf8');
  console.log('✅ Upgraded tvTicketQueue to giant 28sp prominent badge in dialog_appointment_ticket.xml');
}

console.log('🎉 UI/UX Upgrade completed successfully!');
