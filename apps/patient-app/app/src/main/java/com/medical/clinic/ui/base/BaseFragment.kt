package com.medical.clinic.ui.base

import android.content.Intent
import android.widget.Toast
import androidx.fragment.app.Fragment
import com.medical.clinic.data.local.SessionManager
import com.medical.clinic.ui.auth.CompleteDoctorProfileActivity
import com.medical.clinic.ui.auth.CompleteSecretaryProfileActivity
import javax.inject.Inject

/**
 * BaseFragment — يوفر:
 * 1. sessionManager (مشترك)
 * 2. requireCompleteProfile() — حماية العمليات
 * 3. isProfileComplete() / isAccountApproved()
 */
abstract class BaseFragment : Fragment() {

    @Inject
    lateinit var sessionManager: SessionManager

    /**
     * ينفّذ action فقط إذا:
     * - الملف مكتمل
     * - الحساب معتمد
     *
     * خلاف ذلك:
     * - يُوجّه إلى CompleteProfile (إذا must_complete_profile = true)
     * - يعرض Toast "يرجى الانتظار" (إذا pending)
     */
    protected fun requireCompleteProfile(action: () -> Unit) {
        val user = sessionManager.getUser()
        
        when {
            // 1) لم يُكمل الملف
            user?.mustCompleteProfile == true -> {
                Toast.makeText(
                    requireContext(),
                    "يرجى إكمال بياناتك أولاً",
                    Toast.LENGTH_LONG
                ).show()
                
                val intent = if (user.isDoctor) {
                    Intent(requireContext(), CompleteDoctorProfileActivity::class.java)
                } else {
                    Intent(requireContext(), CompleteSecretaryProfileActivity::class.java)
                }
                startActivity(intent)
            }
            
            // 2) الحساب قيد المراجعة
            user?.status == "pending" -> {
                Toast.makeText(
                    requireContext(),
                    "يرجى الانتظار حتى يتم مراجعة حسابك",
                    Toast.LENGTH_LONG
                ).show()
            }
            
            // 3) الحساب معتمد → نفّذ
            else -> action()
        }
    }

    /**
     * هل الملف الشخصي مكتمل؟
     */
    protected fun isProfileComplete(): Boolean {
        return sessionManager.getUser()?.mustCompleteProfile == false
    }

    /**
     * هل الحساب معتمد؟
     */
    protected fun isAccountApproved(): Boolean {
        return sessionManager.getUser()?.status == "approved"
    }

    /**
     * هل الحساب قيد المراجعة؟
     */
    protected fun isAccountPending(): Boolean {
        return sessionManager.getUser()?.status == "pending"
    }
}