import { apiFetch as fetch } from '../api';
import React, { useState, useMemo } from 'react';
import { EventItem, VendorRegistration, SponsorItem } from '../types';
import { formatShamsiLong, toPersianDigits, getEventStatus } from '../utils/shamsi';
import { SponsorCarousel } from './SponsorCarousel';
import { EventGalleryModal } from './EventGalleryModal';
import {
  Calendar,
  MapPin,
  Clock,
  Store,
  Star,
  Search,
  ChevronLeft,
  FileText,
  MessageSquare,
  CheckCircle2,
  X,
  Camera,
  Award,
} from 'lucide-react';

interface LandingViewProps {
  events: EventItem[];
  vendors: VendorRegistration[];
  sponsors?: SponsorItem[];
  onOpenVendorPanel: (eventId?: string) => void;
  onOpenCatalog: (event: EventItem) => void;
  onRefreshData: () => void;
  onOpenSponsorModal?: (eventId?: string) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  events,
  vendors,
  sponsors = [],
  onOpenVendorPanel,
  onOpenCatalog,
  onRefreshData,
  onOpenSponsorModal,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'ongoing' | 'upcoming' | 'past'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [galleryModalEvent, setGalleryModalEvent] = useState<EventItem | null>(null);

  // Review modal state
  const [reviewingVendor, setReviewingVendor] = useState<VendorRegistration | null>(null);
  const [reviewStars, setReviewStars] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Selected event object
  const activeEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return events.find((e) => e.id === selectedEventId) || null;
  }, [selectedEventId, events]);

  // Approved vendors for active event
  const approvedVendorsForActiveEvent = useMemo(() => {
    if (!selectedEventId) return [];
    return vendors.filter((v) => v.eventId === selectedEventId && v.status === 'approved');
  }, [selectedEventId, vendors]);

  // Approved sponsors for active event
  const activeEventSponsors = useMemo(() => {
    if (!selectedEventId) return [];
    return sponsors.filter((s) => s.eventId === selectedEventId && s.status === 'approved');
  }, [selectedEventId, sponsors]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const status = getEventStatus(ev.shamsiStartDate, ev.durationDays);
      const matchesStatus = filterStatus === 'all' || status === filterStatus;
      const matchesSearch =
        !searchQuery ||
        ev.title.includes(searchQuery) ||
        ev.location.includes(searchQuery) ||
        ev.category.includes(searchQuery);
      return matchesStatus && matchesSearch;
    });
  }, [events, filterStatus, searchQuery]);

  // Submit star rating
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingVendor) return;

    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/vendors/${reviewingVendor.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stars: reviewStars,
          comment: reviewComment,
          reviewerName,
          eventId: reviewingVendor.eventId,
        }),
      });

      if (res.ok) {
        setReviewSuccess(true);
        onRefreshData();
        setTimeout(() => {
          setReviewSuccess(false);
          setReviewingVendor(null);
          setReviewComment('');
          setReviewerName('');
        }, 1200);
      }
    } catch (err) {
      console.error('Error submitting review:', err);
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Clean, Minimal Header */}
      <section className="pt-2 pb-1 border-b border-neutral-200/80">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
              تقویم رویدادها و نمایشگاه‌ها
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500">
              مرور رویدادهای جاری، غرفه‌های فعال و دسترسی به درگاه ثبت‌نام غرفه‌داران
            </p>
          </div>

          <button
            onClick={() => onOpenVendorPanel()}
            className="self-start sm:self-auto px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
          >
            <Store className="w-3.5 h-3.5" />
            <span>ثبت درخواست غرفه</span>
          </button>
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 pb-2">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs pb-1 sm:pb-0">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer shrink-0 ${
                filterStatus === 'all'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/70'
              }`}
            >
              همه ({toPersianDigits(events.length)})
            </button>
            <button
              onClick={() => setFilterStatus('ongoing')}
              className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                filterStatus === 'ongoing'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/70'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>در حال برگزاری</span>
            </button>
            <button
              onClick={() => setFilterStatus('upcoming')}
              className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer shrink-0 ${
                filterStatus === 'upcoming'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/70'
              }`}
            >
              آینده
            </button>
            <button
              onClick={() => setFilterStatus('past')}
              className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer shrink-0 ${
                filterStatus === 'past'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/70'
              }`}
            >
              برگزار شده
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی عنوان، شهر یا صنف..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 outline-none transition"
            />
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </section>

      {/* Events Grid */}
      <section className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map((event) => {
            const status = getEventStatus(event.shamsiStartDate, event.durationDays);
            const isOngoing = status === 'ongoing';
            const isUpcoming = status === 'upcoming';
            const isPast = status === 'past';
            const eventSponsors = sponsors.filter((s) => s.eventId === event.id && s.status === 'approved');

            return (
              <div
                key={event.id}
                className="bg-white rounded-xl border border-neutral-200/80 overflow-hidden transition-all hover:border-neutral-300 flex flex-col justify-between"
              >
                <div>
                  {/* Event Banner */}
                  <div className="relative h-40 w-full overflow-hidden bg-neutral-100">
                    <img
                      src={event.bannerUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80'}
                      alt={event.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />

                    {/* Status Badge */}
                    <div className="absolute top-2.5 right-2.5">
                      {isOngoing && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/95 backdrop-blur-xs text-emerald-700 text-[11px] font-medium border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          در حال برگزاری
                        </span>
                      )}
                      {isUpcoming && (
                        <span className="px-2.5 py-0.5 rounded-md bg-white/95 backdrop-blur-xs text-neutral-800 text-[11px] font-medium border border-neutral-200">
                          آینده
                        </span>
                      )}
                      {isPast && (
                        <span className="px-2.5 py-0.5 rounded-md bg-white/95 backdrop-blur-xs text-neutral-500 text-[11px] font-medium border border-neutral-200">
                          پایان یافته
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-2.5 right-2.5 left-2.5 flex items-center justify-between text-white text-[11px]">
                      <span className="bg-neutral-900/80 backdrop-blur-xs px-2 py-0.5 rounded">
                        {event.category}
                      </span>
                      <span className="bg-neutral-900/80 backdrop-blur-xs px-2 py-0.5 rounded">
                        {toPersianDigits(event.vendorCount || 0)} غرفه
                      </span>
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="p-4 space-y-3">
                    <h3 className="font-semibold text-sm sm:text-base text-neutral-900 line-clamp-1 leading-snug">
                      {event.title}
                    </h3>

                    <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                      {event.description}
                    </p>

                    <div className="space-y-1.5 pt-2 border-t border-neutral-100 text-xs text-neutral-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span>شروع: <span className="text-neutral-900">{formatShamsiLong(event.shamsiStartDate)}</span> ({toPersianDigits(event.durationDays)} روز)</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="line-clamp-1 text-neutral-600">{event.location}</span>
                      </div>
                    </div>

                    {/* Specific Sponsors of this Event */}
                    <div className="pt-2.5 border-t border-neutral-100 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1 font-semibold text-neutral-700">
                          <Award className="w-3.5 h-3.5 text-amber-600" />
                          <span>حامیان این رویداد ({toPersianDigits(eventSponsors.length)})</span>
                        </div>
                        {onOpenSponsorModal && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenSponsorModal(event.id);
                            }}
                            className="text-[10px] text-amber-700 hover:text-amber-900 font-medium hover:underline cursor-pointer"
                          >
                            + حامی شوید
                          </button>
                        )}
                      </div>

                      {eventSponsors.length > 0 ? (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                          {eventSponsors.map((spn) => (
                            <div
                              key={spn.id}
                              title={`${spn.brandName} - ${spn.tier === 'platinum' ? 'اسپانسر پلاتینیوم' : spn.tier === 'gold' ? 'اسپانسر طلایی' : 'حامی رسمی'}`}
                              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-neutral-50 hover:bg-amber-50/50 border border-neutral-200/90 shrink-0 text-neutral-800 text-[11px] transition"
                            >
                              <img
                                src={spn.logoUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&q=80'}
                                alt={spn.brandName}
                                className="w-5 h-5 rounded object-contain bg-white border border-neutral-200"
                                referrerPolicy="no-referrer"
                              />
                              <span className="font-semibold truncate max-w-[85px]">{spn.brandName}</span>
                              <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                                spn.tier === 'platinum' ? 'bg-cyan-100 text-cyan-800' :
                                spn.tier === 'gold' ? 'bg-amber-100 text-amber-800' :
                                'bg-neutral-200 text-neutral-700'
                              }`}>
                                {spn.tier === 'platinum' ? 'الماس' : spn.tier === 'gold' ? 'طلا' : 'حامی'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-[11px] text-neutral-400 bg-neutral-50/80 px-2.5 py-1 rounded-lg">
                          <span>هنوز حامی رسمی ثبت نشده است</span>
                          {onOpenSponsorModal && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenSponsorModal(event.id);
                              }}
                              className="text-[10px] text-amber-700 font-semibold hover:underline cursor-pointer"
                            >
                              اسپانسر این رویداد شوید ←
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Minimal Bottom Actions */}
                <div className="p-3 bg-neutral-50/70 border-t border-neutral-100 flex items-center gap-2">
                  <button
                    onClick={() => setSelectedEventId(event.id)}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-xs transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span>غرفه‌ها و نظرات</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onOpenVendorPanel(event.id)}
                    title="ثبت درخواست غرفه در این رویداد"
                    className="py-1.5 px-2.5 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-700 text-xs font-medium transition cursor-pointer flex items-center gap-1"
                  >
                    <Store className="w-3.5 h-3.5 text-neutral-500" />
                    <span>رزرو غرفه</span>
                  </button>

                  <button
                    onClick={() => onOpenCatalog(event)}
                    title="مشاهده کاتالوگ غرفه‌داران"
                    className="p-1.5 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-600 transition cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </button>

                  {event.gallery && event.gallery.length > 0 && (
                    <button
                      onClick={() => setGalleryModalEvent(event)}
                      title={`مشاهده ${toPersianDigits(event.gallery.length)} تصویر در گالری رویداد`}
                      className="py-1.5 px-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 transition cursor-pointer flex items-center gap-1 text-xs"
                    >
                      <Camera className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-[10px] font-bold">{toPersianDigits(event.gallery.length)} عکس</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {events.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-neutral-200 p-8 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
              <Calendar className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-neutral-800">هیچ رویدادی در پایگاه‌داده ثبت نشده است</h4>
            <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
              اطلاعات به طور مستقیم و بدون هیچ داده ساختگی از دیتابیس دریافت می‌شوند. مدیریت سامانه می‌تواند با ورود به پنل، اولین رویداد را تعریف و منتشر نماید.
            </p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-xl border border-neutral-200 p-8">
            <Calendar className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-neutral-700">رویدادی با این مشخصات یافت نشد</h4>
            <p className="text-xs text-neutral-400 mt-1">می‌توانید فیلتر وضعیت یا متن جستجو را تغییر دهید.</p>
          </div>
        ) : null}
      </section>

      {/* Sponsoring Request Section (Moved AFTER the Events) */}
      <section className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-amber-50/80 via-white to-orange-50/60 border border-amber-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/90 text-amber-900 text-xs font-bold">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>فرصت‌های حمایت مالی و اسپانسری رویدادها</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-neutral-900">
              برند و خدمات خود را در معتبرترین رویدادها به هزاران مخاطب معرفی کنید
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              هر رویداد دارای بسته‌های حمایتی اختصاصی (پلاتینیوم، طلایی، نقره‌ای و رسانه‌ای) است. با ثبت درخواست حامی، لوگو و نشان تجاری شما به عنوان حامی رسمی رویداد مربوطه در کارت‌های رویداد، استیج و کاتالوگ‌های چاپی درج می‌شود.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 pt-2 text-[11px] text-neutral-700">
              <span className="px-2.5 py-1 rounded-lg bg-white border border-amber-200/60 font-medium">
                ✓ ثبت رسمی در تقویم و صفحه اختصاصی رویداد
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white border border-amber-200/60 font-medium">
                ✓ جایگاه برجسته در کاتالوگ PDF و بنرهای ورودی
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white border border-amber-200/60 font-medium">
                ✓ استند و پاویون اختصاصی ویژه حامیان برتر
              </span>
            </div>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-2.5 w-full lg:w-auto">
            {onOpenSponsorModal && (
              <button
                onClick={() => onOpenSponsorModal()}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:scale-98 text-white font-bold text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                <Award className="w-4 h-4 text-amber-400" />
                <span>ثبت درخواست اسپانسری رویداد</span>
              </button>
            )}
            <span className="text-[11px] text-neutral-400 text-center">
              امکان انتخاب رویداد مدنظر در فرم درخواست
            </span>
          </div>
        </div>
      </section>

      {/* Participating Vendors Modal */}
      {activeEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl overflow-hidden border border-neutral-200 max-h-[88vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-neutral-200 flex items-start justify-between shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-neutral-100 text-neutral-700">
                    {activeEvent.category}
                  </span>
                  <span className="text-xs text-neutral-400">
                    {formatShamsiLong(activeEvent.shamsiStartDate)}
                  </span>
                </div>
                <h3 className="text-base font-bold text-neutral-900">{activeEvent.title}</h3>
                <p className="text-xs text-neutral-500 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{activeEvent.location}</span>
                </p>
              </div>

              <button
                onClick={() => setSelectedEventId(null)}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content: Vendors List & Event Gallery */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Event Gallery Strip (if photos exist) */}
              {activeEvent.gallery && activeEvent.gallery.length > 0 && (
                <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/90 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                      <Camera className="w-3.5 h-3.5 text-amber-600" />
                      <span>گالری تصاویر رویداد ({toPersianDigits(activeEvent.gallery.length)} تصویر)</span>
                    </div>
                    <button
                      onClick={() => setGalleryModalEvent(activeEvent)}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      مشاهده در اندازه کامل ←
                    </button>
                  </div>
                  <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                    {activeEvent.gallery.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        onClick={() => setGalleryModalEvent(activeEvent)}
                        className="relative w-20 h-16 rounded-lg overflow-hidden shrink-0 border border-neutral-200 hover:border-amber-500 hover:scale-102 transition shadow-xs cursor-pointer group"
                      >
                        <img
                          src={imgUrl}
                          alt={`${activeEvent.title} - ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:opacity-90"
                          referrerPolicy="no-referrer"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Event Specific Sponsors */}
              {activeEventSponsors.length > 0 ? (
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50/80 via-white to-amber-50/50 border border-amber-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                      <Award className="w-4 h-4 text-amber-600" />
                      <span>حامیان و اسپانسرهای رسمی این رویداد ({toPersianDigits(activeEventSponsors.length)})</span>
                    </div>
                    {onOpenSponsorModal && (
                      <button
                        onClick={() => {
                          setSelectedEventId(null);
                          onOpenSponsorModal(activeEvent.id);
                        }}
                        className="text-[11px] font-semibold text-amber-800 hover:text-amber-950 hover:underline cursor-pointer"
                      >
                        + پیوستن به حامیان رویداد
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {activeEventSponsors.map((spn) => (
                      <div
                        key={spn.id}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-amber-200/70 shadow-2xs"
                      >
                        <img
                          src={spn.logoUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&q=80'}
                          alt={spn.brandName}
                          className="w-9 h-9 rounded-lg object-contain bg-white border border-neutral-200 p-0.5 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0 flex-1">
                          <h5 className="text-xs font-bold text-neutral-900 truncate">{spn.brandName}</h5>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                              spn.tier === 'platinum' ? 'bg-cyan-50 text-cyan-800 border border-cyan-200' :
                              spn.tier === 'gold' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                              'bg-neutral-100 text-neutral-700'
                            }`}>
                              {spn.tier === 'platinum' ? 'حامی پلاتینیوم' : spn.tier === 'gold' ? 'حامی طلایی' : 'حامی رسمی'}
                            </span>
                          </div>
                          {spn.website && (
                            <a
                              href={spn.website}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-blue-600 hover:underline block truncate mt-0.5 font-mono"
                              dir="ltr"
                            >
                              {spn.website.replace(/^https?:\/\//, '')}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                onOpenSponsorModal && (
                  <div className="p-3 rounded-xl bg-amber-50/40 border border-dashed border-amber-200/90 flex items-center justify-between text-xs text-amber-900">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-600" />
                      <span>هنوز حامی رسمی برای این رویداد ثبت نشده است.</span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedEventId(null);
                        onOpenSponsorModal(activeEvent.id);
                      }}
                      className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs transition cursor-pointer"
                    >
                      ثبت درخواست اسپانسری
                    </button>
                  </div>
                )
              )}

              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-neutral-700">
                  غرفه‌های فعال ({toPersianDigits(approvedVendorsForActiveEvent.length)})
                </h4>
                <button
                  onClick={() => {
                    setSelectedEventId(null);
                    onOpenCatalog(activeEvent);
                  }}
                  className="text-xs text-neutral-600 hover:text-neutral-900 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>نسخه چاپی کاتالوگ</span>
                </button>
              </div>

              {approvedVendorsForActiveEvent.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {approvedVendorsForActiveEvent.map((vendor) => (
                    <div
                      key={vendor.id}
                      className="p-3.5 rounded-lg border border-neutral-200 bg-white hover:border-neutral-300 transition flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={vendor.logoUrl}
                          alt={vendor.brandName}
                          className="w-10 h-10 rounded-md object-cover border border-neutral-200 bg-neutral-50 p-0.5 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h5 className="font-semibold text-xs text-neutral-900 truncate">
                              {vendor.brandName}
                            </h5>
                            <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-800">
                              {vendor.assignedBooth || 'در حال جانمایی'}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                            {vendor.guildGroup}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 text-amber-500">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="font-bold text-[11px] text-neutral-700">
                            {vendor.averageRating > 0 ? toPersianDigits(vendor.averageRating.toFixed(1)) : 'جدید'}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            ({toPersianDigits(vendor.reviewCount || 0)})
                          </span>
                        </div>

                        <button
                          onClick={() => setReviewingVendor(vendor)}
                          className="text-[11px] text-neutral-600 hover:text-neutral-900 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3 text-neutral-400" />
                          <span>ثبت نظر و امتیاز</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-neutral-400 text-xs">
                  غرفه‌ای برای این رویداد هنوز تایید نهایی نشده است.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-500 shrink-0">
              <span>فهرست رسمی غرفه‌های تایید شده و فعال</span>
              <button
                onClick={() => setSelectedEventId(null)}
                className="px-3 py-1.5 rounded-lg bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-medium transition cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review & Rating Modal */}
      {reviewingVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-xl overflow-hidden border border-neutral-200">
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-xs text-neutral-900">
                  امتیازدهی به {reviewingVendor.brandName}
                </h4>
                <p className="text-[11px] text-neutral-500">غرفه {reviewingVendor.assignedBooth || '-'}</p>
              </div>
              <button
                onClick={() => setReviewingVendor(null)}
                className="text-neutral-400 hover:text-neutral-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reviewSuccess ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-xs font-semibold text-neutral-800">با تشکر، نظر شما ثبت شد.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="p-4 space-y-3">
                {/* Stars selector */}
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-1.5" dir="ltr">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewStars(star)}
                        className="p-1 cursor-pointer transition hover:scale-110"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= reviewStars
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-neutral-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-neutral-500 block">
                    امتیاز شما: {toPersianDigits(reviewStars)} از ۵
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                    نام شما (اختیاری)
                  </label>
                  <input
                    type="text"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="مثال: بازدیدکننده نمایشگاه"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200 outline-none focus:border-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                    دیدگاه شما درباره غرفه و محصولات
                  </label>
                  <textarea
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="نظرتان را بنویسید..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200 outline-none focus:border-neutral-900"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewingVendor(null)}
                    className="px-3 py-1.5 rounded-lg text-xs text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-4 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium transition disabled:opacity-50 cursor-pointer"
                  >
                    {submittingReview ? 'در حال ثبت...' : 'ثبت امتیاز'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen Event Gallery Lightbox Modal */}
      <EventGalleryModal
        event={galleryModalEvent}
        isOpen={Boolean(galleryModalEvent)}
        onClose={() => setGalleryModalEvent(null)}
      />
    </div>
  );
};
