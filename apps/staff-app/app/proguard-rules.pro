# Proguard rules for Staff App
-keep class com.medical.clinic.staff.data.models.** { *; }
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
