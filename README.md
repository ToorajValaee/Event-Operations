# سامانه جامع مدیریت رویدادها و غرفه‌داران (EventOps)

سامانه یکپارچه و مدرن مدیریت رویدادها، نمایشگاه‌ها، ارزیابی و رتبه‌بندی غرفه‌داران، کاتالوگ دیجیتال و پنل اختصاصی غرفه‌دار و دبیرخانه اجرایی.

---

## 🌟 ویژگی‌های کلیدی (Key Features)

### ۱. کاتالوگ رویداد و تقویم شمسی
- نمایش تقویم شمسی رویدادها با قابلیت فیلتر بر اساس دسته‌بندی و وضعیت برگزاری.
- شمارش معکوس اختصاصی تا آغاز یا پایان هر رویداد.
- نقشه استقرار غرفه‌ها و راهنمای سالن‌های برگزاری.

### ۲. پنل اختصاصی غرفه‌داران (Vendor Portal)
- **پروفایل و هویت برند**: ثبت مشخصات تجاری، صنف تخصصی، وب‌سایت، معرفی شرکت و مدیریت لوگوی برند.
- **ثبت‌نام در رویدادها**: انتخاب سالن، نوع غرفه (استاندارد، خودساز، جزیره) و ملزومات فنی (برق، اینترنت، سازه و...).
- **امضای دیجیتال و قرارداد**: مشاهده مفاد تعهدنامه رسمی سالن و ثبت امضای الکترونیک نماینده تام‌الاختیار.
- **امنیت اطلاعات**: قفل هوشمند شماره همراه احرازشده پس از ثبت‌نام اولیه به دلایل حقوقی و امنیتی.

### ۳. پنل دبیرخانه و مدیریت رویدادها (Admin & Management)
- **داشبورد وضعیت**: بررسی، تایید نهایی، ارجاع جهت اصلاح مدارک و رد درخواست‌های ثبت‌نام.
- **تخصیص غرفه**: انتساب شماره غرفه به غرفه‌داران تاییدشده همراه با ارسال خودکار پیامک اطلاع‌رسانی.
- **تنظیمات پویا برای هر رویداد**:
  - مدیریت سالن‌ها و موقعیت‌های استقرار (Booth Locations & Zones).
  - مدیریت انواع غرفه‌ها و تعرفه‌های ریالی (Booth Types & Pricing).
  - مدیریت تجهیزات و امکانات قابل سفارش (Facilities & Equipment).
- **شاخص‌های بصری**: ستون‌های بررسی وضعیت آپلود لوگوی برند و امضای تعهدنامه رسمی.

### ۴. سیستم رتبه‌بندی و ارزیابی غرفه‌ها
- نظرسنجی و ثبت امتیاز بازدیدکنندگان با تفکیک معیارهای طراحی غرفه، پاسخگویی پرسنل و کیفیت محصولات.
- محاسبه میانگین امتیاز و نمایش ستاره‌های کیفی در کاتالوگ عمومی.

---

## 🛠 فناوری‌های استفاده‌شده (Tech Stack)

- **فرانت‌اند**: React 19، TypeScript، Vite، Tailwind CSS (v4)، Lucide Icons، Motion
- **بک‌اند**: Express.js، TypeScript (`tsx`)، RESTful APIs
- **پایگاه‌داده و زیرساخت**: PostgreSQL (پشتیبانی از کانتینر Docker و پایگاه داده ریموت)، Redis جهت کشینگ
- **ذخیره‌سازی فایل**: سازگار با S3 / MinIO Object Storage
- **پیامک و OTP**: احراز هویت پیامکی از طریق سرویس SMS.ir (با قابلیت شبیه‌سازی در محیط آزمایشی)
- **هوش مصنوعی**: پشتیبانی از Google Gemini API برای گزارش‌ها و تحلیل‌های مدیریتی

---

## 🚀 راهنمای نصب و راه‌اندازی (Getting Started)

### پیش‌نیازها
- **Node.js** نسخه ۱۸ یا بالاتر
- **npm** یا **bun** / **yarn**
- اختیاری: **Docker** و **Docker Compose** (جهت راه‌اندازی سریع پایگاه داده و MinIO)

### ۱. کلون مخزن (Clone the repository)
```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
```

### ۲. نصب وابستگی‌ها (Install Dependencies)
```bash
npm install
```

### ۳. تنظیم متغیرهای محیطی (Environment Variables)
یک کپی از فایل `.env.example` ایجاد کرده و مقادیر لازم را تکمیل نمایید:
```bash
cp .env.example .env
```

نمونه متغیرهای اصلی:
```env
PORT=3000
DATABASE_URL="postgresql://user:password@localhost:5432/events_db"
REDIS_URL="redis://localhost:6379"
SMS_IR_API_KEY=""
ADMIN_SECRET_KEY="<unique-admin-password>"
JWT_SECRET="<random-secret-at-least-32-bytes>"
```

### ۴. اجرای برنامه در حالت توسعه (Development Mode)
```bash
npm run dev
```
برنامه در آدرس `http://localhost:3000` در دسترس خواهد بود.

### ۵. ساخت نسخه نهایی (Production Build)
```bash
npm run build
npm start
```

---

## 🐳 اجرای سریع با داکر (Docker Compose)
برای راه‌اندازی سریع پایگاه‌داده، کش ردیس و MinIO:
```bash
docker-compose up -d
```

---

## 📄 مالکیت معنوی و لایسنس (License & Commercial Rights)
این پروژه نرم‌افزاری کاملاً اختصاصی (Proprietary) است و کلیه حقوق مادی، معنوی و توسعه تجاری آن برای **تورج والایی (Tooraj Valaee)** محفوظ می‌باشد (**All Rights Reserved**).

- هرگونه کپی‌برداری، بازتوزیع، تغییر، استقرار تجاری یا فروش بدون اجازه کتبی و خرید لایسنس تجاری از صاحب اثر **غیرمجاز و ممنوع** است.
- جهت دریافت لایسنس تجاری، مشاوره، استقرار سازمانی یا همکاری تجاری:
  - **صاحب اثر**: تورج والایی (Tooraj Valaee)
  - **ایمیل تماس**: `Tooraj.Valaee@gmail.com`
  - مشاهده جزئیات متن لایسنس در فایل [LICENSE](LICENSE).

Security configuration: set JWT_SECRET to a cryptographically random value (at least 32 bytes) and ADMIN_SECRET_KEY to a unique password. Production requires JWT_SECRET; admin password login is disabled when ADMIN_SECRET_KEY is empty. Persist /app/data for fallback uploads. Authentication throttling and registration serialization are process-local; use a single application instance until shared rate limits and database capacity transactions are implemented.
