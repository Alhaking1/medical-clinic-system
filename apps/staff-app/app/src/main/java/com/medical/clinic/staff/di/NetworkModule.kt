package com.medical.clinic.staff.di

import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.medical.clinic.staff.BuildConfig
import com.medical.clinic.staff.data.api.ApiService
import com.medical.clinic.staff.data.api.AuthInterceptor
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    private const val BASE_URL = "https://medical-booking-backend-production.up.railway.app/api/v1/"

    @Provides
    @Singleton
    fun provideGson(): Gson {
        val intDeserializer = object : com.google.gson.JsonDeserializer<Int> {
            override fun deserialize(
                json: com.google.gson.JsonElement?,
                typeOfT: java.lang.reflect.Type?,
                context: com.google.gson.JsonDeserializationContext?
            ): Int? {
                if (json == null || json.isJsonNull) return null
                return try {
                    if (json.asJsonPrimitive.isBoolean) {
                        if (json.asBoolean) 1 else 0
                    } else {
                        json.asInt
                    }
                } catch (_: Exception) {
                    0
                }
            }
        }

        return GsonBuilder()
            .setLenient()
            .registerTypeAdapter(Int::class.java, intDeserializer)
            .registerTypeAdapter(java.lang.Integer::class.java, intDeserializer)
            .create()
    }

    @Provides
    @Singleton
    fun provideLoggingInterceptor(): HttpLoggingInterceptor {
        return HttpLoggingInterceptor().apply {
            redactHeader("Authorization")
            redactHeader("Cookie")
            redactHeader("Set-Cookie")
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }
    }

    @Provides
    @Singleton
    fun provideOkHttpClient(
        authInterceptor: AuthInterceptor,
        loggingInterceptor: HttpLoggingInterceptor,
        tokenAuthenticator: com.medical.clinic.staff.data.api.TokenAuthenticator
    ): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(loggingInterceptor)
            .authenticator(tokenAuthenticator)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient, gson: Gson): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
    }

    @Provides
    @Singleton
    fun provideApiService(retrofit: Retrofit): ApiService {
        return retrofit.create(ApiService::class.java)
    }
}
