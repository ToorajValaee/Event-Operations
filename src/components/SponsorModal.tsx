import { apiFetch as fetch } from '../api';
import React, { useState, useEffect } from 'react';
import { EventItem, SponsorTier } from '../types';
import {
  X,
  Upload,
  CheckCircle2,
  Award,
  Building2,
  Phone,
  Mail,
  Globe,
  Sparkles,
  DollarSign,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface SponsorModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: EventItem[];
  defaultEventId?: string;
  onSuccess?: () => void;
  platformName?: string;
}

export const SponsorModal: React.FC<SponsorModalProps> = ({
  isOpen,
  onClose,
  events,
  defaultEventId = '',
  onSuccess,
  platformName = 'سامانه رویدادها',
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string>(defaultEventId);
  const [brandName, setBrandName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [tier, setTier] = useState<SponsorTier>('gold');
  const [budgetProposal, setBudgetProposal] = useState('');
  const [message, setMessage] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (defaultEventId) {
      setSelectedEventId(defaultEventId);
    } else if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [defaultEventId, events]);

  if (!isOpen) return null;

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setErrorMsg('');
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dataUrl: reader.result,
              filename: file.name,
              mimeType: file.type,
            }),
          });
          const data = await res.json();
          if (res.ok && data.url) {
            setLogoUrl(data.url);
          } else {
            setErrorMsg('خطا در بارگذاری لوگو');
          }
        } catch {
          setErrorMsg('خطا در ارتباط با سرور آپلود');
        } finally {
          setUploadingLogo(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadingLogo(false);
      setErrorMsg('خطا در خواندن فایل تصویر');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedEventId) {
      setErrorMsg('لطفاً رویداد هدف جهت اسپانسری را انتخاب فرمایید.');
      return;
    }
    if (!brandName.trim()) {
      setErrorMsg('لطفاً نام برند تجاری را وارد فرمایید.');
      return;
    }
    if (!contactPerson.trim()) {
      setErrorMsg('نام و نام خانوادگی رابط الزامی است.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('شماره تماس همراه الزامی است.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/sponsors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEventId || undefined,
          companyName: companyName.trim() || brandName.trim(),
          brandName: brandName.trim(),
          contactPerson: contactPerson.trim(),
          phone: phone.trim(),
          email: email.trim(),
          website: website.trim(),
          logoUrl: logoUrl.trim(),
          tier,
          budgetProposal: budgetProposal.trim(),
          message: message.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsSuccess(true);
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(data.error || 'خطا در ثبت درخواست اسپانسری');
      }
    } catch {
      setErrorMsg('خطا در برقراری ارتباط با سرور.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-neutral-900 leading-tight">
                ثبت‌نام و درخواست اسپانسری
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                حامی رویدادهای تخصصی «{platformName}» شوید و برند خود را معرفی کنید
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {isSuccess ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-neutral-900">درخواست اسپانسری با موفقیت ثبت شد</h4>
                <p className="text-sm text-neutral-600 max-w-md mx-auto leading-relaxed">
                  از حسن توجه شما به رویدادهای «{platformName}» سپاسگزاریم. کارشناسان دبیرخانه پس از بررسی مدارک و پیشنهاد با شما تماس خواهند گرفت.
                </p>
              </div>
              <div className="pt-4">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-neutral-900 text-white font-medium text-sm hover:bg-neutral-800 transition cursor-pointer"
                >
                  بستن پنجره
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Event Selection */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  انتخاب رویداد جهت حمایت مالی (اسپانسری) <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
                >
                  <option value="" disabled>-- لطفاً رویداد مورد نظر را انتخاب کنید --</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} ({ev.category})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-neutral-400 mt-1">
                  لوگو و نام برند شما به صورت اختصاصی در صفحه، کارت رویداد و کاتالوگ این رویداد درج خواهد شد.
                </p>
              </div>

              {/* Tier Selection */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  سطح حمایت مدنظر (Sponsorship Tier)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(
                    [
                      { id: 'platinum', title: 'پلاتینیوم', desc: 'بالاترین دیداری', color: 'border-cyan-400 bg-cyan-50/50 text-cyan-900' },
                      { id: 'gold', title: 'طلایی', desc: 'حامی ویژه', color: 'border-amber-400 bg-amber-50/50 text-amber-900' },
                      { id: 'silver', title: 'نقره‌ای', desc: 'حامی رسمی', color: 'border-neutral-400 bg-neutral-100 text-neutral-800' },
                      { id: 'bronze', title: 'برنزی', desc: 'حامی رویداد', color: 'border-orange-400 bg-orange-50/50 text-orange-900' },
                      { id: 'supporter', title: 'رسانه‌ای/معنوی', desc: 'تبادل خدمات', color: 'border-indigo-400 bg-indigo-50/50 text-indigo-900' },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTier(item.id)}
                      className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center ${
                        tier === item.id
                          ? `${item.color} ring-2 ring-amber-500 font-bold shadow-xs`
                          : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700'
                      }`}
                    >
                      <span className="text-xs">{item.title}</span>
                      <span className="text-[10px] text-neutral-400 mt-0.5">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Company & Brand Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    نام برند تجاری <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="مثال: دیجی‌کالا، اسنپ، بادجه و..."
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    نام رسمی شرکت / شخص حقوقی
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="مثال: شرکت نوآوران فناوری پیشرو (سهامی خاص)"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Contact Person & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    نام و نام خانوادگی رابط / مدیر برند <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="مثال: مهندس علی حسینی"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    شماره موبایل همراه <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09121234567"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-right"
                  />
                </div>
              </div>

              {/* Email & Website */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    ایمیل سازمانی
                  </label>
                  <input
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sponsor@company.ir"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-right"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    وب‌سایت یا لینک شبکه اجتماعی
                  </label>
                  <input
                    type="url"
                    dir="ltr"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://company.ir"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-right"
                  />
                </div>
              </div>

              {/* Logo Upload / URL */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  لوگوی برند (جهت درج در بنر متحرک رویداد)
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {logoUrl ? (
                    <div className="relative w-16 h-16 rounded-xl border border-neutral-200 p-1 bg-white shrink-0 shadow-xs">
                      <img
                        src={logoUrl}
                        alt="Logo Preview"
                        className="w-full h-full object-contain rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setLogoUrl('')}
                        className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs hover:bg-rose-600 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ) : null}

                  <div className="flex-1 w-full flex items-center gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-neutral-300 hover:border-amber-500 hover:bg-amber-50/30 transition cursor-pointer text-xs font-medium text-neutral-600">
                      <Upload className="w-4 h-4 text-neutral-400" />
                      <span>{uploadingLogo ? 'در حال آپلود...' : 'انتخاب و آپلود لوگوی رسمی'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                        className="hidden"
                      />
                    </label>
                    <span className="text-xs text-neutral-400">یا</span>
                    <input
                      type="url"
                      dir="ltr"
                      placeholder="لینک مستقیم عکس..."
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-neutral-300 text-xs text-right"
                    />
                  </div>
                </div>
              </div>

              {/* Proposed Budget */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  بودجه یا نوع حمایت پیشنهادی
                </label>
                <input
                  type="text"
                  value={budgetProposal}
                  onChange={(e) => setBudgetProposal(e.target.value)}
                  placeholder="مثال: ۵۰ میلیون تومان، یا تامین اینترنت اختصاصی، ترابری و..."
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  پیام یا توضیحات بیشتر برای دبیرخانه
                </label>
                <textarea
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="نیازمندی‌ها، انتظارات تبلیغاتی یا جزئیات پکیج حمایتی..."
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-neutral-600 hover:bg-neutral-100 text-sm font-medium transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingLogo}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium text-sm shadow-sm transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>در حال ثبت...</span>
                    </>
                  ) : (
                    <>
                      <Award className="w-4 h-4" />
                      <span>ارسال نهایی درخواست اسپانسری</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
