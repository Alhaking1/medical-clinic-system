# 🏥 دليل سير عمل الفريق واستراتيجية الفروع (Enterprise Team Workflow)

مرحباً بك في فريق تطوير **منظومة طبيبك (Medical Clinic System)**.  
تم إعداد هذا الدليل لضمان التعاون البرمجي الآمن، وتوحيد معايير جودة الكود، وحماية الفرع الرئيسي (`main`) من أي أعطال أو تضارب.

---

## 🌳 1. استراتيجية الفروع (Branching Strategy)

الفرع الأساسي هو `main` وهو محمي تماماً ولا يُسمح بالدفع المباشر إليه (`Direct Push`) تحت أي ظرف.

### تسمية الفروع (Branch Naming Conventions):
* **الميزات الجديدة:**  
  `feature/[feature-name]-[developer-name]`  
  *مثال:* `feature/patient-wallet-ali` أو `feature/doctor-calendar-sara`
* **إصلاح الأخطاء:**  
  `bugfix/[bug-description]-[developer-name]`  
  *مثال:* `bugfix/login-timeout-mohammed`
* **الإصلاحات الطارئة للإنتاج:**  
  `hotfix/[issue-name]-[developer-name]`  
  *مثال:* `hotfix/payment-webhook-ahmed`

---

## 🔄 2. الروتين اليومي للمطور (Daily Routine)

1. **بدء اليوم بالمزامنة مع الفرع الرئيسي:**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name-yourname
   ```
2. **العمل وكتابة الكود واختباره محلياً.**
3. **تنسيق وفحص الكود قبل الحفظ (Linting & Formatting):**
   * كود بايثون:
     ```bash
     black .
     ruff check . --fix
     ```
   * كود واجهات المستخدم (Frontend / Admin):
     ```bash
     npx prettier --write .
     npm run lint
     ```
4. **حفظ التغييرات برسائل معيارية (Conventional Commits):**
   ```bash
   git add <modified-files>
   git commit -m "feat(scope): brief description [by your-name]"
   ```
   *أمثلة:*
   - `feat(auth): add remember-me checkbox in login [by ali]`
   - `fix(appointments): correct timezone offset in slot booking [by sara]`
5. **رفع الفرع إلى GitHub:**
   ```bash
   git push -u origin feature/your-feature-name-yourname
   ```

---

## 🛡️ 3. قواعد طلبات الدمج (Pull Request Rules)

1. **منع الدمج المباشر:** كل تعديل يجب أن يمر عبر **Pull Request (PR)** إلى فرع `main`.
2. **موافقة المراجعين (Code Review):** يتطلب الدمج موافقة مسؤول واحد على الأقل (`Require 1 approval`).
3. **اجتياز مسار الفحص الآلي (CI Pipeline):**
   - يجب أن تجتاز الفحوصات الآلية اختبارات البناء (Build)، وفحص الأخطاء (Lint)، واختبارات الوحدات (Unit Tests) بنجاح.
4. **عنوان الـ PR ووصفه:**
   - اشرح في الـ PR ماذا غيرت ولماذا، وارفق لقطة شاشة إن كان التعديل في الواجهة (UI).

---

## ⚔️ 4. حل التعارضات البرمجية (Conflict Resolution)

إذا ظهر تعارض (`Merge Conflict`) بين فرعك وفرع `main`:
1. **اسحب آخر تحديثات `main` عبر Rebase:**
   ```bash
   git checkout feature/your-feature-name-yourname
   git fetch origin
   git rebase origin/main
   ```
2. **حل التعارضات عبر Visual Studio Code:**
   - افتح الملفات التي تظهر باللون الأحمر.
   - اختر الإبقاء على:
     - `Accept Current Change` (تعديلك أنت).
     - أو `Accept Incoming Change` (تعديل الزميل المدمج في main).
     - أو `Accept Both Changes` مع التعديل اليدوي للدمج.
3. **متابعة الـ Rebase ورفع التعديل:**
   ```bash
   git add <resolved-files>
   git rebase --continue
   git push --force-with-lease origin feature/your-feature-name-yourname
   ```

---

## ⏪ 5. استراتيجية التراجع والإنقاذ (Rollback Strategy)

في حال تم دمج PR في `main` واكتشف الفريق عطلاً غير متوقع في الإنتاج:

1. **التراجع الآمن عبر GitHub UI (الطريقة المفضلة):**
   - ادخل إلى صفحة الـ Pull Request المدمج على GitHub.
   - انقر على زر **"Revert"** في أسفل الصفحة.
   - سيقوم GitHub تلقائياً بإنشاء PR تراجعي نظيف لحذف التعديلات المعطوبة.
   - يتم دمج PR التراجع فوراً لإعادة الاستقرار إلى الإنتاج.

2. **التراجع عبر موجه الأوامر (CLI Revert):**
   ```bash
   git checkout main
   git pull origin main
   git revert -m 1 <MERGE_COMMIT_HASH>
   git push origin main
   ```
   *ملاحظة حرجة:* يمنع منعاً باتاً استخدام `git reset --hard` أو `git push --force` على فرع `main`.

---

## 🔒 6. سرية المتغيرات البيئية (.env)

- يُمنع منعاً باتاً رفع أو دفع أي ملف `.env` يحتوي على مفاتيح سرية إلى المستودع.
- يتم توزيع المتغيرات البيئية المعتمدة حصراً عبر مدراء كلمات المرور المشفرة (1Password / Bitwarden).
