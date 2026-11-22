import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-2 text-xs sm:text-sm font-medium text-white shadow-sm hover:from-blue-700 hover:to-indigo-700 transition cursor-pointer"
        title="نصب اپلیکیشن روی گوشی یا دسکتاپ"
      >
        <Download className="w-4 h-4" />
        <span>نصب برنامه وب (PWA)</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white/80 dark:bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
          <span>نصب در آیفون</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-right">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">نصب در آیفون و آیپد (iOS)</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-600 leading-relaxed">
                <div className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0 mt-0.5">
                    ۱
                  </span>
                  <p>در مرورگر سافاری، روی دکمه <strong>اشتراک‌گذاری (Share)</strong> در پایین صفحه بزنید.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0 mt-0.5">
                    ۲
                  </span>
                  <p>به پایین اسکرول کرده و گزینه <strong>Add to Home Screen</strong> (افزودن به صفحه اصلی) را انتخاب کنید.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0 mt-0.5">
                    ۳
                  </span>
                  <p>روی <strong>Add</strong> در بالای صفحه بزنید تا آیکون برنامه به صفحه شما اضافه شود.</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-xl bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition cursor-pointer"
              >
                متوجه شدم
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback demo indicator to show PWA readiness
  return (
    <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-500 bg-slate-100 rounded-lg">
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
      <span>پشتیبانی کامل PWA</span>
    </div>
  );
};
