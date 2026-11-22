import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { db } from './db.js';
import { cache } from './redis.js';
import { storage } from './storage.js';
import { sendOtpSms, notifyVendorRequestCreated, notifyVendorStatusChanged } from './sms.js';
import { signJwt, verifyJwt } from './auth.js';
import type { EventItem, VendorRegistration, VendorReview, User, SponsorItem, SponsorStatus } from '../src/types.js';

export const apiRouter = Router();
let registrationQueue = Promise.resolve();
apiRouter.use((req, res, next) => {
 if(req.method !== 'POST' || !['/vendors','/vendors/register'].includes(req.path)) return next();
 const previous = registrationQueue;
 registrationQueue = new Promise<void>(resolve => { res.once('finish',resolve); res.once('close',resolve); });
 previous.then(() => next()).catch(next);
});
const attempts = new Map<string, {count:number, until:number}>();
apiRouter.use(async (req, res, next) => {
 try {
 const payload = verifyJwt(req.headers.authorization?.replace(/^Bearer /, '') || '');
 const user = payload ? await db.getUserByPhone(payload.phone) : null;
 res.locals.user = user;
 if (req.path.startsWith('/auth/') && req.method === 'POST') {
 const now = Date.now(); for (const [k,v] of attempts) if(v.until <= now) attempts.delete(k);
 const key = req.ip + req.path; const entry = attempts.get(key) || {count:0, until:now+180000}; attempts.set(key,entry);
 if (++entry.count > 5) return res.status(429).json({error:'Too many attempts'});
 }
 const admin = req.path.startsWith('/admins') || (req.path.startsWith('/events') && req.method !== 'GET') || (req.path.startsWith('/sponsors/') && req.method !== 'GET') || req.path.endsWith('/status');
 if(admin && user?.role !== 'admin') return res.status(403).json({error:'Admin required'});
 if(req.path.startsWith('/vendors') && req.method !== 'GET' && !req.path.endsWith('/review') && !user) return res.status(401).json({error:'Login required'});
 if(req.method === 'PATCH' && req.path.startsWith('/vendors/') && user?.role !== 'admin') {
 const vendor = await db.getVendorById(req.path.split('/')[2]);
 if(!vendor || vendor.userId !== user?.id) return res.status(403).json({error:'Access denied'});
 for(const key of ['status','assignedBoothNumber','adminNotes']) delete req.body[key];
 }
 next();
 } catch(error) { next(error); }
});
const publicVendor = (v: VendorRegistration) => {
 const {phone,email,documents,signedBy,signedAt,adminNotes,userId,...safe} = v; return safe;
};

// -------------------------------------------------------------
// 1. Healthcheck & Config
// -------------------------------------------------------------
apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

apiRouter.get('/config', (req: Request, res: Response) => {
  res.json({
    platformName: process.env.PLATFORM_NAME || process.env.VITE_PLATFORM_NAME || 'طهرون ایونتس',
  });
});

// -------------------------------------------------------------
// 2. Authentication with SMS.ir OTP
// -------------------------------------------------------------
apiRouter.post('/auth/send-otp', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: 'شماره موبایل الزامی است' });
    }

    const cleanPhone = phone.trim();
    // Generate 5-digit secure code
    const code = crypto.randomInt(10000, 100000).toString();

    // Cache in Redis / memory for 3 minutes (180s)
    await cache.set(`otp:${cleanPhone}`, code, 180);
    db.setOtp(cleanPhone, code, 180000);

    // Send via SMS.ir (or Dev Simulator)
    const result = await sendOtpSms(cleanPhone, code);

    // Never leak devCode to client in production
    const isProduction = process.env.NODE_ENV === 'production';

    res.json({
      success: true,
      message: result.message,
      devCode: isProduction ? undefined : result.devCode,
      isSimulated: result.isSimulated,
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ error: 'خطا در ارسال کد تایید پیامکی' });
  }
});

