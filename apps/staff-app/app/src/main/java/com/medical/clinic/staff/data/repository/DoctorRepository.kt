package com.medical.clinic.staff.data.repository

import com.medical.clinic.staff.data.api.ApiService
import com.medical.clinic.staff.data.models.*
import com.medical.clinic.staff.data.utils.Resource
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DoctorRepository @Inject constructor(
    private val api: ApiService
) {

    suspend fun getQueue(doctorId: Int, date: String? = null, status: String? = null): Resource<List<DoctorQueueItem>> =
        withContext(Dispatchers.IO) {
            try {
                val res = api.getDoctorQueue(doctorId, date, status)
                if (res.isSuccessful && res.body()?.success == true) {
                    Resource.Success(res.body()?.data ?: emptyList())
                } else {
                    val err = parseErrorMessage(res.errorBody()?.string()) ?: res.body()?.message ?: "فشل جلب الطابور"
                    Resource.Error(err)
                }
            } catch (e: Exception) {
                Resource.Error(com.medical.clinic.staff.data.utils.ErrorMapper.fromException(e))
            }
        }

    suspend fun getStats(doctorId: Int): Resource<DoctorStatsData> =
        withContext(Dispatchers.IO) {
            try {
                val res = api.getDoctorStats(doctorId)
                if (res.isSuccessful && res.body()?.success == true && res.body()?.data != null) {
                    Resource.Success(res.body()!!.data!!)
                } else {
                    val err = parseErrorMessage(res.errorBody()?.string()) ?: res.body()?.message ?: "فشل جلب الإحصائيات"
                    Resource.Error(err)
                }
            } catch (e: Exception) {
                Resource.Error(com.medical.clinic.staff.data.utils.ErrorMapper.fromException(e))
            }
        }

    suspend fun updateQueueStatus(queueId: Int, newStatus: String): Resource<DoctorQueueItem> =
        withContext(Dispatchers.IO) {
            try {
                val res = api.updateQueueStatus(queueId, UpdateQueueStatusRequest(newStatus))
                if (res.isSuccessful && res.body()?.success == true && res.body()?.data != null) {
                    Resource.Success(res.body()!!.data!!, res.body()?.message)
                } else {
                    val err = parseErrorMessage(res.errorBody()?.string()) ?: res.body()?.message ?: "فشل تحديث الحالة"
                    Resource.Error(err)
                }
            } catch (e: Exception) {
                Resource.Error(com.medical.clinic.staff.data.utils.ErrorMapper.fromException(e))
            }
        }

    suspend fun addPatientToQueue(doctorId: Int, name: String, phone: String?): Resource<DoctorQueueItem> =
        withContext(Dispatchers.IO) {
            try {
                val res = api.addPatientToQueue(AddQueuePatientRequest(doctorId, name, phone))
                if (res.isSuccessful && res.body()?.success == true && res.body()?.data != null) {
                    Resource.Success(res.body()!!.data!!, res.body()?.message)
                } else {
                    val err = parseErrorMessage(res.errorBody()?.string()) ?: res.body()?.message ?: "فشل إضافة المريض"
                    Resource.Error(err)
                }
            } catch (e: Exception) {
                Resource.Error(com.medical.clinic.staff.data.utils.ErrorMapper.fromException(e))
            }
        }

    suspend fun createPrescription(req: CreatePrescriptionRequest): Resource<PrescriptionResponseData> =
        withContext(Dispatchers.IO) {
            try {
                val res = api.createPrescription(req)
                if (res.isSuccessful && res.body()?.success == true && res.body()?.data != null) {
                    Resource.Success(res.body()!!.data!!, res.body()?.message)
                } else {
                    val err = parseErrorMessage(res.errorBody()?.string()) ?: res.body()?.message ?: "فشل حفظ الروشتة"
                    Resource.Error(err)
                }
            } catch (e: Exception) {
                Resource.Error(com.medical.clinic.staff.data.utils.ErrorMapper.fromException(e))
            }
        }

    suspend fun downloadPrescriptionPdf(prescriptionId: Int): Resource<okhttp3.ResponseBody> =
        withContext(Dispatchers.IO) {
            try {
                val res = api.downloadPrescriptionPdf(prescriptionId)
                if (res.isSuccessful && res.body() != null) {
                    Resource.Success(res.body()!!)
                } else {
                    val err = parseErrorMessage(res.errorBody()?.string()) ?: "فشل تحميل ملف الروشتة PDF"
                    Resource.Error(err)
                }
            } catch (e: Exception) {
                Resource.Error(com.medical.clinic.staff.data.utils.ErrorMapper.fromException(e))
            }
        }

    suspend fun getMedications(search: String? = null): Resource<List<com.medical.clinic.staff.data.models.MedicationBankItem>> =
        withContext(Dispatchers.IO) {
            try {
                val res = api.getMedications(search)
                if (res.isSuccessful && res.body()?.success == true && res.body()?.data != null) {
                    Resource.Success(res.body()!!.data!!)
                } else {
                    val err = parseErrorMessage(res.errorBody()?.string()) ?: res.body()?.message ?: "فشل جلب الأدوية"
                    Resource.Error(err)
                }
            } catch (e: Exception) {
                Resource.Error(com.medical.clinic.staff.data.utils.ErrorMapper.fromException(e))
            }
        }

    suspend fun addMedicationToBank(req: com.medical.clinic.staff.data.models.AddMedicationRequest): Resource<com.medical.clinic.staff.data.models.MedicationBankItem> =
        withContext(Dispatchers.IO) {
            try {
                val res = api.addMedicationToBank(req)
                if (res.isSuccessful && res.body()?.success == true && res.body()?.data != null) {
                    Resource.Success(res.body()!!.data!!, res.body()?.message)
                } else {
                    val err = parseErrorMessage(res.errorBody()?.string()) ?: res.body()?.message ?: "فشل حفظ الدواء في البنك"
                    Resource.Error(err)
                }
            } catch (e: Exception) {
                Resource.Error(com.medical.clinic.staff.data.utils.ErrorMapper.fromException(e))
            }
        }

    private fun parseErrorMessage(errorBody: String?): String? {
        if (errorBody.isNullOrBlank()) return null
        return try {
            val json = JSONObject(errorBody)
            json.optString("message").takeIf { it.isNotBlank() }
                ?: json.optString("error").takeIf { it.isNotBlank() }
        } catch (e: Exception) {
            null
        }
    }
}
