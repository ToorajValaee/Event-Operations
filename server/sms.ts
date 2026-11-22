/**
 * SMS.ir OTP Verification Integration
 * Official API: https://api.sms.ir/v1/send/verify
 */

export interface SendOtpResult {
  success: boolean;
  message: string;
  devCode?: string;
  isSimulated: boolean;
}

export function normalizeIranianPhone(phone: string): string {
  let normalized = phone.trim();
  if (normalized.startsWith('+98')) {
    normalized = '0' + normalized.slice(3);
  } else if (normalized.startsWith('98')) {
    normalized = '0' + normalized.slice(2);
  }
  return normalized;
}

/**
 * Sends a generic text SMS using SMS.ir Line Number or simulates in dev
 */
export async function sendTextSms(phone: string, text: string): Promise<{ success: boolean; isSimulated: boolean }> {
  const apiKey = process.env.SMS_IR_API_KEY;
  const lineNumber = process.env.SMS_IR_LINE_NUMBER;
  const normalizedPhone = normalizeIranianPhone(phone);

  if (!apiKey || !lineNumber) {
    console.log(`\n========================================`);
    console.log(`💬 [SMS.ir TEXT NOTIFICATION (DEV SIMULATION)]`);
    console.log(`📱 To: ${normalizedPhone}`);
    console.log(`📄 Message: ${text}`);
    console.log(`========================================\n`);
    return { success: true, isSimulated: true };
  }

  try {
    const payload = {
      lineNumber: Number(lineNumber) || lineNumber,
      messageText: text,
      mobiles: [normalizedPhone],
    };

    const response = await fetch('https://api.sms.ir/v1/send/bulk', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as { status: number; message: string };
    if (response.ok && data.status === 1) {
      console.log(`✅ [SMS.ir] Sent text SMS to ${normalizedPhone}`);
      return { success: true, isSimulated: false };
    } else {
      console.warn(`⚠️ [SMS.ir] Failed text SMS to ${normalizedPhone}:`, data);
      return { success: false, isSimulated: false };
    }
  } catch (err) {
    console.error(`❌ [SMS.ir] Error sending text SMS to ${normalizedPhone}:`, err);
    return { success: false, isSimulated: false };
  }
}

/**
 * Sends OTP verification SMS via SMS.ir /send/verify
 */
export async function sendOtpSms(phone: string, code: string): Promise<SendOtpResult> {
  const apiKey = process.env.SMS_IR_API_KEY;
  const templateId = process.env.SMS_IR_TEMPLATE_ID;
  const normalizedPhone = normalizeIranianPhone(phone);

  // If no API key is provided, run in high-fidelity dev mode
  if (!apiKey) {
    console.log(`\n========================================`);
    console.log(`📲 [SMS.ir DEV SIMULATOR]`);
    console.log(`📱 Phone: ${normalizedPhone}`);
    console.log(`🔑 Verification OTP Code: ${code}`);
    console.log(`========================================\n`);

    const isProduction = process.env.NODE_ENV === 'production';
    return {
      success: true,
      message: isProduction
        ? 'کد تایید برای شماره شما ارسال شد'
        : 'کد تایید ارسال شد (حالت آزمایشی)',
      devCode: isProduction ? undefined : code,
      isSimulated: true,
    };
  }

  try {
    const payload = {
      mobile: normalizedPhone,
      templateId: templateId ? parseInt(templateId, 10) : 100000,
      parameters: [
        {
          name: 'Code',
          value: code,
        },
      ],
    };

    const response = await fetch('https://api.sms.ir/v1/send/verify', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as { status: number; message: string };

    if (response.ok && data.status === 1) {
      return {
        success: true,
        message: 'کد تایید با موفقیت از طریق سامانه پیامکی sms.ir ارسال شد',
        isSimulated: false,
      };
    } else {
      console.warn('SMS.ir returned non-success response:', data);
      return {
        success: true, // Graceful fallback so user is not blocked
        message: `پیامک به دلیل خطای سامانه ارسال نشد (${data.message || 'اعتبار یا الگو'}). کد آزمایشی نمایش داده می‌شود.`,
        devCode: code,
        isSimulated: true,
      };
    }
  } catch (error) {
    console.error('Error contacting SMS.ir:', error);
    return {
      success: true,
      message: 'خطا در ارتباط با سرور پیامک؛ کد به صورت تستی نمایش داده می‌شود',
      devCode: code,
      isSimulated: true,
    };
  }
}

/**
 * 1. Vendor Request Created:
 * Sends one SMS to the Vendor and one SMS to Admins
 */
export async function notifyVendorRequestCreated(params: {
  vendorPhone: string;
  brandName: string;
  eventTitle: string;
  adminPhones?: string[];
}) {
  const { vendorPhone, brandName, eventTitle, adminPhones = [] } = params;

  // 1. SMS to Vendor
  const vendorMessage = `غرفه‌دار گرامی، درخواست ثبت غرفه شما برای برند «${brandName}» در رویداد «${eventTitle}» با موفقیت ثبت شد و در حال بررسی توسط دبیرخانه است.`;
  await sendTextSms(vendorPhone, vendorMessage).catch((e) =>
    console.error('Error sending vendor request SMS to vendor:', e)
  );

  // 2. SMS to Admins
  const effectiveAdminPhones = adminPhones.length > 0
    ? adminPhones
    : (process.env.ADMIN_PHONES || '').split(',').map((p) => p.trim()).filter(Boolean);

  const adminMessage = `مدیر گرامی، درخواست ثبت غرفه جدید برای برند «${brandName}» (شماره: ${vendorPhone}) در رویداد «${eventTitle}» ثبت شد. جهت بررسی به پنل مدیریت مراجعه فرمایید.`;

  for (const adminPhone of effectiveAdminPhones) {
    await sendTextSms(adminPhone, adminMessage).catch((e) =>
      console.error(`Error sending vendor request alert to admin ${adminPhone}:`, e)
    );
  }
}

/**
 * 2. Vendor Request Status Changed:
 * Sends SMS ONLY to the Vendor informing them of the status change
 */
export async function notifyVendorStatusChanged(params: {
  vendorPhone: string;
  brandName: string;
  eventTitle: string;
  newStatus: string;
  assignedBoothNumber?: string;
  adminNotes?: string;
}) {
  const { vendorPhone, brandName, eventTitle, newStatus, assignedBoothNumber, adminNotes } = params;

  let statusText = 'در حال بررسی';
  if (newStatus === 'approved') statusText = 'تایید شد';
  else if (newStatus === 'rejected') statusText = 'عدم تایید';
  else if (newStatus === 'revision_needed') statusText = 'نیازمند ویرایش و اصلاح مدارک';

  let message = `غرفه‌دار گرامی برند «${brandName}»، وضعیت درخواست غرفه شما در رویداد «${eventTitle}» به «${statusText}» تغییر یافت.`;

  if (newStatus === 'approved' && assignedBoothNumber) {
    message += ` غرفه اختصاص‌یافته: ${assignedBoothNumber}.`;
  }
  if (adminNotes && adminNotes.trim()) {
    message += ` توضیحات دبیرخانه: ${adminNotes.trim()}`;
  }

  await sendTextSms(vendorPhone, message).catch((e) =>
    console.error('Error sending vendor status change SMS:', e)
  );
}
