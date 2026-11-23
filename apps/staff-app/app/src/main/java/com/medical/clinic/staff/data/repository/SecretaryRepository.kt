package com.medical.clinic.staff.data.repository

import com.medical.clinic.staff.data.api.ApiService
import com.medical.clinic.staff.data.models.*
import com.medical.clinic.staff.data.utils.Resource
import okhttp3.MultipartBody
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SecretaryRepository @Inject constructor(
    private val api: ApiService
) {

    suspend fun getDoctorPeriods(doctorId: Int): Resource<List<PeriodItem>> =
        withContext(Dispatchers.IO) {
            try {
                val res = api.getDoctorPeriods(doctorId)
                if (res.isSuccessful && res.body()?.success == true) {
                    Resource.Success(res.body()?.data ?: emptyList())
                } else {
                    val err = parseErrorMessage(res.errorBody()?.string()) ?: res.body()?.message ?: "فشل جلب الفترات"
                    Resource.Error(err)
                }
            } catch (e: Exception) {
                Resource.Error(com.medical.clinic.staff.data.utils.ErrorMapper.fromException(e))
            }
        }

    suspend fun stopPeriod(periodId: Int, notes: String? = null): Resource<String> =
        withContext(Dispatchers.IO) {
            try {
                val res = api.stopPeriod(periodId, StopPeriodRequest(notes))
                if (res.isSuccessful && res.body()?.success == true) {
                    Resource.Success(res.body()?.message ?: "تم إيقاف الفترة مؤقتاً")
                } else {
                    val err = parseErrorMessage(res.errorBody()?.string()) ?: res.body()?.message ?: "فشل إيقاف الفترة"
                    Resource.Error(err)
                }
            } catch (e: Exception) {
                Resource.Error(com.medical.clinic.staff.data.utils.ErrorMapper.fromException(e))
            }
        }

    suspend fun resumePeriod(periodId: Int): Resource<String> =
        withContext(Dispatchers.IO) {
            try {
                val res = api.resumePeriod(periodId)
                if (res.isSuccessful && res.body()?.success == true) {
                    Resource.Success(res.body()?.message ?: "تم استئناف الفترة")
                } else {
                    val err = parseErrorMessage(res.errorBody()?.string()) ?: res.body()?.message ?: "فشل استئناف الفترة"
                    Resource.Error(err)
                }
            } catch (e: Exception) {
                Resource.Error(com.medical.clinic.staff.data.utils.ErrorMapper.fromException(e))
            }
        }

    suspend fun updateMaxBookings(periodId: Int, max: Int): Resource<String> =
        withContext(Dispatchers.IO) {
            try {
                val res = api.updateMaxBookings(periodId, UpdateMaxBookingsRequest(max))
                if (res.isSuccessful && res.body()?.success == true) {
                    Resource.Success(res.body()?.message ?: "تم تحديث السعة بنجاح")
                } else {
                    val err = parseErrorMessage(res.errorBody()?.string()) ?: res.body()?.message ?: "فشل تحديث السعة"
                    Resource.Error(err)
                }
            } catch (e: Exception) {
                Resource.Error(com.medical.clinic.staff.data.utils.ErrorMapper.fromException(e))
            }
        }

    suspend fun getSecretaryDoctors(): Resource<List<SecretaryDoctorItem>> =
        withContext(Dispatchers.IO) {
            try {
                val res = api.getSecretaryDoctors()
                if (res.isSuccessful && res.body()?.success == true) {
                    Resource.Success(res.body()?.data ?: emptyList())
                } else {
                    val err = parseErrorMessage(res.errorBody()?.string()) ?: res.body()?.message ?: "فشل جلب الأطباء"
                    Resource.Error(err)
                }
            } catch (e: Exception) {
                Resource.Error(com.medical.clinic.staff.data.utils.ErrorMapper.fromException(e))
            }
        }

    suspend fun getOffers(): Resource<List<OfferItem>> =
        withContext(Dispatchers.IO) {
            try {
                val res = api.getOffers()
                if (res.isSuccessful && res.body()?.success == true) {
                    Resource.Success(res.body()?.data ?: emptyList())
                } else {
                    val err = parseErrorMessage(res.errorBody()?.string()) ?: res.body()?.message ?: "فشل جلب العروض"
                    Resource.Error(err)
                }
            } catch (e: Exception) {
                Resource.Error(com.medical.clinic.staff.data.utils.ErrorMapper.fromException(e))
            }
        }

    suspend fun getSecretaryOffers(): Resource<SecretaryOffersResponse> =
        withContext(Dispatchers.IO) {
            try {
                val res = api.getSecretaryOffers()
                if (res.isSuccessful && res.body() != null) {
                    Resource.Success(res.body()!!)
                } else {
                    val err = parseErrorMessage(res.errorBody()?.string()) ?: "فشل جلب العروض"
                    Resource.Error(err)
                }
            } catch (e: Exception) {
                Resource.Error(com.medical.clinic.staff.data.utils.ErrorMapper.fromException(e))
            }
        }

    suspend fun repeatOffer(offerId: Int, durationDays: Int): Resource<OfferItem> =
        withContext(Dispatchers.IO) {
            try {
                val body = mapOf<String, Any>("duration_days" to durationDays)
                val res = api.repeatOffer(offerId, body)
                if (res.isSuccessful && res.body()?.data != null) {
                    Resource.Success(res.body()!!.data!!, res.body()?.message)
                } else {
                    val err = parseErrorMessage(res.errorBody()?.string()) ?: res.body()?.message ?: "فشل تكرار العرض"
                    Resource.Error(err)
                }
            } catch (e: Exception) {
                Resource.Error(com.medical.clinic.staff.data.utils.ErrorMapper.fromException(e))
            }
        }

    suspend fun uploadOfferImages(offerId: Int, parts: List<MultipartBody.Part>): Resource<String> =
        withContext(Dispatchers.IO) {
            try {
                val res = api.uploadOfferImages(offerId, parts)
                if (res.isSuccessful && res.body()?.success == true) {
                    Resource.Success(res.body()?.message ?: "تم رفع الصور بنجاح")
                } else {
                    val err = parseErrorMessage(res.errorBody()?.string()) ?: res.body()?.message ?: "فشل رفع الصور"
                    Resource.Error(err)
                }
            } catch (e: Exception) {
                Resource.Error(com.medical.clinic.staff.data.utils.ErrorMapper.fromException(e))
            }
        }

    suspend fun createOffer(req: CreateOfferRequest): Resource<OfferItem> =
        withContext(Dispatchers.IO) {
            try {
                val res = api.createOffer(req)
                if (res.isSuccessful && res.body()?.success == true && res.body()?.data != null) {
                    Resource.Success(res.body()!!.data!!, res.body()?.message)
                } else {
                    val err = parseErrorMessage(res.errorBody()?.string()) ?: res.body()?.message ?: "فشل إنشاء العرض"
                    Resource.Error(err)
                }
            } catch (e: Exception) {
                Resource.Error(com.medical.clinic.staff.data.utils.ErrorMapper.fromException(e))
            }
        }

    suspend fun deleteOffer(offerId: Int): Resource<String> =
        withContext(Dispatchers.IO) {
            try {
                val res = api.deleteOffer(offerId)
                if (res.isSuccessful && res.body()?.success == true) {
                    Resource.Success(res.body()?.message ?: "تم حذف العرض")
                } else {
                    val err = parseErrorMessage(res.errorBody()?.string()) ?: res.body()?.message ?: "فشل حذف العرض"
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
