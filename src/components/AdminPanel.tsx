import { apiFetch as fetch } from '../api';
import React, { useState, useMemo, useEffect } from 'react';
import { EventItem, VendorRegistration, User, BoothTypeOption, SponsorItem } from '../types';
import { formatShamsiLong, toPersianDigits, toEnglishDigits } from '../utils/shamsi';
import {
  ShieldCheck,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Check,
  Eye,
  PlusCircle,
  FileText,
  Search,
  ExternalLink,
  MapPin,
  Settings,
  Plus,
  Trash2,
  Sliders,
  FileCheck2,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  Phone,
  Layers,
  ChevronLeft,
  ChevronRight,
  Filter,
  Sparkles,
  ArrowUpDown,
  PhoneCall,
  Copy,
  Globe,
  Camera,
  Award,
  Upload,
  ImagePlus,
  MessageCircle,
  Key,
  BellRing,
  UserCheck,
  Edit3,
  Loader2,
} from 'lucide-react';

interface AdminPanelProps {
  events: EventItem[];
  vendors: VendorRegistration[];
  sponsors?: SponsorItem[];
  currentUser: User | null;
  onOpenAuth: () => void;
  onOpenCatalog: (event: EventItem) => void;
  onRefreshData: () => void;
  onBackToLanding?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  events,
  vendors,
  sponsors = [],
  currentUser,
  onOpenAuth,
  onOpenCatalog,
  onRefreshData,
  onBackToLanding,
}) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'events' | 'sponsors' | 'admins'>('requests');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Admin users state (dynamically fetched from database role === 'admin')
  const [adminList, setAdminList] = useState<User[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [adminActionMessage, setAdminActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAdmins = async () => {
    setLoadingAdmins(true);
    try {
      const res = await fetch('/api/admins');
      const data = await res.json();
      if (Array.isArray(data)) setAdminList(data);
    } catch (e) {
      console.error('Error fetching admins:', e);
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminActionMessage(null);
    const cleanPhone = newAdminPhone.trim();
    if (!cleanPhone || cleanPhone.length !== 11 || !cleanPhone.startsWith('09')) {
      setAdminActionMessage({ type: 'error', text: 'لطفاً شماره تلفن همراه ۱۱ رقمی معتبر وارد نمایید (مانند ۰۹۱۲۳۴۵۶۷۸۹)' });
      return;
    }

    setAddingAdmin(true);
    try {
      const res = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, fullName: newAdminName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ثبت مدیر جدید');
      setAdminActionMessage({ type: 'success', text: data.message || 'مدیر جدید با موفقیت ذخیره شد' });
      setNewAdminPhone('');
      setNewAdminName('');
      fetchAdmins();
    } catch (err) {
      setAdminActionMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleDeleteAdmin = async (id: string, phone: string) => {
    if (!window.confirm(`آیا از حذف دسترسی مدیریت و لغو دریافت پیامک‌ها برای شماره ${phone} اطمینان دارید؟`)) {
      return;
    }
    setAdminActionMessage(null);
    try {
      const res = await fetch(`/api/admins/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در حذف مدیر');
      setAdminActionMessage({ type: 'success', text: data.message || 'مدیر با موفقیت حذف شد' });
      fetchAdmins();
    } catch (err) {
      setAdminActionMessage({ type: 'error', text: (err as Error).message });
    }
  };

  // Sponsors list & status updates
  const [localSponsors, setLocalSponsors] = useState<SponsorItem[]>(sponsors);
  const [updatingSponsorId, setUpdatingSponsorId] = useState<string | null>(null);

  useEffect(() => {
    if (sponsors && sponsors.length > 0) {
      setLocalSponsors(sponsors);
    } else {
      // Fetch directly if not passed yet
      fetch('/api/sponsors')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setLocalSponsors(data);
        })
        .catch((e) => console.error('Error fetching sponsors:', e));
    }
  }, [sponsors]);

  // Selected vendor for inspection & approval bottom sheet
  const [selectedVendor, setSelectedVendor] = useState<VendorRegistration | null>(null);
  const [assignBoothNumber, setAssignBoothNumber] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Dedicated Event Gallery Management Modal
  const [galleryEditingEvent, setGalleryEditingEvent] = useState<EventItem | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [newGalleryUrl, setNewGalleryUrl] = useState('');
  const [savingGallery, setSavingGallery] = useState(false);

  // Dynamic Booth Location, Type & Requirements Management for an Event
  const [managingEvent, setManagingEvent] = useState<EventItem | null>(null);
  const [manageTitle, setManageTitle] = useState('');
  const [manageCategory, setManageCategory] = useState('فناوری و صنعت');
  const [manageBannerUrl, setManageBannerUrl] = useState('');
  const [uploadingManageBanner, setUploadingManageBanner] = useState(false);
  const [manageLocation, setManageLocation] = useState('');
  const [manageShamsiDate, setManageShamsiDate] = useState('1403/10/15');
  const [manageDuration, setManageDuration] = useState(4);
  const [manageMaxBooths, setManageMaxBooths] = useState(60);
  const [manageBoothPrice, setManageBoothPrice] = useState('');
  const [manageDescription, setManageDescription] = useState('');
  const [manageRules, setManageRules] = useState('');
  const [manageContractText, setManageContractText] = useState('');
  const [manageTab, setManageTab] = useState<'info' | 'rules' | 'booths' | 'gallery'>('info');

  const [manageLocations, setManageLocations] = useState<string[]>([]);
  const [manageTypes, setManageTypes] = useState<BoothTypeOption[]>([]);
  const [manageRequirements, setManageRequirements] = useState<string[]>([]);
  const [manageGallery, setManageGallery] = useState<string[]>([]);
  const [newLocationInput, setNewLocationInput] = useState('');
  const [newTypeTitle, setNewTypeTitle] = useState('');
  const [newTypePrice, setNewTypePrice] = useState('');
  const [newTypeDesc, setNewTypeDesc] = useState('');
  const [newReqInput, setNewReqInput] = useState('');
  const [savingEventConfig, setSavingEventConfig] = useState(false);

  // Deleting event state
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

  // New Event Creation Modal / Sheet
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('فناوری و صنعت');
  const [newLocation, setNewLocation] = useState('');
  const [newShamsiDate, setNewShamsiDate] = useState('1403/10/15');
  const [newDuration, setNewDuration] = useState(4);
  const [newMaxBooths, setNewMaxBooths] = useState(60);
  const [newBoothPrice, setNewBoothPrice] = useState('۱۵,۰۰۰,۰۰۰ تومان');
  const [newBannerUrl, setNewBannerUrl] = useState('');
  const [uploadingNewBanner, setUploadingNewBanner] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [newRules, setNewRules] = useState('رعایت ایمنی و مقررات سالن الزامی است.');
  const [newContractText, setNewContractText] = useState('تعهدنامه مشارکت رسمی و رعایت ضوابط غرفه‌داری');

  // Metrics
  const pendingCount = useMemo(() => vendors.filter((v) => v.status === 'pending').length, [vendors]);
  const approvedCount = useMemo(() => vendors.filter((v) => v.status === 'approved').length, [vendors]);
  const revisionCount = useMemo(() => vendors.filter((v) => v.status === 'revision_needed').length, [vendors]);
  const rejectedCount = useMemo(() => vendors.filter((v) => v.status === 'rejected').length, [vendors]);

  // Filtered vendors list
  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      const matchStatus = statusFilter === 'all' || v.status === statusFilter;
      const matchEvent = eventFilter === 'all' || v.eventId === eventFilter;
      const matchSearch =
        !searchQuery ||
        v.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.guildGroup.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.phone.includes(searchQuery);
      return matchStatus && matchEvent && matchSearch;
    });
  }, [vendors, statusFilter, eventFilter, searchQuery]);

  const handleOpenReviewModal = (vendor: VendorRegistration) => {
    setSelectedVendor(vendor);
    setAssignBoothNumber(vendor.assignedBoothNumber || '');
    setAdminNotes(vendor.adminNotes || '');
    setCopiedPhone(false);
  };

  const handleOpenEventManager = (event: EventItem) => {
    setManagingEvent(event);
    setManageTitle(event.title || '');
    setManageCategory(event.category || 'فناوری و صنعت');
    setManageBannerUrl(event.bannerUrl || '');
    setManageLocation(event.location || '');
    setManageShamsiDate(event.shamsiStartDate || '');
    setManageDuration(event.durationDays || 1);
    setManageMaxBooths(event.maxBooths || 50);
    setManageBoothPrice(event.boothPrice || '');
    setManageDescription(event.description || '');
    setManageRules(event.rulesAndInstructions || '');
    setManageContractText(event.contractTemplateText || '');
    setManageTab('info');
    setManageLocations(
      event.boothLocations && event.boothLocations.length > 0
        ? [...event.boothLocations]
        : ['سالن خلیج فارس (اصلی)', 'سالن ملل (تخصصی)', 'محوطه باز شرقی']
    );
    setManageTypes(
      event.boothTypes && event.boothTypes.length > 0
        ? [...event.boothTypes]
        : [
            { id: 'standard', title: 'غرفه استاندارد پیش‌ساخته', price: '۱۲,۰۰۰,۰۰۰ تومان', description: 'پارتیشن، اسپات‌لایت، میز و صندلی' },
            { id: 'special', title: 'غرفه خودساز (ویژه)', price: '۲۰,۰۰۰,۰۰۰ تومان', description: 'زمین خام بدون تجهیزات، مجاز به دکوراسیون سفارشی' },
          ]
    );
    setManageRequirements(
      event.boothRequirements && event.boothRequirements.length > 0
        ? [...event.boothRequirements]
        : [
            'برق تک‌فاز ۱۶ آمپر استاندارد',
            'برق سه‌فاز صنعتی',
            'اینترنت فیبر نوری اختصاصی',
            'میز کانتر و صندلی پرسنلی',
            'استند و رول‌آپ تبلیغاتی',
            'اسپات‌لایت و نورپردازی موضعی',
          ]
    );
    setManageGallery(event.gallery && event.gallery.length > 0 ? [...event.gallery] : []);
  };

  // Dedicated Event Gallery Management Handlers
  const handleOpenGalleryEditor = (event: EventItem) => {
    setGalleryEditingEvent(event);
    setGalleryImages(event.gallery && event.gallery.length > 0 ? [...event.gallery] : []);
    setNewGalleryUrl('');
  };

  const handleUploadImageFile = (
    file: File,
    onSuccess: (url: string) => void,
    setLoading: (loading: boolean) => void
  ) => {
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataUrl: reader.result,
            filename: file.name,
            mimeType: file.type || 'image/jpeg',
          }),
        });
        const data = await res.json();
        if (res.ok && data.url) {
          onSuccess(data.url);
        } else {
          alert('خطا در بارگذاری تصویر: ' + (data.error || 'پاسخ نامعتبر'));
        }
      } catch (err) {
        alert('خطا در ارتباط با سرور آپلود: ' + (err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadGalleryFile = (e: React.ChangeEvent<HTMLInputElement>, target: 'dedicated' | 'manager') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      if (!file.type.startsWith('image/')) return;
      handleUploadImageFile(
        file,
        (uploadedUrl) => {
          if (target === 'dedicated') {
            setGalleryImages((prev) => [...prev, uploadedUrl]);
          } else {
            setManageGallery((prev) => [...prev, uploadedUrl]);
          }
        },
        () => {}
      );
    });
    e.target.value = '';
  };

  const handleAddGalleryUrl = (target: 'dedicated' | 'manager') => {
    const url = target === 'dedicated' ? newGalleryUrl.trim() : '';
    if (!url) return;
    if (target === 'dedicated') {
      setGalleryImages((prev) => [...prev, url]);
      setNewGalleryUrl('');
    }
  };

  const handleRemoveGalleryItem = (index: number, target: 'dedicated' | 'manager') => {
    if (target === 'dedicated') {
      setGalleryImages((prev) => prev.filter((_, i) => i !== index));
    } else {
      setManageGallery((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleSaveDedicatedGallery = async () => {
    if (!galleryEditingEvent) return;
    setSavingGallery(true);
    try {
      const res = await fetch(`/api/events/${galleryEditingEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gallery: galleryImages,
        }),
      });
      if (!res.ok) throw new Error('خطا در ذخیره تصاویر گالری رویداد');
      onRefreshData();
      setGalleryEditingEvent(null);
    } catch (err) {
      alert('خطا: ' + (err as Error).message);
    } finally {
      setSavingGallery(false);
    }
  };

  // Sponsor Actions
  const handleUpdateSponsorStatus = async (sponsorId: string, status: 'approved' | 'rejected' | 'pending') => {
    setUpdatingSponsorId(sponsorId);
    try {
      const res = await fetch(`/api/sponsors/${sponsorId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('خطا در تغییر وضعیت اسپانسر');
      const updated = await res.json();
      setLocalSponsors((prev) =>
        prev.map((s) => (s.id === sponsorId ? { ...s, status: updated.sponsor.status } : s))
      );
      onRefreshData();
    } catch (err) {
      alert('خطا: ' + (err as Error).message);
    } finally {
      setUpdatingSponsorId(null);
    }
  };

  const handleDeleteSponsor = async (sponsorId: string) => {
    if (!confirm('آیا از حذف این درخواست حامی اطمینان دارید؟')) return;
    try {
      const res = await fetch(`/api/sponsors/${sponsorId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('خطا در حذف اسپانسر');
      setLocalSponsors((prev) => prev.filter((s) => s.id !== sponsorId));
      onRefreshData();
    } catch (err) {
      alert('خطا در حذف: ' + (err as Error).message);
    }
  };

  const handleAddLocation = () => {
    const val = newLocationInput.trim();
    if (!val) return;
    if (!manageLocations.includes(val)) {
      setManageLocations([...manageLocations, val]);
    }
    setNewLocationInput('');
  };

  const handleRemoveLocation = (index: number) => {
    setManageLocations(manageLocations.filter((_, i) => i !== index));
  };

  const handleAddBoothType = () => {
    const title = newTypeTitle.trim();
    if (!title) return;
    const newType: BoothTypeOption = {
      id: `type-${Date.now()}`,
      title,
      price: newTypePrice.trim() || 'توافقی',
      description: newTypeDesc.trim() || 'غرفه اختصاصی رویداد',
    };
    setManageTypes([...manageTypes, newType]);
    setNewTypeTitle('');
    setNewTypePrice('');
    setNewTypeDesc('');
  };

  const handleRemoveBoothType = (id: string) => {
    setManageTypes(manageTypes.filter((t) => t.id !== id));
  };

  const handleAddRequirement = () => {
    const val = newReqInput.trim();
    if (!val) return;
    if (!manageRequirements.includes(val)) {
      setManageRequirements([...manageRequirements, val]);
    }
    setNewReqInput('');
  };

  const handleRemoveRequirement = (index: number) => {
    setManageRequirements(manageRequirements.filter((_, i) => i !== index));
  };

  const handleSaveEventConfig = async () => {
    if (!managingEvent) return;
    if (!manageTitle.trim()) {
      alert('عنوان رویداد الزامی است');
      return;
    }
    setSavingEventConfig(true);
    try {
      const res = await fetch(`/api/events/${managingEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: manageTitle.trim(),
          category: manageCategory.trim(),
          bannerUrl: manageBannerUrl.trim(),
          location: manageLocation.trim(),
          shamsiStartDate: manageShamsiDate.trim(),
          durationDays: Number(manageDuration) || 1,
          maxBooths: Number(manageMaxBooths) || 50,
          boothPrice: manageBoothPrice.trim() || undefined,
          description: manageDescription.trim(),
          rulesAndInstructions: manageRules.trim(),
          contractTemplateText: manageContractText.trim(),
          boothLocations: manageLocations,
          boothTypes: manageTypes,
          boothRequirements: manageRequirements,
          gallery: manageGallery,
        }),
      });

      if (!res.ok) throw new Error('خطا در ذخیره تنظیمات رویداد');

      onRefreshData();
      setManagingEvent(null);
    } catch (err) {
      alert('خطا در ذخیره تنظیمات: ' + (err as Error).message);
    } finally {
      setSavingEventConfig(false);
    }
  };

  const handleDeleteEvent = async (event: EventItem) => {
    const confirmed = window.confirm(
      `آیا از حذف کامل رویداد «${event.title}» اطمینان دارید؟\nاین عملیات برگشت‌پذیر نیست و اطلاعات مرتبط با غرفه‌داران این رویداد نیز حذف خواهد شد.`
    );
    if (!confirmed) return;

    setDeletingEventId(event.id);
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در حذف رویداد');

      onRefreshData();
    } catch (err) {
      alert('خطا در حذف رویداد: ' + (err as Error).message);
    } finally {
      setDeletingEventId(null);
    }
  };

  const handleUpdateStatus = async (
    newStatus: 'approved' | 'rejected' | 'revision_needed'
  ) => {
    if (!selectedVendor) return;

    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/vendors/${selectedVendor.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          assignedBoothNumber: assignBoothNumber.trim() || undefined,
          adminNotes: adminNotes.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error('خطا در به‌روزرسانی وضعیت');

      onRefreshData();
      setSelectedVendor(null);
    } catch (err) {
      alert('خطا: ' + (err as Error).message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert('عنوان رویداد الزامی است');
      return;
    }
    setCreatingEvent(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          category: newCategory.trim(),
          location: newLocation.trim(),
          shamsiStartDate: newShamsiDate.trim(),
          durationDays: newDuration,
          maxBooths: newMaxBooths,
          boothPrice: newBoothPrice.trim() || undefined,
          bannerUrl: newBannerUrl.trim() || undefined,
          description: newDescription.trim(),
          rulesAndInstructions: newRules.trim(),
          contractTemplateText: newContractText.trim(),
          boothLocations: ['سالن اصلی (خلیج فارس)', 'سالن تخصصی (ملل)', 'محوطه باز شرقی'],
          boothTypes: [
            { id: 'standard', title: 'غرفه استاندارد', price: newBoothPrice.trim() || '۱۲,۰۰۰,۰۰۰ تومان', description: 'پارتیشن و روشنایی' },
            { id: 'special', title: 'غرفه خودساز (ویژه)', price: '۲۰,۰۰۰,۰۰۰ تومان', description: 'دکوراسیون سفارشی' },
          ],
          boothRequirements: ['برق استاندارد', 'اینترنت فیبر نوری', 'میز کانتر و صندلی'],
        }),
      });

      if (!res.ok) throw new Error('خطا در ایجاد رویداد');

      onRefreshData();
      setShowCreateEventModal(false);
      setNewTitle('');
      setNewLocation('');
      setNewDescription('');
      setNewBannerUrl('');
      setNewBoothPrice('۱۵,۰۰۰,۰۰۰ تومان');
    } catch (err) {
      alert('خطا در ثبت رویداد: ' + (err as Error).message);
    } finally {
      setCreatingEvent(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  return (
    <div className="w-full space-y-4 pb-20">
      {/* Mobile Top App Bar / Hero Card */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-neutral-900 flex items-center justify-center text-white shrink-0 shadow-xs">
            <ShieldCheck className="w-6 h-6 text-neutral-100" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold text-neutral-900 tracking-tight">
                اپلیکیشن مدیریت رویدادها
              </h1>
              <span className="text-[10px] bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-full font-medium">
                مدیر
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              بررسی ثبت‌نام‌ها، تخصیص غرفه و نظارت بر سالن‌ها
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateEventModal(true)}
          className="px-3 py-2 rounded-xl bg-neutral-900 active:scale-95 text-white text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">رویداد جدید</span>
        </button>
      </div>

      {/* Interactive Metric Cards (Tap to Quick Filter) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <button
          type="button"
          onClick={() => {
            setActiveTab('requests');
            setStatusFilter('all');
          }}
          className={`p-3 rounded-xl border text-right transition touch-control cursor-pointer ${
            statusFilter === 'all' && activeTab === 'requests'
              ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
              : 'bg-white text-neutral-800 border-neutral-200 hover:border-neutral-300'
          }`}
        >
          <span className="text-[11px] opacity-70 block">همه درخواست‌ها</span>
          <span className="text-xl font-bold font-mono mt-0.5 block">
            {toPersianDigits(vendors.length)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('requests');
            setStatusFilter('pending');
          }}
          className={`p-3 rounded-xl border text-right transition touch-control cursor-pointer relative overflow-hidden ${
            statusFilter === 'pending' && activeTab === 'requests'
              ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
              : 'bg-white text-neutral-800 border-neutral-200 hover:border-amber-300'
          }`}
        >
          {pendingCount > 0 && (
            <span className="absolute top-2 left-2 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          )}
          <span className="text-[11px] opacity-70 block">در انتظار بررسی</span>
          <span className={`text-xl font-bold font-mono mt-0.5 block ${statusFilter === 'pending' && activeTab === 'requests' ? 'text-white' : 'text-amber-600'}`}>
            {toPersianDigits(pendingCount)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('requests');
            setStatusFilter('approved');
          }}
          className={`p-3 rounded-xl border text-right transition touch-control cursor-pointer ${
            statusFilter === 'approved' && activeTab === 'requests'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white text-neutral-800 border-neutral-200 hover:border-emerald-300'
          }`}
        >
          <span className="text-[11px] opacity-70 block">تایید شده نهایی</span>
          <span className={`text-xl font-bold font-mono mt-0.5 block ${statusFilter === 'approved' && activeTab === 'requests' ? 'text-white' : 'text-emerald-600'}`}>
            {toPersianDigits(approvedCount)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('events')}
          className={`p-3 rounded-xl border text-right transition touch-control cursor-pointer ${
            activeTab === 'events'
              ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
              : 'bg-white text-neutral-800 border-neutral-200 hover:border-neutral-300'
          }`}
        >
          <span className="text-[11px] opacity-70 block">کل رویدادها</span>
          <span className="text-xl font-bold font-mono mt-0.5 block">
            {toPersianDigits(events.length)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sponsors')}
          className={`p-3 rounded-xl border text-right transition touch-control cursor-pointer relative overflow-hidden ${
            activeTab === 'sponsors'
              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
              : 'bg-white text-neutral-800 border-neutral-200 hover:border-amber-300'
          }`}
        >
          {localSponsors.filter((s) => s.status === 'pending').length > 0 && (
            <span className="absolute top-2 left-2 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
          <span className="text-[11px] opacity-70 block">حامیان رویداد</span>
          <span className={`text-xl font-bold font-mono mt-0.5 block ${activeTab === 'sponsors' ? 'text-white' : 'text-amber-700'}`}>
            {toPersianDigits(localSponsors.length)}
          </span>
        </button>
      </div>

      {/* Native Segmented Controller (Requests vs Events vs Sponsors) */}
      <div className="p-1 bg-neutral-200/80 rounded-xl flex items-center gap-1 touch-control">
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'requests'
              ? 'bg-white text-neutral-900 shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>درخواست‌های غرفه</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-100 text-neutral-700">
            {toPersianDigits(vendors.length)}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'events'
              ? 'bg-white text-neutral-900 shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>رویدادها و گالری</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-100 text-neutral-700">
            {toPersianDigits(events.length)}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('sponsors')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer relative ${
            activeTab === 'sponsors'
              ? 'bg-white text-neutral-900 shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Award className="w-4 h-4 text-amber-600" />
          <span>حامیان و اسپانسرها</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-100 text-neutral-700">
            {toPersianDigits(localSponsors.length)}
          </span>
          {localSponsors.filter((s) => s.status === 'pending').length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('admins')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer relative ${
            activeTab === 'admins'
              ? 'bg-white text-neutral-900 shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>مدیران و پیامک‌ها</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-100 text-neutral-700">
            {toPersianDigits(adminList.length)}
          </span>
        </button>
      </div>

      {/* TAB 1: REQUESTS (MOBILE APP CARDS) */}
      {activeTab === 'requests' && (
        <div className="space-y-3">
          {/* Mobile Search & Event Dropdown */}
          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی نام برند، صنف یا شماره تماس..."
                className="w-full bg-white pl-8 pr-10 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 outline-none shadow-2xs"
              />
              <Search className="w-4 h-4 text-neutral-400 absolute right-3.5 top-3" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-3 text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Horizontal Scrollable Status Pill Rail */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 touch-control">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-neutral-900 text-white shadow-2xs'
                    : 'bg-white text-neutral-600 border border-neutral-200'
                }`}
              >
                همه ({toPersianDigits(vendors.length)})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'pending'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'bg-white text-amber-700 border border-amber-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>در انتظار ({toPersianDigits(pendingCount)})</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('approved')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'approved'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white text-emerald-700 border border-emerald-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>تایید شده ({toPersianDigits(approvedCount)})</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('revision_needed')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'revision_needed'
                    ? 'bg-orange-600 text-white shadow-2xs'
                    : 'bg-white text-orange-700 border border-orange-200'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>نیازمند اصلاح ({toPersianDigits(revisionCount)})</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('rejected')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  statusFilter === 'rejected'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-white text-rose-700 border border-rose-200'
                }`}
              >
                رد شده ({toPersianDigits(rejectedCount)})
              </button>
            </div>

            {/* Event Filter Chip selector */}
            <div className="flex items-center gap-2">
              <select
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value)}
                className="w-full bg-white rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-800 outline-none truncate shadow-2xs"
              >
                <option value="all">فیلتر رویداد: همه رویدادها</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Native Mobile Cards List - Responsive Grid on Desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredVendors.map((vendor) => {
              const event = events.find((e) => e.id === vendor.eventId);
              const isPending = vendor.status === 'pending';
              const isApproved = vendor.status === 'approved';
              const isRevision = vendor.status === 'revision_needed';
              const isRejected = vendor.status === 'rejected';

              const hasLogo = Boolean(
                vendor.hasLogo || (vendor.logoUrl && vendor.logoUrl.trim().length > 0)
              );

              return (
                <div
                  key={vendor.id}
                  onClick={() => handleOpenReviewModal(vendor)}
                  className="bg-white rounded-2xl p-4 border border-neutral-200/90 shadow-2xs hover:border-neutral-400 active:scale-[0.99] transition cursor-pointer space-y-3"
                >
                  {/* Top Row: Logo + Brand Name & Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {hasLogo ? (
                        <img
                          src={vendor.logoUrl}
                          alt={vendor.brandName}
                          className="w-11 h-11 rounded-xl object-contain border border-neutral-200 bg-white p-1 shadow-2xs shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl border border-neutral-200 bg-neutral-100 flex items-center justify-center text-neutral-400 shrink-0">
                          <Building2 className="w-5 h-5 text-neutral-400" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-sm text-neutral-900 leading-tight">
                          {vendor.brandName}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md">
                            {vendor.guildGroup}
                          </span>
                          <span className="text-[11px] font-mono text-neutral-400" dir="ltr">
                            {vendor.phone}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Pill Badge */}
                    <div className="shrink-0">
                      {isPending && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-semibold border border-amber-200">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          <span>در انتظار بررسی</span>
                        </span>
                      )}
                      {isApproved && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>تایید شده</span>
                        </span>
                      )}
                      {isRevision && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 text-[11px] font-semibold border border-orange-200">
                          <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
                          <span>نیازمند اصلاح</span>
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-[11px] font-semibold border border-rose-200">
                          <X className="w-3.5 h-3.5 text-rose-600" />
                          <span>رد شده</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle Row: Event Name & Location */}
                  <div className="bg-neutral-50 rounded-xl p-2.5 flex items-center justify-between text-xs text-neutral-700">
                    <div className="flex items-center gap-1.5 truncate">
                      <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span className="font-medium truncate">{event?.title || 'رویداد نامشخص'}</span>
                    </div>
                    <span className="text-[11px] text-neutral-400 shrink-0 mr-2">
                      {vendor.selectedLocation || 'سالن اصلی'}
                    </span>
                  </div>

                  {/* Bottom Indicators & Tap Prompt */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-neutral-100 text-[11px]">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Booth Number */}
                      {vendor.assignedBoothNumber ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-mono font-bold border border-emerald-200">
                          <span>غرفه: {vendor.assignedBoothNumber}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-500">
                          <span>بدون شماره غرفه</span>
                        </span>
                      )}

                      {/* Contract */}
                      {vendor.isContractSigned ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                          <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>قرارداد امضا شده</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-600">
                          <Clock className="w-3.5 h-3.5" />
                          <span>قرارداد امضا نشده</span>
                        </span>
                      )}

                      {/* Logo */}
                      <span className={hasLogo ? 'text-emerald-700' : 'text-neutral-400'}>
                        {hasLogo ? 'لوگو دارد' : 'بدون لوگو'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-neutral-900 font-medium mr-auto">
                      <span>بررسی و تعیین وضعیت</span>
                      <ChevronLeft className="w-3.5 h-3.5 text-neutral-500" />
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredVendors.length === 0 && (
              <div className="py-12 bg-white rounded-2xl border border-neutral-200 text-center space-y-2">
                <Building2 className="w-8 h-8 text-neutral-300 mx-auto" />
                <p className="text-xs text-neutral-500 font-medium">
                  هیچ درخواستی با فیلترهای انتخابی یافت نشد.
                </p>
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setEventFilter('all');
                    setSearchQuery('');
                  }}
                  className="text-xs text-neutral-900 underline font-medium cursor-pointer"
                >
                  پاک کردن فیلترها
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: EVENTS & CATALOG (RESPONSIVE GRID ON DESKTOP) */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500 font-medium">
              تعداد رویدادهای تعریف‌شده: {toPersianDigits(events.length)} رویداد
            </span>
            <button
              onClick={() => setShowCreateEventModal(true)}
              className="px-3 py-1.5 rounded-xl bg-neutral-900 active:scale-98 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>تعریف رویداد جدید</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {events.map((event) => {
              const eventVendorCount = vendors.filter((v) => v.eventId === event.id).length;
              const occupancyPct = Math.min(100, Math.round((eventVendorCount / (event.maxBooths || 50)) * 100));
              const isDeleting = deletingEventId === event.id;

              return (
                <div
                  key={event.id}
                  className="bg-white rounded-2xl p-4 border border-neutral-200/90 shadow-2xs space-y-3.5 flex flex-col justify-between overflow-hidden"
                >
                  <div className="space-y-3">
                    {/* Event Banner Image Cover */}
                    {event.bannerUrl ? (
                      <div className="relative h-44 w-full overflow-hidden rounded-xl bg-neutral-100 border border-neutral-200/80 shadow-2xs group">
                        <img
                          src={event.bannerUrl}
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-2.5 right-2.5">
                          <span className="text-[11px] font-semibold bg-white/95 backdrop-blur-xs text-neutral-800 px-2.5 py-1 rounded-full shadow-xs border border-neutral-200/60">
                            {event.category}
                          </span>
                        </div>
                        {event.boothPrice && (
                          <div className="absolute bottom-2.5 left-2.5">
                            <span className="text-[11px] font-semibold bg-neutral-900/90 backdrop-blur-xs text-white px-2.5 py-1 rounded-full shadow-xs">
                              تعرفه: {event.boothPrice}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="relative h-28 w-full overflow-hidden rounded-xl bg-gradient-to-br from-neutral-50 to-neutral-100/90 flex flex-col items-center justify-center border border-dashed border-neutral-300 text-neutral-400">
                        <Camera className="w-6 h-6 mb-1 opacity-60" />
                        <span className="text-[11px] font-medium">بدون تصویر کاور</span>
                        <div className="absolute top-2.5 right-2.5">
                          <span className="text-[11px] font-semibold bg-white text-neutral-700 px-2.5 py-0.5 rounded-full border border-neutral-200 shadow-2xs">
                            {event.category}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Event Title & Description */}
                    <div>
                      <h3 className="font-bold text-sm text-neutral-900 leading-tight">
                        {event.title}
                      </h3>
                      <p className="text-xs text-neutral-500 line-clamp-2 mt-1">{event.description || 'بدون توضیحات ثبت‌شده'}</p>
                    </div>

                    {/* Date & Location */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-600 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span>آغاز: {formatShamsiLong(event.shamsiStartDate)} ({toPersianDigits(event.durationDays)} روز)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    </div>

                    {/* Occupancy Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-neutral-500 font-medium">
                        <span>تکمیل ظرفیت سالن‌ها:</span>
                        <span>
                          {toPersianDigits(eventVendorCount)} از {toPersianDigits(event.maxBooths)} غرفه ({toPersianDigits(occupancyPct)}٪)
                        </span>
                      </div>
                      <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-neutral-900 h-full rounded-full transition-all duration-300"
                          style={{ width: `${occupancyPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Configuration Stats Chips */}
                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 font-medium">
                        {toPersianDigits(event.boothLocations?.length || 0)} سالن
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 font-medium">
                        {toPersianDigits(event.boothTypes?.length || 0)} نوع غرفه
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 font-medium">
                        {toPersianDigits(event.boothRequirements?.length || 0)} تجهیزات جانبی
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 font-medium border border-amber-200/70">
                        {toPersianDigits(event.gallery?.length || 0)} عکس گالری
                      </span>
                    </div>
                  </div>

                  {/* Touch Action Buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 border-t border-neutral-100">
                    <button
                      onClick={() => handleOpenEventManager(event)}
                      className="py-2 px-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      title="ویرایش کلیه اطلاعات و تنظیمات رویداد"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>ویرایش کامل</span>
                    </button>

                    <button
                      onClick={() => handleOpenGalleryEditor(event)}
                      className="py-2 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-amber-600" />
                      <span>گالری ({toPersianDigits(event.gallery?.length || 0)})</span>
                    </button>

                    <button
                      onClick={() => onOpenCatalog(event)}
                      className="py-2 px-2 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-neutral-800 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-neutral-600" />
                      <span>کاتالوگ</span>
                    </button>

                    <button
                      disabled={isDeleting}
                      onClick={() => handleDeleteEvent(event)}
                      className="py-2 px-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      title="حذف کامل این رویداد"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      )}
                      <span>{isDeleting ? 'حذف...' : 'حذف رویداد'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {events.length === 0 && (
            <div className="py-16 bg-white rounded-2xl border border-neutral-200 text-center space-y-3">
              <Calendar className="w-10 h-10 text-neutral-300 mx-auto" />
              <h4 className="text-sm font-bold text-neutral-900">هیچ رویدادی در سامانه وجود ندارد</h4>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                برای شروع ثبت‌نام غرفه‌داران و نمایش در صفحه اصلی، رویداد جدیدی ایجاد کنید.
              </p>
              <button
                onClick={() => setShowCreateEventModal(true)}
                className="px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-bold transition inline-flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>تعریف اولین رویداد</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SPONSORS (RESPONSIVE GRID ON DESKTOP) */}
      {activeTab === 'sponsors' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {localSponsors.map((sponsor) => {
              const event = events.find((e) => e.id === sponsor.eventId);
              const isPending = sponsor.status === 'pending';
              const isApproved = sponsor.status === 'approved';
              const isRejected = sponsor.status === 'rejected';

              const tierLabels: Record<string, { label: string; color: string }> = {
                diamond: { label: 'اسپانسر الماس', color: 'bg-cyan-50 text-cyan-800 border-cyan-200' },
                gold: { label: 'اسپانسر طلایی', color: 'bg-amber-50 text-amber-800 border-amber-200' },
                silver: { label: 'اسپانسر نقره‌ای', color: 'bg-slate-100 text-slate-800 border-slate-300' },
                bronze: { label: 'اسپانسر برنزی', color: 'bg-orange-50 text-orange-800 border-orange-200' },
                standard: { label: 'حامی رسمی', color: 'bg-neutral-100 text-neutral-800 border-neutral-200' },
              };

              const tierInfo = tierLabels[sponsor.tier || 'gold'] || tierLabels.gold;

              return (
                <div
                  key={sponsor.id}
                  className="bg-white rounded-2xl p-4 border border-neutral-200/90 shadow-2xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header: Logo, Name & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={sponsor.logoUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&q=80'}
                          alt={sponsor.brandName}
                          className="w-12 h-12 rounded-xl object-contain border border-neutral-200 bg-white p-1 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-neutral-900 truncate">
                            {sponsor.brandName}
                          </h4>
                          {sponsor.companyName && (
                            <span className="text-[11px] text-neutral-500 block truncate">
                              {sponsor.companyName}
                            </span>
                          )}
                          <span className={`inline-block mt-0.5 px-2 py-0.2 rounded-md text-[10px] font-semibold border ${tierInfo.color}`}>
                            {tierInfo.label}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            در انتظار بررسی
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            تایید شده (در حال نمایش)
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            رد شده
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Associated Event */}
                    <div className="bg-neutral-50 rounded-xl p-2.5 flex items-center justify-between text-xs text-neutral-700">
                      <div className="flex items-center gap-1.5 truncate">
                        <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="font-medium truncate">
                          {event ? event.title : 'حامی عمومی کل سامانه'}
                        </span>
                      </div>
                      {sponsor.proposedBudget && (
                        <span className="text-[11px] font-mono text-neutral-600 shrink-0 font-semibold">
                          بودجه: {sponsor.proposedBudget}
                        </span>
                      )}
                    </div>

                    {/* Contact Person Details */}
                    <div className="space-y-1 text-xs text-neutral-600 border-t border-neutral-100 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400 text-[11px]">نماینده:</span>
                        <span className="font-medium text-neutral-900">{sponsor.contactPerson}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400 text-[11px]">شماره تماس:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-neutral-900" dir="ltr">{sponsor.phone}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(sponsor.phone);
                              alert('شماره تماس کپی شد.');
                            }}
                            className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
                            title="کپی شماره"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {sponsor.website && (
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-400 text-[11px]">وبسایت:</span>
                          <a
                            href={sponsor.website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1 text-[11px] truncate max-w-[180px]"
                            dir="ltr"
                          >
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{sponsor.website.replace(/^https?:\/\//, '')}</span>
                          </a>
                        </div>
                      )}

                      {sponsor.message && (
                        <div className="mt-1 p-2 rounded-lg bg-neutral-50 text-[11px] text-neutral-600 leading-relaxed">
                          «{sponsor.message}»
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1">
                      {/* WhatsApp */}
                      <a
                        href={`https://wa.me/98${sponsor.phone.replace(/^0/, '').replace(/\s+/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        title="پیام در واتساپ"
                        className="p-1.5 rounded-lg border border-neutral-200 text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>

                      {/* Phone call */}
                      <a
                        href={`tel:${sponsor.phone}`}
                        title="تماس تلفنی"
                        className="p-1.5 rounded-lg border border-neutral-200 text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                      </a>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteSponsor(sponsor.id)}
                        title="حذف درخواست"
                        className="p-1.5 rounded-lg border border-neutral-200 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {sponsor.status !== 'approved' && (
                        <button
                          disabled={updatingSponsorId === sponsor.id}
                          onClick={() => handleUpdateSponsorStatus(sponsor.id, 'approved')}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <Check className="w-3 h-3" />
                          <span>تایید و انتشار</span>
                        </button>
                      )}

                      {sponsor.status !== 'rejected' && (
                        <button
                          disabled={updatingSponsorId === sponsor.id}
                          onClick={() => handleUpdateSponsorStatus(sponsor.id, 'rejected')}
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer"
                        >
                          <span>رد</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {localSponsors.length === 0 && (
              <div className="col-span-full py-16 bg-white rounded-2xl border border-neutral-200 text-center space-y-2">
                <Award className="w-10 h-10 text-neutral-300 mx-auto" />
                <h4 className="text-sm font-bold text-neutral-700">هیچ درخواست حامی ثبت نشده است</h4>
                <p className="text-xs text-neutral-400">
                  اسپانسرها می‌توانند از طریق دکمه «درخواست اسپانسری» در صفحه اصلی اقدام کنند.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: DATABASE ADMIN USERS & SMS RECIPIENTS */}
      {activeTab === 'admins' && (
        <div className="space-y-4">
          {/* Top Banner explaining Database Admins & SMS */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-neutral-900 to-neutral-800 text-white shadow-xs">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-white/10 text-emerald-400 shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">مدیران سیستم و دریافت‌کنندگان پیامک‌های ثبت غرفه</h3>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  لیست زیر مستقیماً از پایگاه‌داده (کاربران دارای نقش <span className="font-mono bg-white/20 px-1 py-0.2 rounded text-emerald-300">admin</span>) خوانده می‌شود. به محض ثبت هر درخواست غرفه جدید توسط متقاضیان، پیامک هشدار برای کلیه شماره‌های فعال در این لیست به صورت خودکار ارسال می‌گردد.
                </p>
              </div>
            </div>
          </div>

          {/* Admin Action Message Toast */}
          {adminActionMessage && (
            <div
              className={`p-3 rounded-xl border text-xs leading-relaxed flex items-center justify-between gap-2 ${
                adminActionMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <span>{adminActionMessage.text}</span>
              <button
                type="button"
                onClick={() => setAdminActionMessage(null)}
                className="text-neutral-400 hover:text-neutral-700 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Add New Admin Form */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-4 space-y-3.5 h-fit shadow-xs">
              <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
                <Plus className="w-4 h-4 text-neutral-900" />
                <h4 className="text-xs font-bold text-neutral-900">افزودن مدیر جدید به پایگاه‌داده</h4>
              </div>

              <form onSubmit={handleAddAdmin} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                    شماره تلفن همراه مدیر <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      dir="ltr"
                      value={newAdminPhone}
                      onChange={(e) => setNewAdminPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="09123456789"
                      maxLength={11}
                      required
                      className="w-full rounded-xl border border-neutral-200 pl-3 pr-8 py-2 text-xs font-mono text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 outline-none"
                    />
                    <Phone className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-2.5" />
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1">
                    پیامک‌های ثبت غرفه‌های جدید به این شماره نیز ارسال خواهد شد.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                    نام و عنوان مدیر (اختیاری)
                  </label>
                  <input
                    type="text"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    placeholder="مثلاً: مهندس رضایی - دبیر اجرایی"
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={addingAdmin || newAdminPhone.length < 11}
                  className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:scale-98 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{addingAdmin ? 'در حال ثبت مدیر...' : 'افزودن مدیر و فعال‌سازی پیامک‌ها'}</span>
                </button>
              </form>
            </div>

            {/* List of Active Admins in Database */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-neutral-900">مدیران ذخیره شده در پایگاه‌داده</h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-neutral-900 text-white">
                    {toPersianDigits(adminList.length)} مدیر
                  </span>
                </div>
                <button
                  type="button"
                  onClick={fetchAdmins}
                  disabled={loadingAdmins}
                  className="text-xs text-neutral-600 hover:text-neutral-900 font-medium underline cursor-pointer"
                >
                  {loadingAdmins ? 'در حال به‌روزرسانی...' : 'تازه سازی لیست'}
                </button>
              </div>

              <div className="space-y-2">
                {adminList.map((admin) => (
                  <div
                    key={admin.id}
                    className="p-3.5 bg-white rounded-2xl border border-neutral-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-bold text-neutral-900">{admin.fullName || 'مدیر سامانه'}</h5>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            نقش admin
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-neutral-500">
                          <span className="font-mono text-neutral-700 font-medium" dir="ltr">
                            {admin.phone}
                          </span>
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <BellRing className="w-3 h-3" />
                            دریافت‌کننده پیامک ثبت غرفه
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <a
                        href={`tel:${admin.phone}`}
                        title="تماس با مدیر"
                        className="p-2 rounded-xl border border-neutral-200 text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                      >
                        <PhoneCall className="w-4 h-4" />
                      </a>
                      {adminList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAdmin(admin.id, admin.phone)}
                          title="حذف دسترسی مدیریت"
                          className="p-2 rounded-xl border border-neutral-200 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {adminList.length === 0 && !loadingAdmins && (
                  <div className="py-12 bg-white rounded-2xl border border-neutral-200 text-center space-y-2">
                    <ShieldCheck className="w-8 h-8 text-neutral-300 mx-auto" />
                    <p className="text-xs text-neutral-500">هیچ مدیری در پایگاه‌داده یافت نشد.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* NATIVE BOTTOM SHEET / MODAL: REVIEW VENDOR REQUEST */}
      {/* ========================================================================= */}
      {selectedVendor && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-neutral-950/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-neutral-200 max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Drag Handle for Mobile ergonomics */}
            <div className="pt-3 pb-1 flex justify-center sm:hidden">
              <div className="w-12 h-1.5 bg-neutral-300 rounded-full" />
            </div>

            {/* Bottom Sheet Header */}
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedVendor.logoUrl ? (
                  <img
                    src={selectedVendor.logoUrl}
                    alt={selectedVendor.brandName}
                    className="w-10 h-10 rounded-xl object-contain border border-neutral-200 bg-white p-1"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">{selectedVendor.brandName}</h3>
                  <p className="text-[11px] text-neutral-500">{selectedVendor.guildGroup}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedVendor(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {/* Quick Contact Bar for Admin on Phone */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-neutral-500" />
                  <span className="font-mono font-bold text-neutral-900" dir="ltr">
                    {selectedVendor.phone}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(selectedVendor.phone)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-neutral-200 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedPhone ? 'کپی شد' : 'کپی'}</span>
                  </button>
                  <a
                    href={`tel:${selectedVendor.phone}`}
                    className="px-2.5 py-1 rounded-lg bg-neutral-900 text-[11px] font-medium text-white flex items-center gap-1"
                  >
                    <PhoneCall className="w-3 h-3" />
                    <span>تماس</span>
                  </a>
                </div>
              </div>

              {/* Status & Contract Card */}
              <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <div>
                  <span className="text-[11px] text-neutral-500 block mb-0.5">وضعیت لوگوی برند:</span>
                  {selectedVendor.logoUrl ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>بارگذاری شده</span>
                    </span>
                  ) : (
                    <span className="text-neutral-400 font-medium">بدون لوگو</span>
                  )}
                </div>

                <div>
                  <span className="text-[11px] text-neutral-500 block mb-0.5">امضای تعهدنامه رسمی:</span>
                  {selectedVendor.isContractSigned ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>امضا شده ({selectedVendor.signedBy || 'نماینده'})</span>
                    </span>
                  ) : (
                    <span className="text-amber-700 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>هنوز امضا نشده</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Booth & Location requested */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70">
                  <span className="text-[11px] text-neutral-400 block">موقعیت و سالن:</span>
                  <span className="font-semibold text-neutral-800 mt-0.5 block">
                    {selectedVendor.selectedLocation || 'سالن اصلی'}
                  </span>
                </div>
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70">
                  <span className="text-[11px] text-neutral-400 block">نوع غرفه:</span>
                  <span className="font-semibold text-neutral-800 mt-0.5 block">
                    {selectedVendor.boothType || 'استاندارد'}
                  </span>
                </div>
              </div>

              {/* Facilities */}
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70">
                <span className="text-[11px] text-neutral-400 block mb-1">امکانات درخواستی:</span>
                <span className="font-medium text-neutral-800 block">
                  {selectedVendor.requestedFacilities && selectedVendor.requestedFacilities.length > 0
                    ? selectedVendor.requestedFacilities.join('، ')
                    : 'امکانات پایه رویداد'}
                </span>
              </div>

              {selectedVendor.description && (
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70">
                  <span className="text-[11px] text-neutral-400 block mb-1">شرح خدمات و برند:</span>
                  <p className="text-neutral-700 leading-relaxed">{selectedVendor.description}</p>
                </div>
              )}

              {/* Documents */}
              <div className="space-y-1.5">
                <span className="font-semibold text-neutral-800 text-[11px] block">
                  مدارک هویتی و پروانه‌ها:
                </span>
                {selectedVendor.documents && selectedVendor.documents.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedVendor.documents.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 border border-neutral-200"
                      >
                        <span className="font-mono text-neutral-800 truncate">{doc.name}</span>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-white border border-neutral-200 text-neutral-700 hover:text-neutral-950 font-medium text-[11px] flex items-center gap-1 shadow-2xs"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>مشاهده فایل</span>
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-neutral-400 text-xs">مدرکی پیوست نشده است.</span>
                )}
              </div>

              {/* Booth Assignment Input */}
              <div className="space-y-1.5 pt-2 border-t border-neutral-100">
                <label className="block font-bold text-neutral-900 text-xs">
                  شماره غرفه تخصیص‌یافته:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={assignBoothNumber}
                    onChange={(e) => setAssignBoothNumber(e.target.value)}
                    placeholder="مثال: A-12 (سالن خلیج فارس)"
                    className="flex-1 rounded-xl border border-neutral-300 p-2.5 text-xs text-neutral-900 font-semibold focus:border-neutral-900 outline-none"
                  />
                  {/* Fast booth suggestions */}
                  <button
                    type="button"
                    onClick={() => setAssignBoothNumber(`A-${toEnglishDigits(toPersianDigits(Math.floor(Math.random() * 50) + 1))}`)}
                    className="px-3 py-2 bg-neutral-100 rounded-xl text-neutral-700 text-xs font-medium cursor-pointer"
                  >
                    پیشنهادی
                  </button>
                </div>
              </div>

              {/* Admin Note Textarea */}
              <div className="space-y-1.5">
                <label className="block font-medium text-neutral-700 text-xs">
                  یادداشت دبیرخانه به غرفه‌دار:
                </label>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="پیام یا الزامات لازم جهت اعلام به نماینده..."
                  className="w-full rounded-xl border border-neutral-300 p-2.5 text-xs text-neutral-900 focus:border-neutral-900 outline-none"
                />
              </div>
            </div>

            {/* Fixed Bottom Action Buttons for Thumb Reach */}
            <div className="p-4 bg-white border-t border-neutral-200 grid grid-cols-3 gap-2 safe-bottom">
              <button
                type="button"
                disabled={updatingStatus}
                onClick={() => handleUpdateStatus('approved')}
                className="py-3 px-2 rounded-xl bg-emerald-600 active:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تایید نهایی</span>
              </button>

              <button
                type="button"
                disabled={updatingStatus}
                onClick={() => handleUpdateStatus('revision_needed')}
                className="py-3 px-2 rounded-xl bg-amber-100 active:bg-amber-200 text-amber-900 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1"
              >
                <AlertCircle className="w-4 h-4 text-amber-700" />
                <span>اصلاح مدارک</span>
              </button>

              <button
                type="button"
                disabled={updatingStatus}
                onClick={() => handleUpdateStatus('rejected')}
                className="py-3 px-2 rounded-xl bg-rose-50 active:bg-rose-100 text-rose-700 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1 border border-rose-200"
              >
                <X className="w-4 h-4 text-rose-600" />
                <span>رد درخواست</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* NATIVE BOTTOM SHEET: CREATE NEW EVENT */}
      {/* ========================================================================= */}
      {showCreateEventModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-neutral-950/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-neutral-200 max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Drag Handle */}
            <div className="pt-3 pb-1 flex justify-center sm:hidden">
              <div className="w-12 h-1.5 bg-neutral-300 rounded-full" />
            </div>

            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-neutral-900" />
                <h3 className="text-sm font-bold text-neutral-900">تعریف رویداد جدید</h3>
              </div>
              <button
                onClick={() => setShowCreateEventModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="p-4 overflow-y-auto space-y-3.5 text-xs flex-1">
              {/* Cover Image Upload / Selection */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-neutral-50 border border-neutral-200">
                <label className="block font-semibold text-neutral-800 text-xs">
                  تصویر کاور رویداد (بنر نمایشی صفحه اول)
                </label>
                {newBannerUrl ? (
                  <div className="relative h-32 w-full rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 group">
                    <img
                      src={newBannerUrl}
                      alt="پیش‌نمایش کاور"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={() => setNewBannerUrl('')}
                      className="absolute top-2 left-2 p-1.5 rounded-lg bg-neutral-900/80 text-white hover:bg-rose-600 transition cursor-pointer"
                      title="حذف این تصویر"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="w-full h-24 rounded-xl border-2 border-dashed border-neutral-300 hover:border-neutral-500 flex flex-col items-center justify-center p-2 text-center cursor-pointer bg-white transition hover:bg-neutral-50">
                      {uploadingNewBanner ? (
                        <div className="flex flex-col items-center gap-1 text-neutral-600">
                          <Loader2 className="w-5 h-5 animate-spin text-neutral-900" />
                          <span className="text-[11px] font-medium">در حال آپلود...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-neutral-600">
                          <Upload className="w-5 h-5 text-neutral-500 mb-0.5" />
                          <span className="text-xs font-semibold">انتخاب یا درگ تصویر کاور</span>
                          <span className="text-[10px] text-neutral-400">فرمت‌های JPG، PNG و WEBP</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingNewBanner}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleUploadImageFile(file, (url) => setNewBannerUrl(url), setUploadingNewBanner);
                          }
                        }}
                      />
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={newBannerUrl}
                        onChange={(e) => setNewBannerUrl(e.target.value)}
                        placeholder="یا آدرس مستقیم تصویر (URL) را وارد کنید..."
                        className="flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-xs bg-white text-neutral-900 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">
                  عنوان کامل رویداد <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: نمایشگاه تخصصی فناوری و هوش مصنوعی"
                  className="w-full rounded-xl border border-neutral-300 p-2.5 text-xs text-neutral-900 focus:border-neutral-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">دسته‌بندی</label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 p-2.5 text-xs text-neutral-900 focus:border-neutral-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    تاریخ شروع شمسی <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    required
                    value={newShamsiDate}
                    onChange={(e) => setNewShamsiDate(e.target.value)}
                    placeholder="1403/10/15"
                    className="w-full rounded-xl border border-neutral-300 p-2.5 text-xs font-mono text-neutral-900 focus:border-neutral-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">مدت زمان (روز)</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={newDuration}
                    onChange={(e) => setNewDuration(parseInt(e.target.value, 10) || 1)}
                    className="w-full rounded-xl border border-neutral-300 p-2.5 text-xs text-neutral-900 focus:border-neutral-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-neutral-700 mb-1">ظرفیت غرفه‌ها</label>
                  <input
                    type="number"
                    min={5}
                    value={newMaxBooths}
                    onChange={(e) => setNewMaxBooths(parseInt(e.target.value, 10) || 50)}
                    className="w-full rounded-xl border border-neutral-300 p-2.5 text-xs text-neutral-900 focus:border-neutral-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">تعرفه پایه غرفه‌ها</label>
                  <input
                    type="text"
                    value={newBoothPrice}
                    onChange={(e) => setNewBoothPrice(e.target.value)}
                    placeholder="مثال: ۱۵,۰۰۰,۰۰۰ تومان"
                    className="w-full rounded-xl border border-neutral-300 p-2.5 text-xs text-neutral-900 focus:border-neutral-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    محل و سالن برگزاری <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="تهران، مرکز همایش‌های برج میلاد"
                    className="w-full rounded-xl border border-neutral-300 p-2.5 text-xs text-neutral-900 focus:border-neutral-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">توضیحات رویداد</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="شرح کوتاه درباره اهداف رویداد و جامعه مخاطبان..."
                  className="w-full rounded-xl border border-neutral-300 p-2.5 text-xs text-neutral-900 focus:border-neutral-900 outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">قوانین و دستورالعمل‌ها</label>
                <input
                  type="text"
                  value={newRules}
                  onChange={(e) => setNewRules(e.target.value)}
                  placeholder="رعایت ایمنی و مقررات سالن الزامی است."
                  className="w-full rounded-xl border border-neutral-300 p-2.5 text-xs text-neutral-900 focus:border-neutral-900 outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={creatingEvent}
                  className="w-full py-3 rounded-xl bg-neutral-900 active:scale-98 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs safe-bottom"
                >
                  {creatingEvent ? 'در حال ثبت...' : 'ثبت و انتشار رویداد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* NATIVE BOTTOM SHEET: COMPREHENSIVE EVENT CONFIGURATION & EDIT MANAGER */}
      {/* ========================================================================= */}
      {managingEvent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-neutral-950/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-neutral-200 max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Drag Handle */}
            <div className="pt-3 pb-1 flex justify-center sm:hidden">
              <div className="w-12 h-1.5 bg-neutral-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="p-4 border-b border-neutral-100 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-neutral-900" />
                  <h3 className="text-sm font-bold text-neutral-900">
                    ویرایش و پیکربندی کامل رویداد
                  </h3>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5 truncate max-w-xs sm:max-w-md font-medium">
                  {managingEvent.title}
                </p>
              </div>

              <button
                onClick={() => setManagingEvent(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-neutral-200 bg-neutral-50/80 px-4 gap-2 text-xs font-semibold overflow-x-auto">
              <button
                type="button"
                onClick={() => setManageTab('info')}
                className={`py-3 px-3 border-b-2 transition whitespace-nowrap cursor-pointer ${
                  manageTab === 'info'
                    ? 'border-neutral-900 text-neutral-900'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                }`}
              >
                اطلاعات عمومی و کاور
              </button>
              <button
                type="button"
                onClick={() => setManageTab('booths')}
                className={`py-3 px-3 border-b-2 transition whitespace-nowrap cursor-pointer ${
                  manageTab === 'booths'
                    ? 'border-neutral-900 text-neutral-900'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                }`}
              >
                سالن‌ها و غرفه‌ها ({toPersianDigits(manageLocations.length + manageTypes.length)})
              </button>
              <button
                type="button"
                onClick={() => setManageTab('rules')}
                className={`py-3 px-3 border-b-2 transition whitespace-nowrap cursor-pointer ${
                  manageTab === 'rules'
                    ? 'border-neutral-900 text-neutral-900'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                }`}
              >
                دستورالعمل و قرارداد
              </button>
              <button
                type="button"
                onClick={() => setManageTab('gallery')}
                className={`py-3 px-3 border-b-2 transition whitespace-nowrap cursor-pointer ${
                  manageTab === 'gallery'
                    ? 'border-neutral-900 text-neutral-900'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                }`}
              >
                گالری ({toPersianDigits(manageGallery.length)})
              </button>
            </div>

            {/* Content Area */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs flex-1">
              {/* TAB 1: General Info & Cover Image */}
              {manageTab === 'info' && (
                <div className="space-y-3.5">
                  {/* Banner / Cover Image */}
                  <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2.5">
                    <label className="block font-bold text-neutral-900 text-xs">
                      تصویر کاور رویداد (بنر اصلی صفحه نخست)
                    </label>
                    {manageBannerUrl ? (
                      <div className="relative h-44 w-full rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 group">
                        <img
                          src={manageBannerUrl}
                          alt="کاور رویداد"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => setManageBannerUrl('')}
                          className="absolute top-2 left-2 p-1.5 rounded-lg bg-neutral-900/80 text-white hover:bg-rose-600 transition cursor-pointer flex items-center gap-1 text-[11px]"
                          title="حذف این کاور"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف کاور</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="w-full h-28 rounded-xl border-2 border-dashed border-neutral-300 hover:border-neutral-500 flex flex-col items-center justify-center p-3 text-center cursor-pointer bg-white transition hover:bg-neutral-50">
                          {uploadingManageBanner ? (
                            <div className="flex flex-col items-center gap-1.5 text-neutral-600">
                              <Loader2 className="w-6 h-6 animate-spin text-neutral-900" />
                              <span className="text-xs font-medium">در حال آپلود و ذخیره فایل...</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1 text-neutral-600">
                              <Upload className="w-6 h-6 text-neutral-400 mb-0.5" />
                              <span className="text-xs font-semibold">بارگذاری تصویر کاور رویداد</span>
                              <span className="text-[11px] text-neutral-400">فرمت‌های JPG، PNG یا WEBP</span>
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingManageBanner}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleUploadImageFile(file, (url) => setManageBannerUrl(url), setUploadingManageBanner);
                              }
                            }}
                          />
                        </label>
                      </div>
                    )}

                    <div>
                      <input
                        type="url"
                        value={manageBannerUrl}
                        onChange={(e) => setManageBannerUrl(e.target.value)}
                        placeholder="یا آدرس مستقیم تصویر (URL) را وارد نمایید..."
                        className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs bg-white text-neutral-900 outline-none"
                      />
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">
                      عنوان کامل رویداد <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={manageTitle}
                      onChange={(e) => setManageTitle(e.target.value)}
                      className="w-full rounded-xl border border-neutral-300 p-2.5 text-xs text-neutral-900 focus:border-neutral-900 outline-none"
                    />
                  </div>

                  {/* Category & Date */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-medium text-neutral-700 mb-1">دسته‌بندی</label>
                      <input
                        type="text"
                        value={manageCategory}
                        onChange={(e) => setManageCategory(e.target.value)}
                        className="w-full rounded-xl border border-neutral-300 p-2.5 text-xs text-neutral-900 focus:border-neutral-900 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-neutral-700 mb-1">
                        تاریخ شروع شمسی <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        required
                        value={manageShamsiDate}
                        onChange={(e) => setManageShamsiDate(e.target.value)}
                        className="w-full rounded-xl border border-neutral-300 p-2.5 text-xs font-mono text-neutral-900 focus:border-neutral-900 outline-none"
                      />
                    </div>
                  </div>

                  {/* Duration & Booth Limit */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-medium text-neutral-700 mb-1">مدت زمان (روز)</label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={manageDuration}
                        onChange={(e) => setManageDuration(parseInt(e.target.value, 10) || 1)}
                        className="w-full rounded-xl border border-neutral-300 p-2.5 text-xs text-neutral-900 focus:border-neutral-900 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-neutral-700 mb-1">ظرفیت کل غرفه‌ها</label>
                      <input
                        type="number"
                        min={1}
                        value={manageMaxBooths}
                        onChange={(e) => setManageMaxBooths(parseInt(e.target.value, 10) || 50)}
                        className="w-full rounded-xl border border-neutral-300 p-2.5 text-xs text-neutral-900 focus:border-neutral-900 outline-none"
                      />
                    </div>
                  </div>

                  {/* Price & Location */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-medium text-neutral-700 mb-1">تعرفه پایه غرفه‌ها</label>
                      <input
                        type="text"
                        value={manageBoothPrice}
                        onChange={(e) => setManageBoothPrice(e.target.value)}
                        placeholder="مثال: ۱۵,۰۰۰,۰۰۰ تومان"
                        className="w-full rounded-xl border border-neutral-300 p-2.5 text-xs text-neutral-900 focus:border-neutral-900 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-neutral-700 mb-1">
                        محل و سالن برگزاری <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={manageLocation}
                        onChange={(e) => setManageLocation(e.target.value)}
                        className="w-full rounded-xl border border-neutral-300 p-2.5 text-xs text-neutral-900 focus:border-neutral-900 outline-none"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">توضیحات معرفی رویداد</label>
                    <textarea
                      rows={3}
                      value={manageDescription}
                      onChange={(e) => setManageDescription(e.target.value)}
                      className="w-full rounded-xl border border-neutral-300 p-2.5 text-xs text-neutral-900 focus:border-neutral-900 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: Rules & Contract */}
              {manageTab === 'rules' && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                    <label className="block font-bold text-neutral-900 text-xs">
                      دستورالعمل، ضوابط و مقررات حضور در نمایشگاه
                    </label>
                    <p className="text-[11px] text-neutral-500">
                      این متن به عنوان قوانین و الزامات غرفه‌داری به متقاضیان نمایش داده می‌شود.
                    </p>
                    <textarea
                      rows={4}
                      value={manageRules}
                      onChange={(e) => setManageRules(e.target.value)}
                      placeholder="رعایت ایمنی و مقررات سالن الزامی است..."
                      className="w-full rounded-xl border border-neutral-300 p-2.5 text-xs bg-white text-neutral-900 focus:border-neutral-900 outline-none"
                    />
                  </div>

                  <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                    <label className="block font-bold text-neutral-900 text-xs">
                      متن تعهدنامه و پیش‌نویس قرارداد دیجیتال
                    </label>
                    <p className="text-[11px] text-neutral-500">
                      متنی که غرفه‌دار قبل از ثبت نهایی باید آن را مطالعه و تأیید/امضا کند.
                    </p>
                    <textarea
                      rows={4}
                      value={manageContractText}
                      onChange={(e) => setManageContractText(e.target.value)}
                      placeholder="تعهدنامه مشارکت رسمی و رعایت ضوابط غرفه‌داری..."
                      className="w-full rounded-xl border border-neutral-300 p-2.5 text-xs bg-white text-neutral-900 focus:border-neutral-900 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: Booths, Types & Requirements */}
              {manageTab === 'booths' && (
                <div className="space-y-4">
                  {/* 1. Locations */}
                  <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-neutral-900">۱. سالن‌ها و موقعیت‌ها</h4>
                      <span className="text-[11px] font-mono text-neutral-500 font-bold">
                        {toPersianDigits(manageLocations.length)} سالن
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {manageLocations.map((loc, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-neutral-200 text-xs font-medium text-neutral-800 shadow-2xs"
                        >
                          <span>{loc}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveLocation(idx)}
                            className="text-neutral-400 hover:text-rose-600 transition cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={newLocationInput}
                        onChange={(e) => setNewLocationInput(e.target.value)}
                        placeholder="نام سالن یا زون جدید..."
                        className="flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-xs bg-white text-neutral-900 outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddLocation}
                        className="px-3.5 py-2 rounded-xl bg-neutral-900 text-white font-medium text-xs cursor-pointer shrink-0"
                      >
                        افزودن
                      </button>
                    </div>
                  </div>

                  {/* 2. Booth Types */}
                  <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-neutral-900">۲. انواع غرفه و قیمت‌ها</h4>
                      <span className="text-[11px] font-mono text-neutral-500 font-bold">
                        {toPersianDigits(manageTypes.length)} نوع
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {manageTypes.map((btype) => (
                        <div
                          key={btype.id}
                          className="p-3 bg-white rounded-xl border border-neutral-200 flex items-center justify-between gap-2 shadow-2xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-neutral-900">{btype.title}</span>
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-medium border border-emerald-200">
                                {btype.price}
                              </span>
                            </div>
                            {btype.description && (
                              <p className="text-[11px] text-neutral-500 mt-0.5">{btype.description}</p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveBoothType(btype.id)}
                            className="p-1.5 text-neutral-400 hover:text-rose-600 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 pt-2 border-t border-neutral-200">
                      <input
                        type="text"
                        value={newTypeTitle}
                        onChange={(e) => setNewTypeTitle(e.target.value)}
                        placeholder="عنوان نوع غرفه (مثال: غرفه استارتاپی)"
                        className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs bg-white text-neutral-900 outline-none"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={newTypePrice}
                          onChange={(e) => setNewTypePrice(e.target.value)}
                          placeholder="تعرفه (مثال: ۱۵,۰۰۰,۰۰۰ تومان)"
                          className="rounded-xl border border-neutral-300 px-3 py-2 text-xs bg-white text-neutral-900 outline-none"
                        />
                        <input
                          type="text"
                          value={newTypeDesc}
                          onChange={(e) => setNewTypeDesc(e.target.value)}
                          placeholder="توضیحات تجهیزات"
                          className="rounded-xl border border-neutral-300 px-3 py-2 text-xs bg-white text-neutral-900 outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddBoothType}
                        className="w-full py-2 rounded-xl bg-neutral-900 text-white font-medium text-xs cursor-pointer"
                      >
                        + ثبت این نوع غرفه
                      </button>
                    </div>
                  </div>

                  {/* 3. Requirements */}
                  <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-neutral-900">۳. ملزومات و امکانات فنی</h4>
                      <span className="text-[11px] font-mono text-neutral-500 font-bold">
                        {toPersianDigits(manageRequirements.length)} مورد
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {manageRequirements.map((req, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-neutral-200 text-xs font-medium text-neutral-800 shadow-2xs"
                        >
                          <span>{req}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveRequirement(idx)}
                            className="text-neutral-400 hover:text-rose-600 transition cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={newReqInput}
                        onChange={(e) => setNewReqInput(e.target.value)}
                        placeholder="افزودن امکانات جدید..."
                        className="flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-xs bg-white text-neutral-900 outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddRequirement}
                        className="px-3.5 py-2 rounded-xl bg-neutral-900 text-white font-medium text-xs cursor-pointer shrink-0"
                      >
                        افزودن
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Gallery */}
              {manageTab === 'gallery' && (
                <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900">تصاویر گالری نمایشگاه</h4>
                      <p className="text-[11px] text-neutral-500">
                        تصاویر منتخب در کاتالوگ و بخش معرفی رویداد به بازدیدکنندگان نمایش داده می‌شوند.
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-neutral-500 font-bold">
                      {toPersianDigits(manageGallery.length)} تصویر
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {manageGallery.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        className="relative group aspect-video rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 shadow-2xs"
                      >
                        <img
                          src={imgUrl}
                          alt={`عکس ${idx + 1}`}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryItem(idx, 'manager')}
                          className="absolute top-1.5 left-1.5 p-1.5 rounded-lg bg-neutral-900/80 text-white hover:bg-rose-600 transition cursor-pointer"
                          title="حذف این تصویر"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {/* Upload box */}
                    <label className="aspect-video rounded-xl border-2 border-dashed border-neutral-300 hover:border-neutral-500 flex flex-col items-center justify-center p-2 text-center cursor-pointer bg-white transition hover:bg-neutral-50">
                      <Upload className="w-5 h-5 text-neutral-400 mb-1" />
                      <span className="text-[11px] text-neutral-700 font-semibold">افزودن عکس</span>
                      <span className="text-[10px] text-neutral-400">کلیک یا درگ فایل</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleUploadGalleryFile(e, 'manager')}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Bottom Actions */}
            <div className="p-4 bg-white border-t border-neutral-200 flex flex-wrap items-center justify-between gap-2.5 safe-bottom">
              <button
                type="button"
                onClick={() => handleDeleteEvent(managingEvent)}
                className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>حذف رویداد</span>
              </button>

              <div className="flex items-center gap-2 mr-auto">
                <button
                  type="button"
                  onClick={() => setManagingEvent(null)}
                  className="px-4 py-2.5 rounded-xl text-neutral-600 hover:bg-neutral-100 text-xs font-medium cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  disabled={savingEventConfig}
                  onClick={handleSaveEventConfig}
                  className="py-2.5 px-6 rounded-xl bg-neutral-900 active:scale-98 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  {savingEventConfig ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>در حال ذخیره...</span>
                    </>
                  ) : (
                    <span>ذخیره تغییرات رویداد</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DEDICATED EVENT GALLERY MANAGEMENT MODAL */}
      {/* ========================================================================= */}
      {galleryEditingEvent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-neutral-950/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-neutral-200 max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="p-4 border-b border-neutral-100 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-amber-600" />
                  <h3 className="text-sm font-bold text-neutral-900">
                    مدیریت گالری تصاویر رویداد
                  </h3>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5 truncate max-w-xs sm:max-w-md">
                  {galleryEditingEvent.title}
                </p>
              </div>

              <button
                onClick={() => setGalleryEditingEvent(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {/* Uploader Section */}
              <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-950">افزودن تصویر جدید به گالری:</span>
                  <span className="text-[11px] text-amber-800 font-medium">پشتیبانی از فایل یا لینک وب</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* File Upload Button */}
                  <label className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-amber-300 bg-white hover:bg-amber-100/50 cursor-pointer transition">
                    <Upload className="w-4 h-4 text-amber-700" />
                    <span className="text-xs font-semibold text-amber-900">انتخاب عکس از دستگاه</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleUploadGalleryFile(e, 'dedicated')}
                    />
                  </label>

                  {/* URL Input */}
                  <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-amber-300">
                    <input
                      type="url"
                      value={newGalleryUrl}
                      onChange={(e) => setNewGalleryUrl(e.target.value)}
                      placeholder="یا درج لینک تصویر (URL)..."
                      className="flex-1 px-2.5 py-1.5 text-xs outline-none bg-transparent text-neutral-800 placeholder:text-neutral-400"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddGalleryUrl('dedicated')}
                      className="px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-medium cursor-pointer shrink-0"
                    >
                      افزودن
                    </button>
                  </div>
                </div>
              </div>

              {/* Gallery Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-neutral-900">تصاویر فعال در گالری:</h4>
                  <span className="text-xs font-mono text-neutral-500 font-bold">
                    {toPersianDigits(galleryImages.length)} تصویر
                  </span>
                </div>

                {galleryImages.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {galleryImages.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative group aspect-video rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 shadow-2xs"
                      >
                        <img
                          src={url}
                          alt={`گالری ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-neutral-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-white/90 text-neutral-900 hover:bg-white transition shadow-sm"
                            title="مشاهده اندازه اصلی"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryItem(idx, 'dedicated')}
                            className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition shadow-sm cursor-pointer"
                            title="حذف این تصویر"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-1">
                    <ImageIcon className="w-8 h-8 text-neutral-300 mx-auto" />
                    <p className="text-xs text-neutral-500">هنوز تصویری برای این رویداد اضافه نشده است.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-white border-t border-neutral-200 flex items-center justify-between gap-3 safe-bottom">
              <button
                type="button"
                onClick={() => setGalleryEditingEvent(null)}
                className="px-4 py-2.5 rounded-xl text-neutral-600 hover:bg-neutral-100 text-xs font-medium cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={savingGallery}
                onClick={handleSaveDedicatedGallery}
                className="flex-1 py-2.5 rounded-xl bg-neutral-900 active:scale-98 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                {savingGallery ? 'در حال ذخیره...' : 'ذخیره گالری تصاویر'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Powered by badje.ir attribution */}
      <div className="text-center py-4 text-[11px] text-neutral-400">
        <span>سامانه مدیریت رویداد و غرفه‌ها • </span>
        <span className="font-semibold text-neutral-600">powered by badje.ir</span>
      </div>

      {/* FIXED NATIVE MOBILE BOTTOM APP DOCK */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-neutral-200/90 z-40 px-4 py-2 safe-bottom shadow-lg flex items-center justify-around max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          className={`flex flex-col items-center gap-1 transition touch-control cursor-pointer relative py-1 px-3 rounded-xl ${
            activeTab === 'requests' ? 'text-neutral-900 font-bold' : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          {pendingCount > 0 && (
            <span className="absolute top-0 right-2 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
          )}
          <Building2 className={`w-5 h-5 ${activeTab === 'requests' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-[10px]">درخواست‌ها</span>
        </button>

        {/* Center Prominent Create Event Action */}
        <button
          type="button"
          onClick={() => setShowCreateEventModal(true)}
          className="w-12 h-12 -mt-5 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow-lg active:scale-95 transition cursor-pointer"
          title="افزودن رویداد جدید"
        >
          <Plus className="w-6 h-6" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('events')}
          className={`flex flex-col items-center gap-1 transition touch-control cursor-pointer py-1 px-3 rounded-xl ${
            activeTab === 'events' ? 'text-neutral-900 font-bold' : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Calendar className={`w-5 h-5 ${activeTab === 'events' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-[10px]">رویدادها</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sponsors')}
          className={`flex flex-col items-center gap-1 transition touch-control cursor-pointer py-1 px-3 rounded-xl relative ${
            activeTab === 'sponsors' ? 'text-neutral-900 font-bold' : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          {localSponsors.filter((s) => s.status === 'pending').length > 0 && (
            <span className="absolute top-0 right-2 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
          )}
          <Award className={`w-5 h-5 ${activeTab === 'sponsors' ? 'stroke-[2.5] text-amber-600' : 'stroke-[1.8]'}`} />
          <span className="text-[10px]">حامیان</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('admins')}
          className={`flex flex-col items-center gap-1 transition touch-control cursor-pointer py-1 px-3 rounded-xl relative ${
            activeTab === 'admins' ? 'text-neutral-900 font-bold' : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <ShieldCheck className={`w-5 h-5 ${activeTab === 'admins' ? 'stroke-[2.5] text-emerald-600' : 'stroke-[1.8]'}`} />
          <span className="text-[10px]">مدیران</span>
        </button>

        {onBackToLanding && (
          <button
            type="button"
            onClick={onBackToLanding}
            className="flex flex-col items-center gap-1 text-neutral-500 hover:text-neutral-800 transition touch-control cursor-pointer py-1 px-3 rounded-xl"
          >
            <Globe className="w-5 h-5 stroke-[1.8]" />
            <span className="text-[10px]">صفحه اصلی</span>
          </button>
        )}
      </div>
    </div>
  );
};
