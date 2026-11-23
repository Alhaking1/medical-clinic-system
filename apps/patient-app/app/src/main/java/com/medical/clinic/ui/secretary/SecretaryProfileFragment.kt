package com.medical.clinic.ui.secretary

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import com.medical.clinic.R
import com.medical.clinic.ui.auth.CompleteSecretaryProfileActivity
import com.medical.clinic.ui.auth.RoleSelectionActivity
import com.medical.clinic.ui.base.BaseFragment
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class SecretaryProfileFragment : BaseFragment() {

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_secretary_profile, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val user = sessionManager.getUser()

        view.findViewById<TextView>(R.id.tvName).text = user?.fullName?.ifEmpty { "—" } ?: "—"
        view.findViewById<TextView>(R.id.tvEmail).text = "📧 ${user?.email ?: "—"}"
        view.findViewById<TextView>(R.id.tvPhone).text = "📱 ${user?.phone ?: "—"}"
        view.findViewById<TextView>(R.id.tvClinic).text = "🏥 ${user?.clinicName ?: "—"}"

        updateProfileBanner(view)

        view.findViewById<Button>(R.id.btnLogout).setOnClickListener {
            sessionManager.logout()
            val intent = Intent(requireContext(), RoleSelectionActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
            requireActivity().finish()
        }
    }

    override fun onResume() {
        super.onResume()
        view?.let { updateProfileBanner(it) }
    }

    private fun updateProfileBanner(view: View) {
        val banner = view.findViewById<View>(R.id.bannerPending)
        val tvTitle = view.findViewById<TextView>(R.id.tvPendingTitle)
        val tvHint = view.findViewById<TextView>(R.id.tvPendingHint)
        val progressPending = view.findViewById<View>(R.id.progressPending)
        val btnComplete = view.findViewById<Button>(R.id.btnCompleteProfile)

        val user = sessionManager.getUser()
        val mustComplete = user?.mustCompleteProfile == true

        when {
            // 1) لم يُكمل الملف
            mustComplete -> {
                banner.visibility = View.VISIBLE
                tvTitle.text = "⚠️ أكمل بياناتك للتوثيق"
                tvHint.text = "أكمل بياناتك للاستفادة من التطبيق"
                progressPending.visibility = View.GONE
                btnComplete.visibility = View.VISIBLE
            }
            // 2) قيد المراجعة (سكرتيرة → الإدارة فقط)
            user?.status == "pending" -> {
                banner.visibility = View.VISIBLE
                tvTitle.text = "⏳ حسابك قيد المراجعة"
                tvHint.text = "سيتم تأكيد حسابك من قبل الإدارة"
                progressPending.visibility = View.VISIBLE
                btnComplete.visibility = View.GONE
            }
            // 3) مرفوض
            user?.status == "rejected" -> {
                banner.visibility = View.VISIBLE
                tvTitle.text = "❌ تم رفض حسابك"
                tvHint.text = "تواصل مع الإدارة"
                progressPending.visibility = View.GONE
                btnComplete.visibility = View.GONE
            }
            // 4) معتمد
            else -> {
                banner.visibility = View.GONE
            }
        }

        btnComplete.setOnClickListener {
            startActivity(Intent(requireContext(), CompleteSecretaryProfileActivity::class.java))
        }
    }
}