apiRouter.post('/auth/verify-otp', async (req: Request, res: Response) => {
  try {
    const { phone, code, role = 'vendor', fullName = '' } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ error: 'شماره موبایل و کد تایید الزامی است' });
    }

    const cleanPhone = phone.trim();
    // Check Redis first, then DB
    let cachedCode = await cache.get(`otp:${cleanPhone}`);
    if (!cachedCode) {
      cachedCode = db.getOtp(cleanPhone);
    }

    // Master passcode for admin: from environment variable ADMIN_SECRET_KEY or default
    const adminSecret = (process.env.ADMIN_SECRET_KEY || '').trim();
    const isMasterAdmin = Boolean(adminSecret && code.trim() === adminSecret);

    if (!isMasterAdmin && cachedCode !== code) {
      return res.status(400).json({ error: 'کد تایید وارد شده نادرست است یا منقضی شده است' });
    }

    // Invalidate OTP
    await cache.del(`otp:${cleanPhone}`);
    db.clearOtp(cleanPhone);

    // Find or create user
    const finalRole = isMasterAdmin ? 'admin' : (role === 'visitor' ? 'visitor' : 'vendor');
    let user = await db.getUserByPhone(cleanPhone);
    if (!user) {
      user = {
        id: `usr-${Date.now()}`,
        phone: cleanPhone,
        fullName: fullName.trim() || (finalRole === 'admin' ? 'مدیر سامانه' : 'نماینده غرفه'),
        role: finalRole,
        createdAt: new Date().toISOString(),
      };
      await db.saveUser(user);
    } else if (isMasterAdmin && user.role !== 'admin') {
      user.role = 'admin';
      await db.saveUser(user);
    }

    // Sign JWT token valid for 30 days
    const token = signJwt({
      id: user.id,
      phone: user.phone,
      role: user.role,
      fullName: user.fullName,
    });

    res.json({
      success: true,
      user,
      token,
      message: 'ورود با موفقیت انجام شد',
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ error: 'خطا در بررسی کد تایید' });
  }
});

// Admin Direct Login using ADMIN_SECRET_KEY (Master Password)
apiRouter.post('/auth/admin-login', async (req: Request, res: Response) => {
  try {
    const { phone, secretKey, fullName = '' } = req.body;
    if (!phone || !secretKey) {
      return res.status(400).json({ error: 'شماره موبایل و کلید امنیتی مدیریت الزامی است' });
    }

    const cleanPhone = phone.trim();
    const cleanSecret = secretKey.trim();
    const expectedSecret = (process.env.ADMIN_SECRET_KEY || '').trim();

    if (!expectedSecret || cleanSecret !== expectedSecret) {
      return res.status(401).json({ error: 'کلید امنیتی مدیریت (Admin Secret Key) نادرست است' });
    }

    // Find or create admin user in database
    let user = await db.getUserByPhone(cleanPhone);
    if (!user) {
      user = {
        id: `usr-admin-${Date.now()}`,
        phone: cleanPhone,
        fullName: fullName.trim() || 'مدیریت سامانه',
        role: 'admin',
        createdAt: new Date().toISOString(),
      };
      await db.saveUser(user);
    } else if (user.role !== 'admin') {
      user.role = 'admin';
      if (fullName.trim()) user.fullName = fullName.trim();
      await db.saveUser(user);
    }

    // Sign JWT token valid for 30 days
    const token = signJwt({
      id: user.id,
      phone: user.phone,
      role: 'admin',
      fullName: user.fullName,
    });

    res.json({
      success: true,
      user,
      token,
      message: 'ورود مدیر با کلید امنیتی با موفقیت انجام شد',
    });
  } catch (error) {
    console.error('Error in admin secret key login:', error);
    res.status(500).json({ error: 'خطا در ورود مدیر با کلید امنیتی' });
  }
});

apiRouter.get('/auth/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token) {
      return res.status(401).json({ error: 'توکن احراز هویت ارائه نشده است' });
    }

    const payload = verifyJwt(token);
    if (!payload) {
      return res.status(401).json({ error: 'نشست کاربری منقضی یا نامعتبر شده است' });
    }

    let user = await db.getUserByPhone(payload.phone);
    if (!user) return res.status(401).json({ error: 'User no longer exists' });

    // Refresh token
    const freshToken = signJwt({
      id: user.id,
      phone: user.phone,
      role: user.role,
      fullName: user.fullName,
    });

    res.json({
      success: true,
      user,
      token: freshToken,
    });
  } catch (error) {
    console.error('Error restoring session in /auth/me:', error);
    res.status(500).json({ error: 'خطا در بازیابی نشست کاربری' });
  }
});

