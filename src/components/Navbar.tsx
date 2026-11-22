import React from 'react';
import { User } from '../types';
import { toPersianDigits } from '../utils/shamsi';
import {
  Calendar,
  ShieldCheck,
  Store,
  LogOut,
  UserCircle2,
  Award,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'landing' | 'vendor' | 'admin' | 'catalog';
  onSelectTab: (tab: 'landing' | 'vendor' | 'admin' | 'catalog') => void;
  currentUser: User | null;
  onLogout: () => void;
  onOpenVendorPortal: () => void;
  onOpenAdminPortal: () => void;
  onOpenSponsorModal?: () => void;
  platformName?: string;
  pendingCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  onLogout,
  onOpenVendorPortal,
  onOpenAdminPortal,
  onOpenSponsorModal,
  platformName = import.meta.env.VITE_PLATFORM_NAME || 'طهرون ایونتس',
  pendingCount = 0,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-neutral-200/80">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Logo & Title & Badje Attribution */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelectTab('landing')}
              className="flex items-center gap-2.5 text-right cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center text-white transition-opacity group-hover:opacity-90 shadow-xs">
                <Calendar className="w-4 h-4 text-neutral-100" />
              </div>
              <div>
                <span className="font-bold text-sm sm:text-base text-neutral-900 tracking-tight block">
                  {platformName}
                </span>
                <div className="flex items-center gap-1 text-[10px] text-neutral-400">
                  <span>قدرت‌گرفته از</span>
                  <a
                    href="https://badje.ir"
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-0.5"
                  >
                    <span>badje.ir</span>
                  </a>
                </div>
              </div>
            </button>
          </div>

          {/* Navigation Links / Actions */}
          <nav className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => onSelectTab('landing')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition cursor-pointer ${
                currentTab === 'landing'
                  ? 'bg-neutral-100 text-neutral-900 font-semibold'
                  : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50'
              }`}
            >
              رویدادها
            </button>

            {/* Sponsor Registration Trigger */}
            {onOpenSponsorModal && (
              <button
                onClick={onOpenSponsorModal}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100/80 border border-amber-200/70 transition cursor-pointer"
              >
                <Award className="w-3.5 h-3.5 text-amber-600" />
                <span>حامیان رویداد</span>
              </button>
            )}

            {/* Vendor Portal */}
            <button
              onClick={onOpenVendorPortal}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition cursor-pointer ${
                currentTab === 'vendor'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>
                {currentUser?.role === 'vendor' ? 'غرفه من' : 'ورود غرفه‌دار'}
              </span>
            </button>

            {/* Admin Portal */}
            <button
              onClick={onOpenAdminPortal}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition cursor-pointer ${
                currentTab === 'admin'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>
                {currentUser?.role === 'admin' ? 'مدیریت' : 'ورود مدیریت'}
              </span>
              {pendingCount > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ring-2 ring-white"></span>
              )}
            </button>

            {/* Authenticated User Session Pill */}
            {currentUser && (
              <div className="flex items-center gap-2 mr-1 pr-2 border-r border-neutral-200">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-neutral-900 max-w-[120px] truncate leading-tight">
                    {currentUser.fullName || currentUser.phone}
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    {currentUser.role === 'admin' ? 'مدیر رویداد' : 'نماینده غرفه'}
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  title="خروج از حساب"
                  className="p-1.5 rounded-md text-neutral-400 hover:text-rose-600 hover:bg-neutral-50 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

