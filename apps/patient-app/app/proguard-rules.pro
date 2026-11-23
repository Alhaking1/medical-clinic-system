# ═══════════════════════════════════════════
# ProGuard Rules — MedicalClinicApp
# ═══════════════════════════════════════════

# Keep line numbers for debugging
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Retrofit
-keepattributes Signature, InnerClasses, EnclosingMethod
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }

# Gson
-keepattributes Signature
-keep class com.google.gson.** { *; }
-keepclassmembers,allowobfuscation class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# Data Models (Gson)
-keep class com.medical.clinic.data.models.** { *; }

# Hilt
-keep class dagger.hilt.** { *; }
-keep class javax.inject.** { *; }
-keep class * extends dagger.hilt.android.internal.managers.ViewComponentManager$FragmentContextWrapper { *; }

# Glide
-keep public class * implements com.bumptech.glide.module.GlideModule
-keep class * extends com.bumptech.glide.module.AppGlideModule { <init>(...); }

# Lottie
-dontwarn com.airbnb.lottie.**

# MPAndroidChart
-keep class com.github.mikephil.charting.** { *; }

# Coroutines
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
# Keep entire app package intact
-keep class com.medical.clinic.** { *; }
-dontwarn **


# Ensure API & Models are never obfuscated or stripped by R8
-keep class com.medical.clinic.data.api.** { *; }
-keepclassmembers class com.medical.clinic.data.api.** { *; }
-keep class com.medical.clinic.data.models.** { *; }
-keepclassmembers class com.medical.clinic.data.models.** { *; }
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
-keepattributes *Annotation*