// -------------------------------------------------------------
// 3. Events Management
// -------------------------------------------------------------
apiRouter.get('/events', async (req: Request, res: Response) => {
  try {
    // Try Redis cache
    const cacheKey = 'cache:events:all';
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const events = await db.getEvents();
    // Cache for 60 seconds
    await cache.set(cacheKey, JSON.stringify(events), 60);
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'خطا در دریافت لیست رویدادها' });
  }
});

apiRouter.get('/events/:id', async (req: Request, res: Response) => {
  try {
    const event = await db.getEventById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'رویداد یافت نشد' });
    }
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: 'خطا در دریافت رویداد' });
  }
});

apiRouter.post('/events', async (req: Request, res: Response) => {
  try {
    const {
      title,
      category,
      shamsiStartDate,
      durationDays,
      location,
      description,
      bannerUrl,
      maxBooths,
      boothPrice,
      rulesAndInstructions,
      contractTemplateText,
      boothLocations,
      boothTypes,
      boothRequirements,
    } = req.body;

    if (!title || !shamsiStartDate || !location) {
      return res.status(400).json({ error: 'نام رویداد، تاریخ شمسی و محل برگزاری الزامی است' });
    }

    const newEvent: EventItem = {
      id: `evt-${Date.now()}`,
      title: title.trim(),
      category: category?.trim() || 'عمومی',
      shamsiStartDate: shamsiStartDate.trim(),
      durationDays: Number(durationDays) || 1,
      location: location.trim(),
      description: description?.trim() || '',
      bannerUrl: bannerUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80',
      maxBooths: Number(maxBooths) || 50,
      boothPrice: boothPrice || 'توافقی',
      rulesAndInstructions: rulesAndInstructions || '',
      contractTemplateText: contractTemplateText || '',
      boothLocations: Array.isArray(boothLocations) && boothLocations.length > 0 ? boothLocations : ['سالن اصلی', 'سالن شماره ۲', 'محوطه باز'],
      boothTypes: Array.isArray(boothTypes) && boothTypes.length > 0 ? boothTypes : [
        { id: 'standard', title: 'استاندارد', price: boothPrice || '۱۰,۰۰۰,۰۰۰ تومان', description: 'پارتیشن و روشنایی' },
        { id: 'special', title: 'خودساز (ویژه)', price: '۱۸,۰۰۰,۰۰۰ تومان', description: 'دکوراسیون سفارشی' },
        { id: 'island', title: 'جزیره (۴ طرف باز)', price: '۲۵,۰۰۰,۰۰۰ تومان', description: 'دید کامل' }
      ],
      boothRequirements: Array.isArray(boothRequirements) && boothRequirements.length > 0 ? boothRequirements : [
        'برق تک‌فاز ۱۶ آمپر استاندارد',
        'برق سه‌فاز صنعتی',
        'اینترنت فیبر نوری اختصاصی',
        'میز کانتر و صندلی پرسنلی',
        'استند و رول‌آپ تبلیغاتی',
        'اسپات‌لایت و نورپردازی موضعی'
      ],
      createdAt: new Date().toISOString(),
    };

    await db.saveEvent(newEvent);
    // Invalidate events cache
    await cache.del('cache:events:all');

    res.status(201).json({ success: true, event: newEvent });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'خطا در ایجاد رویداد جدید' });
  }
});

apiRouter.patch('/events/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await db.getEventById(id);
    if (!existing) {
      return res.status(404).json({ error: 'رویداد یافت نشد' });
    }

    const updated = await db.updateEvent(id, req.body);
    await cache.del('cache:events:all');
    res.json({ success: true, event: updated });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی رویداد' });
  }
});

apiRouter.delete('/events/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.deleteEvent(id);
    await cache.del('cache:events:all');
    res.json({ success: true, message: 'رویداد با موفقیت حذف شد' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'خطا در حذف رویداد' });
  }
});

// -------------------------------------------------------------
// 4. Vendors & Registrations
// -------------------------------------------------------------
apiRouter.get('/events/:id/vendors', async (req: Request, res: Response) => {
  try {
    const all = await db.getVendors(req.params.id);
    const approved = all.filter((v) => v.status === 'approved');
    res.json(approved.map(publicVendor));
  } catch (error) {
    res.status(500).json({ error: 'خطا در دریافت غرفه‌داران رویداد' });
  }
});

