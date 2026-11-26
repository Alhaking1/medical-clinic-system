# 📡 توثيق مسارات واجهات برمجة التطبيقات (API Reference)
## منظومة إدارة العيادات الطبية والانتظار الذكي (Medical Clinic Platform)

يعمل الخادم على المنفذ الافتراضي: `http://localhost:8080/api/v1`

---

## 1. مسارات المصادقة والأمان (`/api/v1/auth` & `/api/v1/otp`)

### 1.1 تسجيل الدخول (Login)
* **المسار:** `POST /api/v1/auth/login`
* **الصلاحية:** عام (Public)
* **جسم الطلب (Request Body):**
  ```json
  {
    "phone": "770000000",
    "password": "Password123"
  }
  ```
* **الاستجابة الناجحة (HTTP 200):**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "name": "محمد علي",
      "phone": "770000000",
      "role": "patient"
    }
  }
  ```

### 1.2 إنشاء حساب مريض جديد (Register Patient)
* **المسار:** `POST /api/v1/auth/register-patient`
* **الصلاحية:** عام (Public)
* **جسم الطلب:**
  ```json
  {
    "fullName": "سالم أحمد",
    "phone": "771234567",
    "password": "SecurePassword@1",
    "gender": "male",
    "age": 28
  }
  ```

### 1.3 التحقق برمز الـ OTP (Verify OTP)
* **المسار:** `POST /api/v1/otp/verify`
* **جسم الطلب:**
  ```json
  {
    "phone": "771234567",
    "code": "123456"
  }
  ```

---

## 2. مسارات الطابور اللحظي الذكي (`/api/v1/queue`)

### 2.1 فحص حالة الطابور الحالية للموعد (Live Queue Status)
* **المسار:** `GET /api/v1/queue/live/:appointmentId`
* **الصلاحية:** مريض مصرح (Bearer Token)
* **الاستجابة:**
  ```json
  {
    "success": true,
    "data": {
      "appointment_id": 105,
      "my_queue_number": 4,
      "current_serving_number": 2,
      "patients_ahead": 1,
      "estimated_wait_minutes": 15,
      "doctor_name": "د. أحمد خالد",
      "clinic_name": "عيادة الباطنية والقلب"
    }
  }
  ```

### 2.2 البث المباشر للطابور (Server-Sent Events - SSE Stream) ⚡
* **المسار:** `GET /api/v1/queue/stream/:appointmentId`
* **البروتوكول:** Server-Sent Events (`text/event-stream`)
* **آلية العمل:** يقوم الخادم بإرسال تحديث تلقائي فوري فور تغيير حالة الطابور من قبل الطبيب، وتحديث دوري كل 5 ثوانٍ لحساب الوقت المتبقي بدقة متناهية.
* **مثال على الـ Event:**
  ```text
  event: queue_update
  data: {"appointment_id":105,"current_serving_number":3,"patients_ahead":0,"status_text":"🏥 حان دورك الآن! يرجى الدخول لغرفة الطبيب"}
  ```

---

## 3. مسارات المواعيد والحجوزات (`/api/v1/appointments`)

### 3.1 حجز موعد جديد
* **المسار:** `POST /api/v1/appointments`
* **جسم الطلب:**
  ```json
  {
    "doctor_id": 3,
    "period_id": 12,
    "appointment_date": "2026-11-26",
    "payment_method": "wallet",
    "family_member_id": null
  }
  ```

### 3.2 تأكيد الحضور التلقائي (NFC / QR Check-In)
* **المسار:** `POST /api/v1/check-in/scan`
* **جسم الطلب:**
  ```json
  {
    "booking_code": "TAB-8841",
    "method": "nfc"
  }
  ```

---

## 4. مسارات السجلات والروشتات الإلكترونية (`/api/v1/prescriptions` & `/api/v1/medical-records`)

### 4.1 كتابة روشتة من قبل الطبيب (Doctor Issue Rx)
* **المسار:** `POST /api/v1/prescriptions`
* **الصلاحية:** طبيب معتمد (Doctor Role)
* **جسم الطلب:**
  ```json
  {
    "appointment_id": 105,
    "diagnosis": "التهاب الجيوب الأنفية الحاد",
    "medicines": [
      {
        "name": "Augmentin 1g",
        "dosage": "حبة واحدة",
        "frequency": "مرتين يومياً بعد الأكل",
        "duration": "7 أيام"
      }
    ],
    "lab_tests": "لا توجد",
    "notes": "الالتزام بالراحة التامة وشرب السوائل الدافئة"
  }
  ```

### 4.2 استعراض سجلات المريض الطبية (Patient Medical History)
* **المسار:** `GET /api/v1/medical-records/my-records`
* **الصلاحية:** المريض صاحب الحساب

---

## 5. مسارات المحادثة والدعم الطبي (`/api/v1/chat`)

* **قائمة المحادثات النشطة:** `GET /api/v1/chat/conversations`
* **رسائل محادثة معينة:** `GET /api/v1/chat/messages/:conversationId`
* **إرسال رسالة فورية:**
  `POST /api/v1/chat/send`
  ```json
  {
    "conversation_id": 12,
    "message": "السلام عليكم دكتور، بخصوص مواعيد تناول الدواء..."
  }
  ```

---

## 6. فحص جاهزية الخادم (Health Check)
* **المسار:** `GET /api/v1/health`
* **الاستجابة:**
  ```json
  {
    "success": true,
    "status": "OK",
    "database": "connected",
    "timestamp": "2026-11-26T12:00:00.000Z"
  }
  ```
