import { apiFetch as fetch } from '../api';
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { toPersianDigits } from '../utils/shamsi';
import { Phone, ArrowRight, CheckCircle2, ShieldCheck, Store, X, Key, Eye, EyeOff, Lock, UserCheck } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User, token?: string) => void;
  initialRole?: UserRole;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialRole = 'vendor',
}) => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>(initialRole);
  const [adminAuthMethod, setAdminAuthMethod] = useState<'secret_key' | 'otp'>('secret_key');
  const [adminSecretKey, setAdminSecretKey] = useState('');
  const [adminFullName, setAdminFullName] = useState('');
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(120);

  // Sync role when initialRole changes
  useEffect(() => {
    if (isOpen) {
      setRole(initialRole);
      setStep('phone');
      setErrorMessage('');
      setOtpCode('');
      setCountdown(120);
      setAdminAuthMethod('secret_key');
    }
  }, [isOpen, initialRole]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'otp' && countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  if (!isOpen) return null;

  // 1. Direct Admin Login using ADMIN_SECRET_KEY
  const handleAdminSecretLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length !== 11 || !cleanPhone.startsWith('09')) {
      setErrorMessage('لطفاً شماره تلفن همراه ۱۱ رقمی معتبر وارد نمایید (مانند ۰۹۱۲۳۴۵۶۷۸۹)');
      return;
    }
    if (!adminSecretKey.trim()) {
      setErrorMessage('لطفاً کلید امنیتی مدیریت (Admin Secret Key) را وارد فرمایید.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          secretKey: adminSecretKey.trim(),
          fullName: adminFullName.trim() || 'مدیر سیستم',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'کلید امنیتی مدیریت نامعتبر است');
      }

      onLoginSuccess(data.user, data.token);
      onClose();
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Request OTP Code
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length !== 11 || !cleanPhone.startsWith('09')) {
      setErrorMessage('لطفاً شماره تلفن همراه ۱۱ رقمی معتبر وارد نمایید (مانند ۰۹۱۲۳۴۵۶۷۸۹)');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطا در ارسال کد تایید');
      }

      setStep('otp');
      setCountdown(120);
      setOtpCode('');
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Verify OTP Code (or Secret Key in OTP field)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const cleanCode = otpCode.trim();
    if (!cleanCode) {
      setErrorMessage('لطفاً کد تایید را وارد نمایید');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          code: cleanCode,
          role,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'کد تایید نادرست است یا منقضی شده است');
      }

      onLoginSuccess(data.user, data.token);
      onClose();
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-xl overflow-hidden border border-neutral-200">
        {/* Minimal Header */}
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">
              {role === 'admin' ? 'ورود مدیریت رویدادها' : 'ورود به پنل غرفه‌داران'}
            </h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              {role === 'admin'
                ? 'ورود با کلید امنیتی یا اعتبارسنجی پیامکی'
                : 'احراز هویت دومرحله‌ای با پیامک کد تایید یکبار مصرف'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5">
          {errorMessage && (
            <div className="mb-4 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs leading-relaxed">
              {errorMessage}
            </div>
          )}

          {step === 'phone' ? (
            <div className="space-y-4">
              {/* Role Toggle */}
              <div>
                <label className="block text-[11px] font-medium text-neutral-600 mb-1.5">نوع دسترسی:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRole('vendor');
                      setErrorMessage('');
                    }}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-medium transition cursor-pointer ${
                      role === 'vendor'
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>نماینده غرفه‌دار</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRole('admin');
                      setErrorMessage('');
                    }}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-medium transition cursor-pointer ${
                      role === 'admin'
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>مدیریت رویداد</span>
                  </button>
                </div>
              </div>

              {/* For Admin: Choice between Secret Key and SMS OTP */}
              {role === 'admin' && (
                <div className="p-1 bg-neutral-100 rounded-lg flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAdminAuthMethod('secret_key');
                      setErrorMessage('');
                    }}
                    className={`flex-1 py-1.5 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center justify-center gap-1 ${
                      adminAuthMethod === 'secret_key'
                        ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                        : 'text-neutral-500 hover:text-neutral-800'
                    }`}
                  >
                    <Key className="w-3 h-3 text-amber-600" />
                    <span>ورود با کلید امنیتی</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdminAuthMethod('otp');
                      setErrorMessage('');
                    }}
                    className={`flex-1 py-1.5 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center justify-center gap-1 ${
                      adminAuthMethod === 'otp'
                        ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                        : 'text-neutral-500 hover:text-neutral-800'
                    }`}
                  >
                    <Phone className="w-3 h-3 text-neutral-600" />
                    <span>پیامک کد یکبار مصرف</span>
                  </button>
                </div>
              )}

              {/* ADMIN SECRET KEY FORM */}
              {role === 'admin' && adminAuthMethod === 'secret_key' ? (
                <form onSubmit={handleAdminSecretLogin} className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                      شماره موبایل مدیر در سامانه <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        dir="ltr"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="09120000000"
                        maxLength={11}
                        required
                        className="w-full rounded-lg border border-neutral-200 pl-3 pr-8 py-2 text-xs font-mono text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 outline-none"
                      />
                      <Phone className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-3" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                      کلید امنیتی مدیریت (Admin Secret Key) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showSecretKey ? 'text' : 'password'}
                        dir="ltr"
                        value={adminSecretKey}
                        onChange={(e) => setAdminSecretKey(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        autoFocus
                        className="w-full rounded-lg border border-neutral-200 pl-8 pr-8 py-2 text-xs font-mono text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 outline-none"
                      />
                      <Lock className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-3" />
                      <button
                        type="button"
                        onClick={() => setShowSecretKey(!showSecretKey)}
                        className="absolute left-2.5 top-2.5 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                      >
                        {showSecretKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || phone.length < 11 || !adminSecretKey.trim()}
                    className="w-full rounded-lg bg-neutral-900 py-2.5 text-xs font-medium text-white hover:bg-neutral-800 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 mt-2"
                  >
                    {loading ? 'در حال تایید کلید امنیتی...' : 'ورود مستقیم با کلید مدیریت'}
                    <UserCheck className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : (
                /* PHONE OTP FORM (Vendor or Admin opting for SMS) */
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                      شماره تلفن همراه <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        dir="ltr"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="09123456789"
                        maxLength={11}
                        required
                        autoFocus
                        className="w-full rounded-lg border border-neutral-200 pl-3 pr-8 py-2 text-xs font-mono text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 outline-none"
                      />
                      <Phone className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-3" />
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-1">
                      کد تایید ۵ رقمی به این شماره پیامک خواهد شد.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || phone.length < 11}
                    className="w-full rounded-lg bg-neutral-900 py-2.5 text-xs font-medium text-white hover:bg-neutral-800 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {loading ? 'در حال ارسال کد...' : 'دریافت کد تایید پیامکی'}
                    <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* OTP VERIFICATION STEP */
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center pb-1">
                <p className="text-xs text-neutral-600">
                  کد تایید ارسال شده به{' '}
                  <strong className="font-mono text-neutral-900" dir="ltr">
                    {phone}
                  </strong>:
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStep('phone');
                    setErrorMessage('');
                  }}
                  className="text-[11px] text-neutral-500 hover:text-neutral-800 underline mt-0.5 cursor-pointer"
                >
                  ویرایش شماره تلفن
                </button>
              </div>

              <div>
                <input
                  type="text"
                  dir="ltr"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.trim())}
                  placeholder={role === 'admin' ? 'کد تایید یا کلید امنیتی' : '• • • • •'}
                  required
                  autoFocus
                  className="w-full tracking-widest text-center text-base font-mono font-bold rounded-lg border border-neutral-200 py-2 text-neutral-900 focus:border-neutral-900 outline-none"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-neutral-500">
                {countdown > 0 ? (
                  <>
                    <span>زمان باقی‌مانده:</span>
                    <span className="font-mono text-neutral-700 font-medium">
                      {toPersianDigits(Math.floor(countdown / 60))}:
                      {toPersianDigits((countdown % 60).toString().padStart(2, '0'))}
                    </span>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={loading}
                    className="text-neutral-900 font-medium underline hover:text-neutral-700 cursor-pointer text-xs mx-auto"
                  >
                    ارسال مجدد کد تایید
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !otpCode.trim()}
                className="w-full rounded-lg bg-neutral-900 py-2.5 text-xs font-medium text-white hover:bg-neutral-800 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {loading ? 'در حال بررسی...' : 'ورود به سامانه'}
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