apiRouter.get('/vendors', async (req: Request, res: Response) => {
  try {
    const { eventId, status, userId } = req.query;
    let vendors = await db.getVendors(eventId as string | undefined);
    if (userId) {
      vendors = vendors.filter((v) => v.userId === userId);
    }
    if (status) {
      vendors = vendors.filter((v) => v.status === status);
    }
    res.json(res.locals.user?.role === 'admin' ? vendors : vendors.filter(v => v.status === 'approved' || v.userId === res.locals.user?.id).map(v => v.userId === res.locals.user?.id ? v : publicVendor(v)));
  } catch (error) {
    res.status(500).json({ error: 'خطا در دریافت لیست غرفه‌داران' });
  }
});

// Registration endpoint (supports both /vendors and /vendors/register)
const handleVendorRegistration = async (req: Request, res: Response) => {
  try {
    const {
      eventId,
      userId,
      brandName,
      guildGroup,
      description,
      phone,
      email,
      website,
      logoUrl,
      documents = [],
      boothType = 'standard',
      selectedLocation = '',
      requestedFacilities = [],
      isContractSigned = false,
      signedBy = '',
      signedAt = '',
    } = req.body;

    if (!eventId || !brandName || !guildGroup) {
      return res.status(400).json({ error: 'انتخاب رویداد، نام برند و صنف/گروه الزامی است' });
    }

    const event = await db.getEventById(eventId);
 if(!event) return res.status(404).json({error:'Event not found'});
 const registrations = await db.getVendors(eventId);
 if(registrations.filter(v=>v.status !== 'rejected').length >= event.maxBooths) return res.status(409).json({error:'Capacity reached'});
 if(registrations.some(v=>v.userId === res.locals.user.id)) return res.status(409).json({error:'Already registered'});
 const cleanWebsite = (website || '').trim();
    if (!cleanWebsite) {
      return res.status(400).json({ error: 'آدرس وب‌سایت یا پیج شبکه اجتماعی (اینستاگرام، لینکدین و...) الزامی است' });
    }

    const cleanLogo = (logoUrl || '').trim();
    const hasRealLogo = Boolean(cleanLogo && cleanLogo.length > 5);

    const newVendor: VendorRegistration = {
      id: `vnd-${Date.now()}`,
      eventId,
      userId: res.locals.user.id,
      brandName: brandName.trim(),
      guildGroup: guildGroup.trim(),
      description: description?.trim() || '',
      phone: res.locals.user.phone,
      email: email?.trim() || '',
      website: cleanWebsite,
      logoUrl: hasRealLogo ? cleanLogo : '',
      hasLogo: hasRealLogo,
      documents: Array.isArray(documents) ? documents : [],
      boothType: boothType || 'standard',
      selectedLocation: selectedLocation?.trim() || '',
      requestedFacilities: Array.isArray(requestedFacilities) ? requestedFacilities : [],
      assignedBoothNumber: '',
      isContractSigned: Boolean(isContractSigned),
      signedBy: signedBy?.trim() || '',
      signedAt: signedAt?.trim() || (isContractSigned ? new Date().toISOString() : ''),
      status: 'pending', // Starts pending admin approval
      adminNotes: 'در انتظار بررسی مدارک، پیج/وب‌سایت و جانمایی توسط دبیرخانه رویداد',
      ratingAverage: 5.0,
      ratingCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.saveVendor(newVendor);
    await cache.del('cache:events:all');

    // Trigger SMS Notifications: 1 to vendor, 1 to all admins in the database (asynchronous)
    Promise.all([
      db.getEventById(eventId),
      db.getAdminPhones(),
    ]).then(([ev, adminPhones]) => {
      notifyVendorRequestCreated({
        vendorPhone: newVendor.phone,
        brandName: newVendor.brandName,
        eventTitle: ev?.title || 'رویداد نمایشگاهی',
        adminPhones,
      }).catch((e) => console.error('SMS notification error on vendor request:', e));
    }).catch(() => {});

    res.status(201).json({ success: true, vendor: newVendor });
  } catch (error) {
    console.error('Error in vendor registration:', error);
    res.status(500).json({ error: 'خطا در ثبت درخواست غرفه' });
  }
};

apiRouter.post('/vendors/register', handleVendorRegistration);
apiRouter.post('/vendors', handleVendorRegistration);

apiRouter.patch('/vendors/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const vendor = await db.getVendorById(id);
    if (!vendor) {
      return res.status(404).json({ error: 'غرفه‌دار یافت نشد' });
    }

    const previousStatus = vendor.status;
    const fields = req.body;
    if (fields.status) vendor.status = fields.status;
    if (fields.assignedBoothNumber !== undefined) vendor.assignedBoothNumber = fields.assignedBoothNumber.trim();
    if (fields.adminNotes !== undefined) vendor.adminNotes = fields.adminNotes.trim();
    if (fields.brandName !== undefined) vendor.brandName = fields.brandName.trim();
    if (fields.guildGroup !== undefined) vendor.guildGroup = fields.guildGroup.trim();
    if (fields.description !== undefined) vendor.description = fields.description.trim();
    if (fields.email !== undefined) vendor.email = fields.email.trim();
    if (fields.website !== undefined) vendor.website = fields.website.trim();
    if (fields.logoUrl !== undefined) {
      const clean = fields.logoUrl ? fields.logoUrl.trim() : '';
      vendor.logoUrl = clean;
      vendor.hasLogo = Boolean(clean && clean.length > 5);
    }
    if (fields.hasLogo !== undefined) {
      vendor.hasLogo = Boolean(fields.hasLogo);
    }
    if (fields.selectedLocation !== undefined) vendor.selectedLocation = fields.selectedLocation;
    if (fields.boothType !== undefined) vendor.boothType = fields.boothType;
    if (fields.requestedFacilities !== undefined) vendor.requestedFacilities = fields.requestedFacilities;
    if (fields.isContractSigned !== undefined) {
      vendor.isContractSigned = Boolean(fields.isContractSigned);
      if (vendor.isContractSigned && !vendor.signedAt) {
        vendor.signedAt = fields.signedAt || new Date().toISOString();
      }
      if (fields.signedBy) {
        vendor.signedBy = fields.signedBy.trim();
      }
    }
    if (fields.documents !== undefined) vendor.documents = fields.documents;
    vendor.updatedAt = new Date().toISOString();

    await db.saveVendor(vendor);
    await cache.del('cache:events:all');

    // If status changed, send SMS notification to vendor ONLY
    if (fields.status && fields.status !== previousStatus) {
      db.getEventById(vendor.eventId).then((ev) => {
        notifyVendorStatusChanged({
          vendorPhone: vendor.phone,
          brandName: vendor.brandName,
          eventTitle: ev?.title || 'رویداد نمایشگاهی',
          newStatus: vendor.status,
          assignedBoothNumber: vendor.assignedBoothNumber,
          adminNotes: vendor.adminNotes,
        }).catch((e) => console.error('SMS notification error on status update:', e));
      }).catch(() => {});
    }

    res.json({ success: true, vendor });
  } catch (error) {
    console.error('Error updating vendor:', error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی اطلاعات غرفه' });
  }
});

