const fs = require('fs');
const path = require('path');

const filePath = 'C:/Users/lenovo/AndroidProjects/MedicalClinicApp/app/src/main/java/com/medical/clinic/data/api/ApiService.kt';
let code = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

const target = '    @GET("periods/doctor/{doctorId}")';
const addition = `    // ═══════════════════════════════════════════
    // 👨‍👩‍👧‍👦 إدارة أفراد العائلة (Family Members)
    // ═══════════════════════════════════════════
    @GET("family")
    suspend fun getFamilyMembers(): ApiResponse<List<com.medical.clinic.data.models.FamilyMember>>

    @POST("family")
    suspend fun addFamilyMember(
        @Body member: Map<String, @JvmSuppressWildcards Any>
    ): ApiResponse<com.medical.clinic.data.models.FamilyMember>

    @PUT("family/{id}")
    suspend fun updateFamilyMember(
        @Path("id") id: Int,
        @Body member: Map<String, @JvmSuppressWildcards Any>
    ): ApiResponse<com.medical.clinic.data.models.FamilyMember>

    @DELETE("family/{id}")
    suspend fun deleteFamilyMember(
        @Path("id") id: Int
    ): ApiResponse<Any>

`;

if (!code.includes('getFamilyMembers')) {
  code = code.replace(target, addition + target);
  fs.writeFileSync(filePath, code.replace(/\n/g, '\r\n'), 'utf8');
  console.log('✅ ApiService.kt updated with family methods');
} else {
  console.log('ℹ️ getFamilyMembers already exists');
}
