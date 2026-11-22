import React, { useState } from 'react';
import { EventItem } from '../types';
import { toPersianDigits } from '../utils/shamsi';
import { X, ChevronLeft, ChevronRight, Image as ImageIcon, Camera } from 'lucide-react';

interface EventGalleryModalProps {
  event: EventItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EventGalleryModal: React.FC<EventGalleryModalProps> = ({
  event,
  isOpen,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!isOpen || !event) return null;

  const gallery = event.gallery && event.gallery.length > 0 ? event.gallery : [];

  const handleNext = () => {
    if (gallery.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % gallery.length);
  };

  const handlePrev = () => {
    if (gallery.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + gallery.length) % gallery.length);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/85 backdrop-blur-md p-3 sm:p-6 overflow-hidden animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-neutral-900 text-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-neutral-800">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-amber-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-neutral-100">
                گالری تصاویر رویداد: {event.title}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {gallery.length > 0
                  ? `تصویر ${toPersianDigits(currentIndex + 1)} از ${toPersianDigits(gallery.length)}`
                  : 'هیچ تصویری آپلود نشده است'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Image Display */}
        <div className="flex-1 min-h-[320px] max-h-[60vh] bg-black/60 relative flex items-center justify-center p-4">
          {gallery.length > 0 ? (
            <>
              <img
                src={gallery[currentIndex]}
                alt={`${event.title} - تصویر ${currentIndex + 1}`}
                className="max-w-full max-h-[56vh] object-contain rounded-lg shadow-lg select-none"
                referrerPolicy="no-referrer"
              />

              {/* Navigation Arrows */}
              {gallery.length > 1 && (
                <>
                  <button
                    onClick={handlePrev}
                    aria-label="تصویر قبلی"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-white flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>

                  <button
                    onClick={handleNext}
                    aria-label="تصویر بعدی"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-white flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="text-center py-16 text-neutral-400 space-y-2">
              <ImageIcon className="w-12 h-12 mx-auto text-neutral-600" />
              <p className="text-sm">تصویری برای این رویداد در گالری ثبت نشده است.</p>
            </div>
          )}
        </div>

        {/* Thumbnail Strip */}
        {gallery.length > 1 && (
          <div className="p-3 bg-neutral-950 border-t border-neutral-800 overflow-x-auto flex items-center gap-2.5 shrink-0 justify-center">
            {gallery.map((imgUrl, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition cursor-pointer ${
                  currentIndex === idx
                    ? 'border-amber-500 scale-105 shadow-md'
                    : 'border-neutral-700 opacity-60 hover:opacity-100'
                }`}
              >
                <img
                  src={imgUrl}
                  alt={`بندانگشتی ${idx + 1}`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
