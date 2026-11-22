import { apiFetch as fetch } from '../api';
import React, { useState, useEffect } from 'react';
import { EventItem, VendorRegistration, User, BoothType } from '../types';
import { formatShamsiLong, toPersianDigits } from '../utils/shamsi';
import {
  Store,
  Upload,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Check,
  Send,
  Award,
  Lock,
  Calendar,
  Layers,
  MapPin,
  FileCheck2,
  Clock,
  Plus,
  ExternalLink,
  ShieldCheck,
  X,
  Sparkles,
  Camera,
  ChevronLeft,
  ChevronDown,
  Globe,
} from 'lucide-react';

interface VendorPanelProps {
  events: EventItem[];
  currentUser: User | null;
  onOpenAuth: () => void;
  selectedEventIdPreset?: string;
  onRegistrationSuccess: () => void;
  userRegistrations: VendorRegistration[];
  onBackToLanding?: () => void;
}

export const VendorPanel: React.FC<VendorPanelProps> = ({
  events,
  currentUser,
  onOpenAuth,
  selectedEventIdPreset,
  onRegistrationSuccess,
  userRegistrations,
  onBackToLanding,
}) => {
  // Main Panel Tabs: "events" (event requests, booth, requirements, sign contract) vs "info" (brand info & logo)
  const [activeTab, setActiveTab] = useState<'events' | 'info'>('events');

  // Existing first registration (to prefill brand info if user already registered)
  const latestReg = userRegistrations[0];

  // Brand Info State
  const [brandName, setBrandName] = useState(latestReg?.brandName || '');
  const [guildGroup, setGuildGroup] = useState(latestReg?.guildGroup || 'فناوری اطلاعات و نرم‌افزار');
  const [description, setDescription] = useState(latestReg?.description || '');
  // Mobile phone is locked to registered account phone!
  const lockedPhone = currentUser?.phone || latestReg?.phone || '09121234567';
  const [website, setWebsite] = useState(latestReg?.website || '');
  const [email, setEmail] = useState(latestReg?.email || '');
  const [logoUrl, setLogoUrl] = useState(latestReg?.logoUrl || '');
  const [brandDocs, setBrandDocs] = useState<
    { name: string; url: string; type: 'contract' | 'license' | 'id_card' | 'other' }[]
  >(latestReg?.documents || []);

  const [savingBrandInfo, setSavingBrandInfo] = useState(false);
  const [brandSaveSuccess, setBrandSaveSuccess] = useState('');

  // New Event Registration Form Modal / Drawer state
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>(
    selectedEventIdPreset || (events[0]?.id || '')
  );
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [boothType, setBoothType] = useState<BoothType>('standard');
  const [facilities, setFacilities] = useState<string[]>([]);
  const [isAgreedAndSigned, setIsAgreedAndSigned] = useState(true);
  const [signatoryName, setSignatoryName] = useState(currentUser?.fullName || '');
  const [submittingReg, setSubmittingReg] = useState(false);
  const [regError, setRegError] = useState('');

  // Per-registration contract signing state
  const [signingRegId, setSigningRegId] = useState<string | null>(null);
  const [signNameInput, setSignNameInput] = useState(currentUser?.fullName || '');
  const [agreeTermsChecked, setAgreeTermsChecked] = useState(false);
  const [signingContract, setSigningContract] = useState(false);

  // Upload progress states
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Synchronize brand info from props if they change
  useEffect(() => {
    if (latestReg) {
      if (!brandName) setBrandName(latestReg.brandName);
      if (!logoUrl && latestReg.hasLogo && latestReg.logoUrl && latestReg.logoUrl.trim().length > 5) {
        setLogoUrl(latestReg.logoUrl);
      }
      if (!description) setDescription(latestReg.description);
      if (!website) setWebsite(latestReg.website || '');
      if (!email) setEmail(latestReg.email || '');
      if (brandDocs.length === 0 && latestReg.documents?.length > 0) {
        setBrandDocs(latestReg.documents);
      }
    }
  }, [latestReg]);

  // Target event for registration
  const targetEvent = events.find((e) => e.id === selectedEventId) || events[0];

  // Initialize selected location when target event changes
  useEffect(() => {
    if (targetEvent?.boothLocations && targetEvent.boothLocations.length > 0) {
      if (!selectedLocation || !targetEvent.boothLocations.includes(selectedLocation)) {
        setSelectedLocation(targetEvent.boothLocations[0]);
      }
    } else {
      setSelectedLocation('سالن اصلی');
    }

    if (targetEvent?.boothTypes && targetEvent.boothTypes.length > 0) {
      setBoothType(targetEvent.boothTypes[0].title);
    }
  }, [targetEvent]);

  const commonGuilds = [
    'فناوری اطلاعات و نرم‌افزار',
    'هوش مصنوعی و داده',
    'مخابرات و ارتباطات',
    'صنایع دستی و هنر',
    'صنایع غذایی و کشاورزی',
    'پوشاک و منسوجات',
    'تجهیزات پزشکی و سلامت',
    'صنعت خودرو و قطعات',
    'استارتاپ و تجارت الکترونیک',
    'صنعت ساختمان و تاسیسات',
    'سایر اصناف',
  ];

  // Toggle facility selection in new request
  const toggleFacility = (item: string) => {
    if (facilities.includes(item)) {
      setFacilities(facilities.filter((f) => f !== item));
    } else {
      setFacilities([...facilities, item]);
    }
  };

  // Upload handler via `/api/upload`
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'logo' | 'license' | 'other'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      if (type === 'logo') setUploadingLogo(true);
      else setUploadingDoc(true);

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            dataUrl: base64Data,
            mimeType: file.type || (type === 'logo' ? 'image/png' : 'application/pdf'),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'خطا در آپلود فایل');

        if (type === 'logo') {
          setLogoUrl(data.url);
        } else {
          setBrandDocs((prev) => [
            ...prev,
            { name: file.name, url: data.url, type: type as 'license' | 'other' },
          ]);
        }
      } catch (err) {
        alert('خطا در بارگذاری فایل: ' + (err as Error).message);
      } finally {
        setUploadingLogo(false);
        setUploadingDoc(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Save Brand Info
  const handleSaveBrandInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!website.trim()) {
      alert('آدرس وب‌سایت یا لینک شبکه اجتماعی (اینستاگرام، لینکدین و...) الزامی است.');
      return;
    }
    setSavingBrandInfo(true);
    setBrandSaveSuccess('');

    try {
      const cleanLogo = logoUrl ? logoUrl.trim() : '';
      const hasRealLogo = Boolean(cleanLogo && cleanLogo.length > 5);

      if (userRegistrations.length > 0) {
        await Promise.all(
          userRegistrations.map((reg) =>
            fetch(`/api/vendors/${reg.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                brandName: brandName.trim(),
                guildGroup: guildGroup.trim(),
                description: description.trim(),
                website: website.trim(),
                email: email.trim(),
                logoUrl: hasRealLogo ? cleanLogo : '',
                hasLogo: hasRealLogo,
                documents: brandDocs,
              }),
            })
          )
        );
      }

      setBrandSaveSuccess('مشخصات و لوگوی برند با موفقیت ذخیره شد.');
      onRegistrationSuccess();
      setTimeout(() => setBrandSaveSuccess(''), 4000);
    } catch (err) {
      alert('خطا در ذخیره مشخصات: ' + (err as Error).message);
    } finally {
      setSavingBrandInfo(false);
    }
  };

  // Submit new registration request for an event
  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!currentUser) {
      onOpenAuth();
      return;
    }

    if (!brandName.trim()) {
      setRegError('لطفاً نام شرکت یا برند را وارد فرمایید.');
      return;
    }

    if (!website.trim()) {
      setRegError('آدرس وب‌سایت یا لینک شبکه اجتماعی (اینستاگرام یا لینکدین) الزامی است. بررسی و اعتبارسنجی اولیه توسط دبیرخانه بر اساس این پیج صورت می‌پذیرد.');
      return;
    }

    if (!selectedEventId) {
      setRegError('لطفاً یک رویداد را انتخاب نمایید.');
      return;
    }

    setSubmittingReg(true);
    try {
      const isSigned = isAgreedAndSigned && Boolean(signatoryName.trim());
      const cleanLogo = logoUrl ? logoUrl.trim() : '';
      const hasRealLogo = Boolean(cleanLogo && cleanLogo.length > 5);

      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEventId,
          userId: currentUser.id,
          brandName: brandName.trim(),
          guildGroup,
          description: description.trim(),
          phone: lockedPhone,
          website: website.trim(),
          email: email.trim(),
          logoUrl: hasRealLogo ? cleanLogo : '',
          hasLogo: hasRealLogo,
          documents: brandDocs,
          boothType,
          selectedLocation,
          requestedFacilities: facilities,
          isContractSigned: isSigned,
          signedBy: isSigned ? signatoryName.trim() : '',
          signedAt: isSigned ? new Date().toLocaleDateString('fa-IR') : '',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ثبت درخواست');

      onRegistrationSuccess();
      setShowNewRequestModal(false);
      setActiveTab('events');
    } catch (err) {
      setRegError((err as Error).message);
    } finally {
      setSubmittingReg(false);
    }
  };

  // Sign contract for an existing event registration
  const handleSignContract = async (regId: string) => {
    if (!agreeTermsChecked) {
      alert('لطفاً ابتدا تیک موافقت و پذیرش شرایط تعهدنامه را علامت بزنید.');
      return;
    }
    if (!signNameInput.trim()) {
      alert('لطفاً نام و نام خانوادگی نماینده امضاکننده را وارد کنید.');
      return;
    }

    setSigningContract(true);
    try {
      const res = await fetch(`/api/vendors/${regId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isContractSigned: true,
          signedBy: signNameInput.trim(),
          signedAt: new Date().toLocaleDateString('fa-IR'),
        }),
      });

      if (!res.ok) throw new Error('خطا در ثبت امضای قرارداد');

      onRegistrationSuccess();
      setSigningRegId(null);
      setAgreeTermsChecked(false);
    } catch (err) {
      alert('خطا در امضای قرارداد: ' + (err as Error).message);
    } finally {
      setSigningContract(false);
    }
  };

  // -------------------------------------------------------------
  // GUEST STATE: MOBILE ONBOARDING SCREEN
  // -------------------------------------------------------------
  if (!currentUser) {
    return (
      <div className="w-full space-y-4 pb-20">
        <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-neutral-900 text-white flex items-center justify-center mx-auto shadow-sm">
            <Store className="w-8 h-8 text-neutral-100" />
          </div>

          <div className="space-y-1">
            <h2 className="text-base font-bold text-neutral-900">اپلیکیشن غرفه‌داران</h2>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
              جهت رزرو غرفه، بارگذاری لوگو در کاتالوگ و امضای الکترونیک قرارداد وارد شوید.
            </p>
          </div>

          <div className="bg-neutral-50 rounded-2xl p-4 text-xs text-neutral-700 text-right space-y-2.5 border border-neutral-200/70">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>انتخاب سالن و تیپ غرفه با تعرفه شفاف</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>بارگذاری لوگو جهت چاپ در کتابچه رسمی</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>امضای دیجیتال و صدور کارت الکترونیک غرفه</span>
            </div>
          </div>

          <button
            onClick={onOpenAuth}
            className="w-full py-3.5 rounded-2xl bg-neutral-900 active:scale-98 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
          >
            <span>ورود / ثبت‌نام با شماره موبایل</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // AUTHENTICATED STATE: NATIVE MOBILE APP INTERFACE
  // -------------------------------------------------------------
  return (
    <div className="w-full space-y-4 pb-20">
      {/* Mobile Top App Bar */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={brandName || 'برند'}
              className="w-11 h-11 rounded-xl object-contain border border-neutral-200 bg-white p-1 shrink-0 shadow-2xs"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-neutral-900 flex items-center justify-center text-white shrink-0 shadow-2xs">
              <Store className="w-6 h-6 text-neutral-100" />
            </div>
          )}

          <div className="truncate">
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold text-neutral-900 tracking-tight truncate">
                {brandName || 'پنل غرفه‌دار'}
              </h1>
            </div>
            <p className="text-[11px] font-mono text-neutral-500 mt-0.5" dir="ltr">
              {lockedPhone}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowNewRequestModal(true)}
          className="px-3 py-2 rounded-xl bg-neutral-900 active:scale-95 text-white text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">غرفه جدید</span>
        </button>
      </div>

      {/* Native Segmented Tab Control */}
      <div className="p-1 bg-neutral-200/80 rounded-xl flex items-center gap-1 touch-control">
        <button
          onClick={() => setActiveTab('events')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'events'
              ? 'bg-white text-neutral-900 shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>غرفه‌های من</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-100 text-neutral-700">
            {toPersianDigits(userRegistrations.length)}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'info'
              ? 'bg-white text-neutral-900 shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>پروفایل و هویت برند</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: EVENTS & BOOTHS (غرفه‌ها و وضعیت رویدادها) */}
      {/* ========================================================================= */}
      {activeTab === 'events' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {userRegistrations.length > 0 ? (
            userRegistrations.map((reg) => {
              const ev = events.find((e) => e.id === reg.eventId);
              const isPending = reg.status === 'pending';
              const isApproved = reg.status === 'approved';
              const isRevision = reg.status === 'revision_needed';
              const isRejected = reg.status === 'rejected';

              return (
                <div
                  key={reg.id}
                  className="bg-white rounded-2xl p-4 border border-neutral-200/90 shadow-2xs space-y-3.5"
                >
                  {/* Top Row: Event Name & Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md font-medium inline-block mb-1">
                        {ev?.category || 'رویداد'}
                      </span>
                      <h3 className="text-sm font-bold text-neutral-900 leading-tight">
                        {ev?.title || 'عنوان رویداد'}
                      </h3>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-1">
                        <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                        <span>شروع: {ev ? formatShamsiLong(ev.shamsiStartDate) : '-'}</span>
                      </div>
                    </div>

                    {/* Status Pill Badge */}
                    <div className="shrink-0">
                      {isPending && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-semibold border border-amber-200">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          <span>در حال بررسی</span>
                        </span>
                      )}
                      {isApproved && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>تایید نهایی</span>
                        </span>
                      )}
                      {isRevision && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 text-[11px] font-semibold border border-orange-200">
                          <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
                          <span>اصلاح مدارک</span>
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-[11px] font-semibold border border-rose-200">
                          <span>رد درخواست</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Secretarial Notes / Revision Alert */}
                  {reg.adminNotes && (
                    <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1">
                      <strong className="text-[11px] font-bold block text-amber-800">
                        پیام دبیرخانه رویداد:
                      </strong>
                      <p className="leading-relaxed">{reg.adminNotes}</p>
                    </div>
                  )}

                  {/* Booth Details Mobile Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Assigned Booth Number */}
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70 col-span-2 sm:col-span-1">
                      <span className="text-[11px] text-neutral-500 block mb-0.5">
                        شماره غرفه تخصیص‌یافته:
                      </span>
                      {reg.assignedBoothNumber ? (
                        <div className="font-bold text-emerald-800 flex items-center gap-1 font-mono text-sm">
                          <Award className="w-4 h-4 text-emerald-600" />
                          <span>{reg.assignedBoothNumber}</span>
                        </div>
                      ) : (
                        <span className="text-neutral-400 text-xs font-medium">
                          در انتظار تخصیص دبیرخانه
                        </span>
                      )}
                    </div>

                    {/* Location & Hall */}
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70">
                      <span className="text-[11px] text-neutral-500 block mb-0.5">سالن و موقعیت:</span>
                      <div className="font-semibold text-neutral-800 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                        <span className="truncate">{reg.selectedLocation || 'سالن اصلی'}</span>
                      </div>
                    </div>

                    {/* Booth Type */}
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70">
                      <span className="text-[11px] text-neutral-500 block mb-0.5">نوع غرفه:</span>
                      <div className="font-semibold text-neutral-800 flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-neutral-500" />
                        <span className="truncate">{reg.boothType || 'استاندارد'}</span>
                      </div>
                    </div>

                    {/* Facilities */}
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70">
                      <span className="text-[11px] text-neutral-500 block mb-0.5">امکانات:</span>
                      <span className="font-medium text-neutral-800 truncate block">
                        {reg.requestedFacilities?.length ? reg.requestedFacilities.join('، ') : 'پایه'}
                      </span>
                    </div>
                  </div>

                  {/* DIGITAL CONTRACT STATUS & SIGNING CARD */}
                  <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/70 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCheck2 className="w-4 h-4 text-neutral-800" />
                        <span className="text-xs font-bold text-neutral-900">
                          تعهدنامه و قرارداد رسمی
                        </span>
                      </div>

                      {reg.isContractSigned ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>امضا شده</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>امضا نشده</span>
                        </span>
                      )}
                    </div>

                    {reg.isContractSigned ? (
                      <div className="text-[11px] text-emerald-800 flex items-center gap-1.5 pt-0.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          امضا شده توسط: <strong>{reg.signedBy || reg.brandName}</strong> ({reg.signedAt || 'ثبت رویداد'})
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1">
                        <p className="text-[11px] text-neutral-500 leading-relaxed">
                          جهت قطعی شدن حضور در سالن و صدور کارت ورود، امضای الکترونیک تعهدنامه الزامی است.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSigningRegId(reg.id);
                            setSignNameInput(currentUser?.fullName || '');
                            setAgreeTermsChecked(false);
                          }}
                          className="w-full py-2.5 rounded-xl bg-neutral-900 active:scale-98 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>مشاهده و امضای الکترونیک قرارداد</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center bg-white rounded-3xl border border-neutral-200 p-6 space-y-3">
              <Store className="w-10 h-10 text-neutral-300 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-neutral-800">
                  هنوز غرفه‌ای ثبت نکرده‌اید
                </h4>
                <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                  با انتخاب دکمه زیر، رویداد و موقعیت سالن مورد نظر خود را برای حضور رزرو نمایید.
                </p>
              </div>
              <button
                onClick={() => setShowNewRequestModal(true)}
                className="py-3 px-5 rounded-2xl bg-neutral-900 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>ثبت‌نام در رویداد جدید</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BRAND IDENTITY & PROFILE (پروفایل و هویت برند) */}
      {/* ========================================================================= */}
      {activeTab === 'info' && (
        <form onSubmit={handleSaveBrandInfo} className="space-y-4">
          {brandSaveSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{brandSaveSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column on Desktop: Logo & Verification Notice */}
            <div className="lg:col-span-4 space-y-4">
              {/* Logo Card with Camera Badge */}
              <div className="bg-white p-5 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-4">
                <h3 className="text-xs font-bold text-neutral-900 border-b border-neutral-100 pb-2">
                  لوگوی رسمی برند
                </h3>

                <div className="flex flex-col sm:flex-row lg:flex-col items-center gap-4 text-center sm:text-right lg:text-center">
                  <div className="relative shrink-0">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={brandName || 'لوگوی برند'}
                        className="w-24 h-24 rounded-2xl object-contain border border-neutral-200 p-2 bg-white shadow-2xs"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center text-neutral-400 bg-neutral-50">
                        <ImageIcon className="w-8 h-8 stroke-1 mb-1 text-neutral-400" />
                        <span className="text-[10px] font-medium">بدون لوگو</span>
                      </div>
                    )}

                    <label className="absolute -bottom-1 -left-1 w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow-md cursor-pointer hover:scale-105 active:scale-95 transition">
                      <Camera className="w-4 h-4" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'logo')}
                      />
                    </label>
                  </div>

                  <div className="space-y-2 flex-1 text-xs">
                    <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold cursor-pointer transition">
                      <Upload className="w-3.5 h-3.5 text-neutral-600" />
                      <span>{uploadingLogo ? 'در حال آپلود...' : (logoUrl ? 'تغییر لوگو' : 'بارگذاری لوگو')}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'logo')}
                      />
                    </label>

                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl('')}
                        className="block text-[11px] text-rose-600 hover:underline pt-0.5 mx-auto"
                      >
                        حذف لوگوی فعلی
                      </button>
                    )}
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      در صورت عدم بارگذاری، غرفه با آیکون عمومی سازمانی در سامانه و ادمین نمایش داده می‌شود.
                    </p>
                  </div>
                </div>
              </div>

              {/* Verification Info Box */}
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-xs space-y-2 text-blue-950">
                <div className="flex items-center gap-1.5 font-bold text-blue-900">
                  <Globe className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>بررسی و اعتبارسنجی توسط دبیرخانه</span>
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  تایید درخواست غرفه توسط مدیران رویداد بر اساس لینک وب‌سایت یا صفحه اینستاگرام/شبکه‌های اجتماعی ثبت‌شده انجام می‌شود. ثبت لینک الزامی است.
                </p>
              </div>
            </div>

            {/* Right Column on Desktop: Brand Details & Documents */}
            <div className="lg:col-span-8 space-y-4">
              {/* Brand Profile Details Card */}
              <div className="bg-white p-5 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-3.5">
                <h3 className="text-xs font-bold text-neutral-900 border-b border-neutral-100 pb-2">
                  مشخصات عمومی و اطلاعات تماس
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                        نام تجاری / شرکت <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        placeholder="مثال: شرکت داده‌ورزی رایان"
                        className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs text-neutral-900 focus:border-neutral-900 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                        صنف و گروه تخصصی <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={guildGroup}
                        onChange={(e) => setGuildGroup(e.target.value)}
                        className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs text-neutral-900 bg-white focus:border-neutral-900 outline-none"
                      >
                        {commonGuilds.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Locked Mobile Field & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-medium text-neutral-700">
                          شماره همراه (قفل هویتی)
                        </label>
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Lock className="w-2.5 h-2.5 text-amber-600" />
                          <span>غیرقابل تغییر</span>
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          dir="ltr"
                          disabled
                          readOnly
                          value={lockedPhone}
                          className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 pl-9 text-xs font-mono text-neutral-500 bg-neutral-100 cursor-not-allowed outline-none"
                        />
                        <Lock className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-3" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                        پست الکترونیک (ایمیل)
                      </label>
                      <input
                        type="email"
                        dir="ltr"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="info@company.com"
                        className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs text-neutral-900 focus:border-neutral-900 outline-none"
                      />
                    </div>
                  </div>

                  {/* Required Website / Social Media Link */}
                  <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-neutral-900">
                        لینک وب‌سایت یا صفحه شبکه اجتماعی (اینستاگرام، لینکدین و...) <span className="text-rose-600 font-bold">* الزامی جهت ارزیابی و تایید ادمین</span>
                      </label>
                      <span className="text-[10px] bg-rose-100 text-rose-800 font-semibold px-2 py-0.5 rounded-md">
                        الزامی
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        dir="ltr"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://instagram.com/your_brand یا https://yourbrand.com"
                        className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 pl-9 text-xs text-neutral-900 bg-white focus:border-neutral-900 outline-none font-mono"
                      />
                      <Globe className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                    </div>
                    <p className="text-[10px] text-neutral-500 leading-relaxed">
                      کارشناسان دبیرخانه اصالت برند و محصولات شما را از طریق این لینک ارزیابی کرده و پس از احراز صحت، وضعیت غرفه را تایید خواهند نمود.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                      شرح محصولات و خدمات (درج در کاتالوگ)
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="توضیحات کوتاه درباره خدمات یا محصولات شاخص جهت آشنایی بازدیدکنندگان..."
                      className="w-full rounded-xl border border-neutral-300 p-3 text-xs text-neutral-900 focus:border-neutral-900 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Business Documents & Licenses */}
              <div className="bg-white p-5 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                  <h3 className="text-xs font-bold text-neutral-900">
                    مدارک و پروانه کسب‌وکار
                  </h3>
                  <label className="inline-flex items-center gap-1 text-[11px] text-neutral-800 font-semibold cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-neutral-600" />
                    <span>{uploadingDoc ? 'در حال آپلود...' : '+ افزودن مدرک'}</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'license')}
                    />
                  </label>
                </div>

                {brandDocs.length > 0 ? (
                  <div className="space-y-2">
                    {brandDocs.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="truncate font-mono text-neutral-800">{doc.name}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-neutral-700 font-medium text-[11px] underline"
                          >
                            مشاهده
                          </a>
                          <button
                            type="button"
                            onClick={() => setBrandDocs(brandDocs.filter((_, i) => i !== idx))}
                            className="text-neutral-400 hover:text-rose-600 p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-neutral-400">
                    مدرکی بارگذاری نشده است (پروانه کسب یا روزنامه رسمی اختیاری است).
                  </p>
                )}
              </div>

              {/* Save Action Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingBrandInfo}
                  className="w-full py-3.5 rounded-2xl bg-neutral-900 active:scale-98 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm safe-bottom"
                >
                  {savingBrandInfo ? 'در حال ذخیره...' : 'ذخیره و به‌روزرسانی مشخصات برند'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* NATIVE BOTTOM SHEET: NEW EVENT REGISTRATION (ثبت رویداد جدید) */}
      {/* ========================================================================= */}
      {showNewRequestModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-neutral-950/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-2xl lg:max-w-3xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-neutral-200 max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Drag Handle */}
            <div className="pt-3 pb-1 flex justify-center sm:hidden">
              <div className="w-12 h-1.5 bg-neutral-300 rounded-full" />
            </div>

            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-neutral-900" />
                <h3 className="text-sm font-bold text-neutral-900">
                  رزرو غرفه در رویداد
                </h3>
              </div>
              <button
                onClick={() => setShowNewRequestModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {regError && (
              <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {regError}
              </div>
            )}

            <form onSubmit={handleSubmitRegistration} className="p-4 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Step 1: Select Event */}
              <div className="space-y-2 p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200">
                <label className="block font-bold text-neutral-900">
                  ۱. انتخاب رویداد <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 p-2.5 text-xs text-neutral-900 bg-white outline-none"
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} (آغاز: {formatShamsiLong(ev.shamsiStartDate)})
                    </option>
                  ))}
                </select>
                {targetEvent && (
                  <div className="text-[11px] text-neutral-500 flex justify-between pt-1">
                    <span>محل: {targetEvent.location}</span>
                    <span>{toPersianDigits(targetEvent.durationDays)} روزه</span>
                  </div>
                )}
              </div>

              {/* Step 2: Brand Identity & Required Social/Website Link */}
              <div className="space-y-3 p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-neutral-900">
                    ۲. مشخصات برند و لینک اعتبارسنجی <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] bg-rose-100 text-rose-800 font-semibold px-2 py-0.5 rounded-md">
                    لینک وبسایت/اینستاگرام الزامی است
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                      نام برند / شرکت <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="نام تجاری غرفه"
                      className="w-full rounded-xl border border-neutral-300 p-2.5 text-xs text-neutral-900 bg-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                      صنف و گروه کاری <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={guildGroup}
                      onChange={(e) => setGuildGroup(e.target.value)}
                      className="w-full rounded-xl border border-neutral-300 p-2.5 text-xs text-neutral-900 bg-white outline-none"
                    >
                      {commonGuilds.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-900 mb-1">
                    آدرس وب‌سایت یا پیج شبکه اجتماعی (اینستاگرام یا لینکدین) <span className="text-rose-600 font-bold">* الزامی</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      dir="ltr"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://instagram.com/your_brand یا https://yourbrand.com"
                      className="w-full rounded-xl border border-neutral-300 p-2.5 pl-9 text-xs font-mono text-neutral-900 bg-white outline-none"
                    />
                    <Globe className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-1">
                    توجه: مدیران رویداد اصالت و فعالیت رسمی برند شما را بر اساس این لینک بررسی و تایید خواهند کرد.
                  </p>
                </div>
              </div>

              {/* Step 3: Booth Location */}
              <div className="space-y-2 p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200">
                <label className="block font-bold text-neutral-900">
                  ۳. سالن و موقعیت استقرار غرفه <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {(targetEvent?.boothLocations?.length
                    ? targetEvent.boothLocations
                    : ['سالن اصلی', 'سالن شماره ۲', 'محوطه بیرونی']
                  ).map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setSelectedLocation(loc)}
                      className={`p-2.5 rounded-xl border text-right transition cursor-pointer flex items-center justify-between ${
                        selectedLocation === loc
                          ? 'border-neutral-900 bg-neutral-900 text-white shadow-2xs'
                          : 'border-neutral-200 bg-white text-neutral-800'
                      }`}
                    >
                      <span className="font-semibold text-xs">{loc}</span>
                      {selectedLocation === loc && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 4: Booth Type */}
              <div className="space-y-2 p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200">
                <label className="block font-bold text-neutral-900">
                  ۴. نوع غرفه و تعرفه
                </label>
                <div className="space-y-1.5">
                  {(targetEvent?.boothTypes?.length
                    ? targetEvent.boothTypes
                    : [
                        { id: 'std', title: 'غرفه پیش‌ساخته استاندارد', price: '۱۲,۰۰۰,۰۰۰ تومان', description: 'پارتیشن و روشنایی' },
                        { id: 'spc', title: 'غرفه خودساز ویژه', price: '۲۰,۰۰۰,۰۰۰ تومان', description: 'دکوراسیون سفارشی' },
                      ]
                  ).map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBoothType(b.title)}
                      className={`w-full p-3 rounded-xl border text-right transition cursor-pointer flex items-center justify-between gap-2 ${
                        boothType === b.title
                          ? 'border-neutral-900 bg-neutral-900 text-white shadow-2xs'
                          : 'border-neutral-200 bg-white text-neutral-800'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs">{b.title}</div>
                        {b.description && (
                          <div className={`text-[10px] mt-0.5 ${boothType === b.title ? 'text-neutral-300' : 'text-neutral-500'}`}>
                            {b.description}
                          </div>
                        )}
                      </div>
                      {b.price && (
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${boothType === b.title ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'}`}>
                          {b.price}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 5: Facilities Chips */}
              <div className="space-y-2 p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200">
                <label className="block font-bold text-neutral-900">
                  ۵. امکانات و تجهیزات جانبی
                </label>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(targetEvent?.boothRequirements?.length
                    ? targetEvent.boothRequirements
                    : ['برق استاندارد', 'اینترنت فیبر نوری', 'میز و صندلی کانتر', 'استند نمایشگاهی']
                  ).map((fac) => {
                    const isChecked = facilities.includes(fac);
                    return (
                      <button
                        key={fac}
                        type="button"
                        onClick={() => toggleFacility(fac)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                          isChecked
                            ? 'border-neutral-900 bg-neutral-900 text-white'
                            : 'border-neutral-200 bg-white text-neutral-700'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                        <span>{fac}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 6: Contract commitment */}
              <div className="space-y-2.5 p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200">
                <label className="block font-bold text-neutral-900">
                  ۶. تعهدنامه رسمی رویداد
                </label>
                <div className="p-2.5 rounded-xl bg-white border border-neutral-200 text-[11px] text-neutral-600 leading-relaxed max-h-24 overflow-y-auto">
                  {targetEvent?.contractTemplateText ||
                    'غرفه‌دار متعهد به رعایت استانداردهای ایمنی، نظم عمومی سالن و تحویل به موقع غرفه می‌باشد.'}
                </div>

                <label className="flex items-start gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={isAgreedAndSigned}
                    onChange={(e) => setIsAgreedAndSigned(e.target.checked)}
                    className="mt-0.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                  />
                  <span className="font-semibold text-neutral-800">
                    مفاد تعهدنامه و شرایط حضور در رویداد را می‌پذیرم.
                  </span>
                </label>

                {isAgreedAndSigned && (
                  <div className="pt-1">
                    <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                      نام نماینده امضاکننده:
                    </label>
                    <input
                      type="text"
                      value={signatoryName}
                      onChange={(e) => setSignatoryName(e.target.value)}
                      placeholder="نام و نام خانوادگی / سمت"
                      className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs bg-white outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Sticky Submit button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submittingReg}
                  className="w-full py-3.5 rounded-2xl bg-neutral-900 active:scale-98 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm safe-bottom"
                >
                  {submittingReg ? 'در حال ثبت...' : 'ارسال نهایی درخواست غرفه'}
                  <Send className="w-3.5 h-3.5 rotate-180" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* NATIVE BOTTOM SHEET: SIGN CONTRACT MODAL */}
      {/* ========================================================================= */}
      {signingRegId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-neutral-950/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-neutral-200 max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Drag Handle */}
            <div className="pt-3 pb-1 flex justify-center sm:hidden">
              <div className="w-12 h-1.5 bg-neutral-300 rounded-full" />
            </div>

            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-neutral-900" />
                <h3 className="text-sm font-bold text-neutral-900">
                  امضای دیجیتال قرارداد رویداد
                </h3>
              </div>
              <button
                onClick={() => setSigningRegId(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
                <span className="font-bold text-neutral-800 block text-xs">
                  متن تعهدنامه و شرایط رسمی:
                </span>
                <p className="text-neutral-700 leading-relaxed text-xs">
                  غرفه‌دار متعهد می‌گردد کلیه قوانین، استانداردهای ایمنی، مقررات حراستی و ساعات تحویل و تخلیه غرفه را بر اساس آیین‌نامه اجرایی سالن رعایت نماید. مسئولیت هرگونه خسارت به عهده متقاضی خواهد بود.
                </p>
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-2xl border border-neutral-200 bg-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTermsChecked}
                  onChange={(e) => setAgreeTermsChecked(e.target.checked)}
                  className="mt-1 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                />
                <span className="text-xs text-neutral-900 font-semibold leading-relaxed">
                  کلیه مفاد فوق و ضوابط ایمنی سالن را به دقت مطالعه کرده و به عنوان نماینده تام‌الاختیار متعهد می‌شوم.
                </span>
              </label>

              <div>
                <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                  نام و نام خانوادگی نماینده امضاکننده <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={signNameInput}
                  onChange={(e) => setSignNameInput(e.target.value)}
                  placeholder="مثال: علی رضایی (مدیرعامل)"
                  className="w-full rounded-xl border border-neutral-300 p-2.5 text-xs text-neutral-900 focus:border-neutral-900 outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={signingContract}
                  onClick={() => handleSignContract(signingRegId)}
                  className="w-full py-3.5 rounded-2xl bg-neutral-900 active:scale-98 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm safe-bottom"
                >
                  {signingContract ? 'در حال ثبت...' : 'تایید نهایی و امضای دیجیتال قرارداد'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* FIXED NATIVE MOBILE BOTTOM APP DOCK */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-neutral-200/90 z-40 px-4 py-2 safe-bottom shadow-lg flex items-center justify-around max-w-xl mx-auto">
        <button
          type="button"
          onClick={() => setActiveTab('events')}
          className={`flex flex-col items-center gap-1 transition touch-control cursor-pointer relative py-1 px-3 rounded-xl ${
            activeTab === 'events' ? 'text-neutral-900 font-bold' : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          {userRegistrations.length > 0 && (
            <span className="absolute top-0 right-2 px-1.5 py-0.2 rounded-full text-[9px] bg-neutral-900 text-white font-mono">
              {toPersianDigits(userRegistrations.length)}
            </span>
          )}
          <Calendar className={`w-5 h-5 ${activeTab === 'events' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-[10px]">غرفه‌های من</span>
        </button>

        {/* Center Prominent New Booth Action */}
        <button
          type="button"
          onClick={() => setShowNewRequestModal(true)}
          className="w-12 h-12 -mt-5 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow-lg active:scale-95 transition cursor-pointer"
          title="رزرو غرفه جدید"
        >
          <Plus className="w-6 h-6" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('info')}
          className={`flex flex-col items-center gap-1 transition touch-control cursor-pointer py-1 px-3 rounded-xl ${
            activeTab === 'info' ? 'text-neutral-900 font-bold' : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Store className={`w-5 h-5 ${activeTab === 'info' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-[10px]">پروفایل برند</span>
        </button>

        {onBackToLanding && (
          <button
            type="button"
            onClick={onBackToLanding}
            className="flex flex-col items-center gap-1 text-neutral-500 hover:text-neutral-800 transition touch-control cursor-pointer py-1 px-3 rounded-xl"
          >
            <Globe className="w-5 h-5 stroke-[1.8]" />
            <span className="text-[10px]">تقویم عمومی</span>
          </button>
        )}
      </div>
    </div>
  );
};
