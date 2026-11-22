import React from 'react';
import { SponsorItem } from '../types';
import { Award, ExternalLink, Handshake } from 'lucide-react';

interface SponsorCarouselProps {
  sponsors: SponsorItem[];
  onOpenSponsorModal: () => void;
  title?: string;
}

export const SponsorCarousel: React.FC<SponsorCarouselProps> = ({
  sponsors,
  onOpenSponsorModal,
  title = 'حامیان و اسپانسرهای رویدادها',
}) => {
  // If no sponsors yet, show inviting banner to become the first sponsor
  const approvedSponsors = sponsors.filter((s) => s.status === 'approved');

  // Double the list for seamless infinite loop marquee effect if we have items
  const displayList =
    approvedSponsors.length > 0
      ? [...approvedSponsors, ...approvedSponsors, ...approvedSponsors]
      : [];

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'platinum':
        return {
          label: 'حامی پلاتینیوم',
          badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-300',
        };
      case 'gold':
        return {
          label: 'اسپانسر طلایی',
          badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
        };
      case 'silver':
        return {
          label: 'حامی نقره‌ای',
          badgeClass: 'bg-neutral-100 text-neutral-800 border-neutral-300',
        };
      case 'bronze':
        return {
          label: 'حامی برنزی',
          badgeClass: 'bg-orange-100 text-orange-900 border-orange-300',
        };
      default:
        return {
          label: 'حامی رسانه‌ای',
          badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        };
    }
  };

  return (
    <div className="w-full bg-gradient-to-b from-amber-500/5 via-white to-neutral-50 rounded-2xl border border-neutral-200/90 p-4 sm:p-6 overflow-hidden shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-neutral-900 tracking-tight">
              {title}
            </h3>
            <p className="text-[11px] text-neutral-500">
              برندها و مجموعه‌های پشتیبان برگزاری نمایشگاه‌ها و رویدادهای تخصصی
            </p>
          </div>
        </div>

        <button
          onClick={onOpenSponsorModal}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <Handshake className="w-3.5 h-3.5 text-amber-400" />
          <span>پیوستن به جمع حامیان رویداد</span>
        </button>
      </div>

      {approvedSponsors.length === 0 ? (
        <div className="py-6 text-center bg-white/70 border border-dashed border-amber-200 rounded-xl p-4">
          <Award className="w-6 h-6 text-amber-400 mx-auto mb-1.5" />
          <p className="text-xs font-medium text-neutral-700">
            فرصت ویژه حضور به عنوان اولین حامی رویداد
          </p>
          <p className="text-[11px] text-neutral-400 mt-0.5 max-w-sm mx-auto">
            لوگو و برند شما در سرتاسر بخش‌های پربازدید سامانه، کاتالوگ‌های رسمی و سالن‌های نمایشگاهی به نمایش درخواهد آمد.
          </p>
          <button
            onClick={onOpenSponsorModal}
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800 hover:underline cursor-pointer"
          >
            <span>ثبت درخواست اسپانسری</span>
            <span>←</span>
          </button>
        </div>
      ) : (
        <div className="relative w-full overflow-hidden mask-fade-edges">
          {/* Marquee Track */}
          <div className="flex gap-4 items-center animate-marquee hover:[animation-play-state:paused] py-2 w-max">
            {displayList.map((item, idx) => {
              const tierInfo = getTierBadge(item.tier);
              const cardContent = (
                <div
                  key={`${item.id}-${idx}`}
                  className="group relative flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white border border-neutral-200/90 hover:border-amber-400 hover:shadow-md transition-all duration-200 min-w-[200px] max-w-[260px] shrink-0"
                >
                  <div className="w-11 h-11 rounded-lg border border-neutral-100 bg-neutral-50 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      src={item.logoUrl || '/icon.svg'}
                      alt={item.brandName}
                      className="w-full h-full object-contain rounded"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/icon.svg';
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0 text-right">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-neutral-900 truncate group-hover:text-amber-700 transition">
                        {item.brandName}
                      </span>
                      {item.website && (
                        <ExternalLink className="w-2.5 h-2.5 text-neutral-300 group-hover:text-amber-500 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${tierInfo.badgeClass}`}
                      >
                        {tierInfo.label}
                      </span>
                    </div>
                  </div>
                </div>
              );

              return item.website ? (
                <a
                  key={`${item.id}-${idx}`}
                  href={item.website.startsWith('http') ? item.website : `https://${item.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="cursor-pointer"
                  title={`مشاهده وب‌سایت رسمی ${item.brandName}`}
                >
                  {cardContent}
                </a>
              ) : (
                <div key={`${item.id}-${idx}`}>{cardContent}</div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
