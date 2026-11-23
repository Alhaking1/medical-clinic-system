const fs = require('fs');

const aPath = 'C:/Users/lenovo/AndroidProjects/MedicalClinicApp/app/src/main/java/com/medical/clinic/data/api/ApiService.kt';
let aCode = fs.readFileSync(aPath, 'utf8').replace(/\r\n/g, '\n');

if (!aCode.includes('sendAssistantMessage')) {
  const target = '@GET("family")';
  const method = `    @POST("assistant/chat")
    suspend fun sendAssistantMessage(
        @Body body: Map<String, @JvmSuppressWildcards Any>
    ): com.medical.clinic.data.models.AssistantResponse

    @GET("family")`;

  aCode = aCode.replace(target, method);
  fs.writeFileSync(aPath, aCode.replace(/\n/g, '\r\n'), 'utf8');
  console.log('✅ sendAssistantMessage added to ApiService.kt');
} else {
  console.log('ℹ️ sendAssistantMessage already exists');
}
