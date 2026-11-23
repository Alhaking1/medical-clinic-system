import fs from 'fs';

const file = 'C:/Users/lenovo/AndroidProjects/MedicalClinicStaffApp/app/src/main/java/com/medical/clinic/staff/data/repository/DoctorRepository.kt';
let code = fs.readFileSync(file, 'utf8');

const target = '    private fun parseErrorMessage(errorBody: String?): String? {';

const methods = `    suspend fun createPrescription(req: CreatePrescriptionRequest): Resource<PrescriptionResponseData> =
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

    private fun parseErrorMessage(errorBody: String?): String? {`;

if (!code.includes(target)) {
  console.error('Target string not found');
  process.exit(1);
}

code = code.replace(target, methods);
fs.writeFileSync(file, code, 'utf8');
console.log('DoctorRepository updated successfully!');
