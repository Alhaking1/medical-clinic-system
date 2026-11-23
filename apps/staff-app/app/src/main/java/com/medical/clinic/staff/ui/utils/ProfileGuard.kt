package com.medical.clinic.staff.ui.utils

import android.content.Context
import android.content.Intent
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.medical.clinic.staff.data.local.SessionManager
import com.medical.clinic.staff.data.utils.Constants
import com.medical.clinic.staff.ui.auth.CompleteDoctorProfileActivity
import com.medical.clinic.staff.ui.auth.CompleteSecretaryProfileActivity

object ProfileGuard {

    fun checkOrPrompt(
        context: Context,
        sessionManager: SessionManager,
        onAllowed: () -> Unit
    ) {
        val user = sessionManager.getUser()
        if (sessionManager.isGuestMode() || sessionManager.mustCompleteProfile()) {
            val role = sessionManager.getRole() ?: Constants.ROLE_DOCTOR
            val isDoctor = role == Constants.ROLE_DOCTOR

            MaterialAlertDialogBuilder(context)
                .setTitle("⚠️ إكمال الملف المهني مطلوب")
                .setMessage("أنت تتصفح التطبيق حالياً في وضع التجربة السريعة.\n\nلتنفيذ هذه العملية وحفظ البيانات، يرجى إكمال ملفك المهني أولاً.")
                .setPositiveButton("إكمال الملف الآن 📝") { _, _ ->
                    val intent = if (isDoctor) {
                        Intent(context, CompleteDoctorProfileActivity::class.java).apply {
                            putExtra("is_guest", true)
                            putExtra(Constants.EXTRA_ROLE, Constants.ROLE_DOCTOR)
                        }
                    } else {
                        Intent(context, CompleteSecretaryProfileActivity::class.java).apply {
                            putExtra("is_guest", true)
                            putExtra(Constants.EXTRA_ROLE, Constants.ROLE_SECRETARY)
                        }
                    }
                    context.startActivity(intent)
                }
                .setNegativeButton("لاحقاً", null)
                .show()
        } else if (user?.status == Constants.STATUS_PENDING) {
            MaterialAlertDialogBuilder(context)
                .setTitle("⏳ الحساب قيد المراجعة والاعتماد")
                .setMessage("تم استلام بياناتك بنجاح وحسابك قيد المراجعة والاعتماد من قبل إدارة المنظومة.\n\nيمكنك تصفح كافة أقسام التطبيق بحرية، وسيتم تفعيل الإجراءات التشغيلية فور اعتماد الحساب.")
                .setPositiveButton("حسناً", null)
                .show()
        } else {
            onAllowed()
        }
    }
}
