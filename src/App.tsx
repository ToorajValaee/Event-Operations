import { apiFetch as fetch } from './api';
import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { LandingView } from './components/LandingView';
import { VendorPanel } from './components/VendorPanel';
import { AdminPanel } from './components/AdminPanel';
import { EventCatalogModal } from './components/EventCatalogModal';
import { AuthModal } from './components/AuthModal';
import { SponsorModal } from './components/SponsorModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { EventItem, VendorRegistration, User, UserRole, SponsorItem } from './types';
import { toPersianDigits } from './utils/shamsi';
import {
  Calendar,
  Store,
  ShieldCheck,
  FileText,
  ArrowRight,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'landing' | 'vendor' | 'admin' | 'catalog'>(() => {
    try {
      const savedTab = localStorage.getItem('event_ops_tab');
      if (savedTab === 'vendor' || savedTab === 'admin' || savedTab === 'catalog') {
        return savedTab;
      }
    } catch {
      // Ignore
    }
    return 'landing';
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('event_ops_user');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignore
    }
    return null;
  });

  const [events, setEvents] = useState<EventItem[]>([]);
  const [vendors, setVendors] = useState<VendorRegistration[]>([]);
  const [sponsors, setSponsors] = useState<SponsorItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authRolePreset, setAuthRolePreset] = useState<UserRole>('vendor');
  const [activeCatalogEvent, setActiveCatalogEvent] = useState<EventItem | null>(null);
  const [selectedEventIdPreset, setSelectedEventIdPreset] = useState<string | undefined>(undefined);
  const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);
  const [sponsorModalEventId, setSponsorModalEventId] = useState<string | undefined>(undefined);

  const handleOpenSponsorModal = (eventId?: string) => {
    setSponsorModalEventId(eventId);
    setIsSponsorModalOpen(true);
  };

  // Verify stored JWT session with backend /api/auth/me on mount
  useEffect(() => {
    const verifySession = async () => {
      try {
        const token = localStorage.getItem('event_ops_token');
        if (!token) return;

        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setCurrentUser(data.user);
            localStorage.setItem('event_ops_user', JSON.stringify(data.user));
            if (data.token) {
              localStorage.setItem('event_ops_token', data.token);
            }
          }
        } else if (res.status === 401 || res.status === 403) {
          // Token expired or invalid
          localStorage.removeItem('event_ops_token');
          localStorage.removeItem('event_ops_user');
          setCurrentUser(null);
        }
      } catch (err) {
        console.error('Session validation error:', err);
      }
    };

    verifySession();
  }, []);

  // Fetch Events and Vendors data from backend
  const fetchData = useCallback(async () => {
    try {
      const [eventsRes, vendorsRes, sponsorsRes] = await Promise.all([
        fetch('/api/events'),
        fetch('/api/vendors'),
        fetch('/api/sponsors'),
      ]);

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(Array.isArray(eventsData) ? eventsData : (eventsData.events || []));
      }

      if (vendorsRes.ok) {
        const vendorsData = await vendorsRes.json();
        setVendors(Array.isArray(vendorsData) ? vendorsData : (vendorsData.vendors || []));
      }

      if (sponsorsRes && sponsorsRes.ok) {
        const sponsorsData = await sponsorsRes.json();
        setSponsors(Array.isArray(sponsorsData) ? sponsorsData : (sponsorsData.sponsors || []));
      }
    } catch (err) {
      console.error('Error fetching event data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Tab switching with persistence
  const handleSelectTab = (tab: 'landing' | 'vendor' | 'admin' | 'catalog') => {
    setCurrentTab(tab);
    try {
      localStorage.setItem('event_ops_tab', tab);
    } catch {
      // Ignore
    }
  };

  // Auth actions
  const handleLoginSuccess = (user: User, token?: string) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('event_ops_user', JSON.stringify(user));
      if (token) {
        localStorage.setItem('event_ops_token', token);
      }
    } catch {
      // Ignore
    }
    // If admin logged in, redirect to admin tab, otherwise vendor
    const nextTab = user.role === 'admin' ? 'admin' : 'vendor';
    handleSelectTab(nextTab);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('event_ops_user');
      localStorage.removeItem('event_ops_token');
      localStorage.removeItem('event_ops_tab');
    } catch {
      // Ignore
    }
    handleSelectTab('landing');
  };

  const handleOpenAuth = (role: UserRole = 'vendor') => {
    setAuthRolePreset(role);
    setIsAuthOpen(true);
  };

  const handleOpenVendorPortal = (eventId?: string) => {
    if (eventId) {
      setSelectedEventIdPreset(eventId);
      handleSelectTab('vendor');
      return;
    }
    if (currentUser) {
      handleSelectTab('vendor');
    } else {
      setAuthRolePreset('vendor');
      setIsAuthOpen(true);
    }
  };

  const handleOpenAdminPortal = () => {
    if (!currentUser || currentUser.role !== 'admin') {
      setAuthRolePreset('admin');
      setIsAuthOpen(true);
    } else {
      handleSelectTab('admin');
    }
  };

  const handleOpenCatalog = (event: EventItem) => {
    setActiveCatalogEvent(event);
  };

  // Pending count for badge
  const pendingCount = vendors.filter((v) => v.status === 'pending').length;

  // Filter registrations belonging to current user
  const userRegistrations = currentUser
    ? vendors.filter((v) => v.userId === currentUser.id || v.phone === currentUser.phone)
    : [];

  const isMobilePanel = currentTab === 'vendor' || currentTab === 'admin';

  return (
    <div dir="rtl" className="min-h-screen bg-[#fafafa] text-neutral-900 flex flex-col font-sans antialiased selection:bg-neutral-900 selection:text-white">
      {/* Offline Indicator */}
      <OfflineIndicator />

      {/* When on Public Landing: Show Standard Web Navbar */}
      {!isMobilePanel && (
        <Navbar
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenVendorPortal={() => handleOpenVendorPortal()}
          onOpenAdminPortal={handleOpenAdminPortal}
          onOpenSponsorModal={() => handleOpenSponsorModal()}
          pendingCount={pendingCount}
        />
      )}

      {/* When in Admin or Vendor App: Wide Responsive Header */}
      {isMobilePanel && (
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 px-4 py-3 safe-top">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Back Button */}
            <button
              onClick={() => handleSelectTab('landing')}
              className="flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-neutral-950 p-1.5 -mr-2 rounded-xl active:bg-neutral-100 transition cursor-pointer"
            >
              <ChevronRight className="w-5 h-5 text-neutral-800" />
              <span>تقویم رویدادها</span>
            </button>

            {/* Centered App Title */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h1 className="text-xs font-bold text-neutral-900">
                  {currentTab === 'admin' ? 'سامانه مدیریت رویدادها' : 'سامانه و پنل غرفه‌داران'}
                </h1>
              </div>
              <p className="text-[10px] text-neutral-400">
                {currentUser?.fullName || currentUser?.phone || 'محیط کاربری'}
              </p>
            </div>

            {/* Logout / Switch Account */}
            {currentUser ? (
              <button
                onClick={handleLogout}
                title="خروج از حساب"
                className="p-1.5 -ml-2 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 active:scale-95 transition cursor-pointer flex items-center gap-1 text-[11px]"
              >
                <span className="hidden sm:inline">خروج</span>
                <span className="text-xs">🚪</span>
              </button>
            ) : (
              <button
                onClick={() => handleOpenAuth(currentTab === 'admin' ? 'admin' : 'vendor')}
                className="px-2.5 py-1 rounded-xl bg-neutral-900 text-white text-[11px] font-medium"
              >
                ورود
              </button>
            )}
          </div>
        </header>
      )}

      {/* Main Content Area - Wide on desktop */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-24 sm:pb-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-2">
            <div className="w-6 h-6 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-neutral-500">در حال دریافت اطلاعات...</span>
          </div>
        ) : (
          <>
            {currentTab === 'landing' && (
              <LandingView
                events={events}
                vendors={vendors}
                sponsors={sponsors}
                onOpenVendorPanel={handleOpenVendorPortal}
                onOpenCatalog={handleOpenCatalog}
                onRefreshData={fetchData}
                onOpenSponsorModal={handleOpenSponsorModal}
              />
            )}

            {currentTab === 'vendor' && (
              <VendorPanel
                events={events}
                currentUser={currentUser}
                onOpenAuth={() => handleOpenAuth('vendor')}
                selectedEventIdPreset={selectedEventIdPreset}
                onRegistrationSuccess={fetchData}
                userRegistrations={userRegistrations}
                onBackToLanding={() => setCurrentTab('landing')}
              />
            )}

            {currentTab === 'admin' && (
              <AdminPanel
                events={events}
                vendors={vendors}
                sponsors={sponsors}
                currentUser={currentUser}
                onOpenAuth={() => handleOpenAuth('admin')}
                onOpenCatalog={handleOpenCatalog}
                onRefreshData={fetchData}
                onBackToLanding={() => setCurrentTab('landing')}
              />
            )}
          </>
        )}
      </main>

      {/* Catalog Modal */}
      <EventCatalogModal
        event={activeCatalogEvent}
        vendors={vendors}
        onClose={() => setActiveCatalogEvent(null)}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        initialRole={authRolePreset}
      />

      {/* Sponsor Registration Modal */}
      <SponsorModal
        isOpen={isSponsorModalOpen}
        onClose={() => setIsSponsorModalOpen(false)}
        events={events}
        defaultEventId={sponsorModalEventId}
        onSuccess={fetchData}
      />

      {/* Minimal Footer - ONLY shown on Public Landing View */}
      {!isMobilePanel && (
        <footer className="border-t border-neutral-200 bg-white py-6 mt-16 print:hidden">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <span className="font-medium text-neutral-900">سامانه رویدادها</span>
              <span>•</span>
              <span>مدیریت متمرکز رویدادها و غرفه‌داران</span>
            </div>

            {/* Action Icon Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenVendorPortal()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-800 text-xs font-medium transition cursor-pointer"
              >
                <Store className="w-3.5 h-3.5 text-neutral-500" />
                <span>{currentUser?.role === 'vendor' ? 'اپلیکیشن غرفه' : 'درگاه غرفه‌داران'}</span>
              </button>

              <button
                onClick={handleOpenAdminPortal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-800 text-xs font-medium transition cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-neutral-500" />
                <span>اپلیکیشن مدیریت</span>
                {pendingCount > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                )}
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