apiRouter.patch('/vendors/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, assignedBoothNumber, adminNotes } = req.body;

    const vendor = await db.getVendorById(id);
    if (!vendor) {
      return res.status(404).json({ error: 'غرفه‌دار یافت نشد' });
    }

    const previousStatus = vendor.status;
    if (status) vendor.status = status;
    if (assignedBoothNumber !== undefined) vendor.assignedBoothNumber = assignedBoothNumber.trim();
    if (adminNotes !== undefined) vendor.adminNotes = adminNotes.trim();
    vendor.updatedAt = new Date().toISOString();

    await db.saveVendor(vendor);
    await cache.del('cache:events:all');

    // If status changed, send SMS notification to vendor ONLY
    if (status && status !== previousStatus) {
      db.getEventById(vendor.eventId).then((ev) => {
        notifyVendorStatusChanged({
          vendorPhone: vendor.phone,
          brandName: vendor.brandName,
          eventTitle: ev?.title || 'رویداد نمایشگاهی',
          newStatus: vendor.status,
          assignedBoothNumber: vendor.assignedBoothNumber,
          adminNotes: vendor.adminNotes,
        }).catch((e) => console.error('SMS notification error on status update:', e));
      }).catch(() => {});
    }

    res.json({ success: true, vendor });
  } catch (error) {
    console.error('Error updating vendor status:', error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی وضعیت غرفه‌دار' });
  }
});

