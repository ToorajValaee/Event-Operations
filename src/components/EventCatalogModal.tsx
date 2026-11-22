import React from 'react';
import { EventItem, VendorRegistration } from '../types';
import { formatShamsiLong, toPersianDigits } from '../utils/shamsi';
import { Printer, Download, X, Award, Star, MapPin, Calendar } from 'lucide-react';

interface EventCatalogModalProps {
  event: EventItem | null;
  vendors: VendorRegistration[];
  onClose: () => void;
}

export const EventCatalogModal: React.FC<EventCatalogModalProps> = ({
  event,
  vendors,
  onClose,
}) => {
  if (!event) return null;

  // Filter approved vendors for this specific event
  const approvedVendors = vendors.filter(
    (v) => v.eventId === event.id && v.status === 'approved'
  );

  const handlePrint = () => {
    window.print();
  };

  const handleExportJSON = () => {
    const catalogData = {
      event: {
        id: event.id,
        title: event.title,
        shamsiStartDate: event.shamsiStartDate,
        durationDays: event.durationDays,
        location: event.location,
        category: event.category,
      },
      exportedAt: new Date().toISOString(),
      vendorsCount: approvedVendors.length,
      vendors: approvedVendors.map((v) => ({
        brandName: v.brandName,
        guildGroup: v.guildGroup,
        assignedBoothNumber: v.assignedBoothNumber,
        phone: v.phone,
        email: v.email,
        website: v.website,
        description: v.description,
        ratingAverage: v.ratingAverage,
        logoUrl: v.logoUrl,
      })),
    };

    const blob = new Blob([JSON.stringify(catalogData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `catalog-${event.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-neutral-950/40 backdrop-blur-xs p-2 sm:p-6 overflow-y-auto print:p-0 print:static print:bg-white">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:rounded-none border border-neutral-200">
        {/* Actions Bar (hidden in print) */}
        <div className="p-3.5 bg-white border-b border-neutral-200 flex items-center justify-between print:hidden shrink-0">
          <div className="text-xs font-bold text-neutral-900">
            کاتالوگ رسمی غرفه‌داران: {event.title}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>چاپ / PDF</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>دانلود JSON</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div id="printable-catalog" className="p-8 sm:p-12 overflow-y-auto space-y-6 bg-white print:p-6">
          {/* Catalog Header */}
          <div className="border-b border-neutral-200 pb-6 text-center space-y-2">
            <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold">
              کاتالوگ و راهنمای رسمی غرفه‌داران
            </span>

            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">
              {event.title}
            </h1>

            <p className="text-xs text-neutral-500 max-w-xl mx-auto leading-relaxed">
              {event.description}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-1 text-xs text-neutral-600">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                شروع: {formatShamsiLong(event.shamsiStartDate)} ({toPersianDigits(event.durationDays)} روز)
              </span>

              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                {event.location}
              </span>
            </div>
          </div>

          {/* Vendors Summary */}
          <div className="flex items-center justify-between text-xs text-neutral-500 border-b border-neutral-100 pb-2">
            <span>
              غرفه‌های تایید شده: <strong className="text-neutral-900">{toPersianDigits(approvedVendors.length)} غرفه</strong>
            </span>
            <span>تاریخ صدور: {formatShamsiLong(event.shamsiStartDate)}</span>
          </div>

          {/* Vendors Grid */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {approvedVendors.map((vendor) => (
                <div
                  key={vendor.id}
                  className="p-3.5 rounded-lg border border-neutral-200 bg-white print:border-neutral-300 space-y-2.5 break-inside-avoid flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start gap-2.5">
                      <img
                        src={vendor.logoUrl}
                        alt={vendor.brandName}
                        className="w-10 h-10 rounded-md object-contain border border-neutral-200 bg-neutral-50 p-0.5 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="font-semibold text-xs text-neutral-900 truncate">
                            {vendor.brandName}
                          </h3>
                          <span className="text-[10px] text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded shrink-0">
                            {vendor.guildGroup}
                          </span>
                        </div>

                        {vendor.assignedBoothNumber && (
                          <div className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded mt-1">
                            <Award className="w-3 h-3 text-emerald-600" />
                            <span>غرفه: {vendor.assignedBoothNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                      {vendor.description || 'معرفی خدمات و دستاوردهای برند'}
                    </p>
                  </div>

                  {/* Vendor contact & rating */}
                  <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400 inline" />
                      <span className="font-medium text-neutral-700">{toPersianDigits(vendor.ratingAverage || 5.0)} / ۵</span>
                    </div>

                    <div className="space-x-1.5 space-x-reverse font-mono text-[10px]" dir="ltr">
                      <span>{vendor.phone}</span>
                      {vendor.website && <span>| {vendor.website}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {approvedVendors.length === 0 && (
              <div className="py-8 text-center text-neutral-400 text-xs">
                هنوز غرفه‌ای برای این رویداد تایید نشده است.
              </div>
            )}
          </div>

          {/* Catalog Footer */}
          <div className="pt-6 border-t border-neutral-200 text-center text-[11px] text-neutral-400">
            سامانه رویدادها • دبیرخانه اجرایی و راهبری رویدادها
          </div>
        </div>
      </div>
    </div>
  );
};