// -------------------------------------------------------------
// 5. Visitor Star Rating & Reviews
// -------------------------------------------------------------
apiRouter.get('/vendors/:id/reviews', async (req: Request, res: Response) => {
  try {
    const reviews = await db.getReviews(req.params.id);
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: 'خطا در دریافت نظرات غرفه' });
  }
});

apiRouter.post('/vendors/:id/review', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { stars, comment, reviewerName, eventId } = req.body;

    const numStars = Math.min(5, Math.max(1, parseInt(stars, 10) || 5));

    const review: VendorReview = {
      id: `rev-${Date.now()}`,
      vendorRegistrationId: id,
      eventId: eventId || '',
      reviewerName: reviewerName?.trim() || 'بازدیدکننده ناشناس',
      stars: numStars,
      comment: comment?.trim() || 'ثبت امتیاز غرفه',
      createdAt: new Date().toISOString(),
    };

    await db.addReview(review);
    const updatedVendor = await db.getVendorById(id);

    res.status(201).json({ success: true, review, vendor: updatedVendor });
  } catch (error) {
    console.error('Error submitting vendor review:', error);
    res.status(500).json({ error: 'خطا در ثبت امتیاز غرفه' });
  }
});

// -------------------------------------------------------------
// 6. Object Storage Upload (MinIO & Fallback)
// -------------------------------------------------------------
apiRouter.post('/upload', async (req: Request, res: Response) => {
  try {
    const { filename, dataUrl, mimeType = 'image/png' } = req.body;
    if (!dataUrl) {
      return res.status(400).json({ error: 'محتوای فایل ارسالی خالی است' });
    }

    if(!['image/png','image/jpeg','image/webp','application/pdf'].includes(mimeType)) return res.status(400).json({error:'Unsupported file type'});
 // Extract base64
    const base64Data = dataUrl.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const safeName = `${Date.now()}-${(filename || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const url = await storage.upload(safeName, buffer, mimeType);
    res.json({ success: true, url, filename: safeName });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'خطا در بارگذاری فایل' });
  }
});

apiRouter.get('/files/:key', async (req: Request, res: Response) => {
  try {
    const file = await storage.getFile(req.params.key);
    if (!file) {
      return res.status(404).send('فایل یافت نشد');
    }
    res.setHeader('Content-Type', file.mimeType);
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'");
    res.send(file.buffer);
  } catch (error) {
    res.status(500).send('خطا در دریافت فایل');
  }
});

// -------------------------------------------------------------
// 7. Event Catalog Export Data
// -------------------------------------------------------------
apiRouter.get('/catalog/:eventId', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const event = await db.getEventById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'رویداد یافت نشد' });
    }

    const allVendors = await db.getVendors(eventId);
    const approvedVendors = allVendors.filter((v) => v.status === 'approved');

    // Group by guild/subject
    const categoriesMap: { [cat: string]: VendorRegistration[] } = {};
    approvedVendors.forEach((v) => {
      if (!categoriesMap[v.guildGroup]) categoriesMap[v.guildGroup] = [];
      categoriesMap[v.guildGroup].push(publicVendor(v) as VendorRegistration);
    });

    res.json({
      event,
      totalVendors: approvedVendors.length,
      categories: categoriesMap,
      vendors: approvedVendors.map(publicVendor),
    });
  } catch (error) {
    res.status(500).json({ error: 'خطا در تهیه داده‌های کاتالوگ رویداد' });
  }
});

// -------------------------------------------------------------
// 8. Sponsors & Sponsorship Requests
// -------------------------------------------------------------
apiRouter.get('/sponsors', async (req: Request, res: Response) => {
  try {
    const { eventId, onlyApproved } = req.query;
    const sponsors = await db.getSponsors(
      eventId as string | undefined,
      onlyApproved === 'true'
    );
    res.json(res.locals.user?.role === 'admin' ? sponsors : sponsors.filter(s=>s.status === 'approved').map(({phone,email,contactPerson,budgetProposal,message,adminNotes,...safe})=>safe));
  } catch (error) {
    res.status(500).json({ error: 'خطا در دریافت لیست اسپانسرها' });
  }
});

apiRouter.post('/sponsors', async (req: Request, res: Response) => {
  try {
    const {
      eventId,
      companyName,
      brandName,
      contactPerson,
      phone,
      email,
      website,
      logoUrl,
      tier = 'silver',
      budgetProposal,
      message,
    } = req.body;

    if (!brandName || !contactPerson || !phone) {
      return res.status(400).json({ error: 'نام برند، شخص رابط و شماره تماس الزامی است' });
    }

    let eventTitle = '';
    if (eventId) {
      const event = await db.getEventById(eventId);
      if (event) eventTitle = event.title;
    }

    const newSponsor: SponsorItem = {
      id: `spn-${Date.now()}`,
      eventId: eventId || '',
      eventTitle,
      companyName: (companyName || brandName).trim(),
      brandName: brandName.trim(),
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      email: (email || '').trim(),
      website: (website || '').trim(),
      logoUrl: (logoUrl || '').trim(),
      tier,
      budgetProposal: (budgetProposal || '').trim(),
      message: (message || '').trim(),
      status: 'pending', // Starts pending admin review
      createdAt: new Date().toISOString(),
    };

    await db.saveSponsor(newSponsor);
    res.status(201).json({ success: true, sponsor: newSponsor });
  } catch (error) {
    console.error('Error in sponsor registration:', error);
    res.status(500).json({ error: 'خطا در ثبت درخواست اسپانسری' });
  }
});

apiRouter.patch('/sponsors/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'وضعیت جدید الزامی است' });
    }

    const updated = await db.updateSponsorStatus(id, status as SponsorStatus, adminNotes);
    if (!updated) {
      return res.status(404).json({ error: 'اسپانسر یافت نشد' });
    }
    res.json({ success: true, sponsor: updated });
  } catch (error) {
    res.status(500).json({ error: 'خطا در تغییر وضعیت اسپانسر' });
  }
});

apiRouter.delete('/sponsors/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.deleteSponsor(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطا در حذف اسپانسر' });
  }
});

// -------------------------------------------------------------
// Admin Users Management (Dynamic SMS recipients from Database)
// -------------------------------------------------------------
apiRouter.get('/admins', async (req: Request, res: Response) => {
  try {
    const admins = await db.getAdminUsers();
    res.json(admins);
  } catch (error) {
    console.error('Error getting admin users:', error);
    res.status(500).json({ error: 'خطا در دریافت لیست مدیران سامانه' });
  }
});

apiRouter.post('/admins', async (req: Request, res: Response) => {
  try {
    const { phone, fullName } = req.body;
    const cleanPhone = phone?.trim();
    if (!cleanPhone || cleanPhone.length !== 11 || !cleanPhone.startsWith('09')) {
      return res.status(400).json({ error: 'شماره موبایل ۱۱ رقمی معتبر وارد نمایید (مانند ۰۹۱۲۳۴۵۶۷۸۹)' });
    }

    let user = await db.getUserByPhone(cleanPhone);
    if (user) {
      user.role = 'admin';
      if (fullName?.trim()) user.fullName = fullName.trim();
      await db.saveUser(user);
    } else {
      user = {
        id: `usr-admin-${Date.now()}`,
        phone: cleanPhone,
        fullName: fullName?.trim() || 'مدیر سامانه',
        role: 'admin',
        createdAt: new Date().toISOString(),
      };
      await db.saveUser(user);
    }

    res.json({
      success: true,
      user,
      message: 'مدیر جدید با موفقیت در پایگاه‌داده ذخیره شد و پیامک‌های اطلاع‌رسانی غرفه‌ها برای این شماره ارسال خواهد شد.',
    });
  } catch (error) {
    console.error('Error adding admin user:', error);
    res.status(500).json({ error: 'خطا در ثبت مدیر جدید' });
  }
});

apiRouter.delete('/admins/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminUsers = await db.getAdminUsers();
    if (adminUsers.length <= 1) {
      return res.status(400).json({ error: 'حداقل یک مدیر در سامانه باید باقی بماند و نمی‌توان همه مدیران را حذف نمود.' });
    }

    await db.deleteUser(id);
    res.json({ success: true, message: 'مدیر مورد نظر با موفقیت حذف گردید.' });
  } catch (error) {
    console.error('Error deleting admin user:', error);
    res.status(500).json({ error: 'خطا در حذف مدیر' });
  }
});
