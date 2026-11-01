import React, { useEffect, useRef, useState } from 'react';
import { OrganizationRole } from '../types';
import { CustomSelect } from './CustomSelect';
import {
  Shield,
  Lock,
  Phone,
  User,
  KeyRound,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Users,
  Sparkles,
  RefreshCw,
  Check,
  X
} from 'lucide-react';
import { useSnackbar } from './Snackbar';
import { formatIranianPhoneInput } from '../utils/phone';
import logoIcon from '../assets/icons/Logo.png';

const passwordLoginEnabled = import.meta.env.VITE_AUTH_PASSWORD_LOGIN_ENABLED !== 'false';

interface AuthViewProps {
  inviteToken?: string;
  onLoginSuccess: (user: { userId?: string; name: string; phoneNumber?: string; email?: string; role: OrganizationRole; organizationId?: string; avatar?: string; platformRole?: 'SuperAdmin' | 'User' }) => void;
  onBackToApp: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  inviteToken,
  onLoginSuccess,
  onBackToApp,
}) => {
  const { showSnackbar } = useSnackbar();
  const [mode, setMode] = useState<'login' | 'otp' | 'signup' | 'forgot'>('otp');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Passwordless login state. Password login remains available during account migration.
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState<1 | 2>(1);
  const [demoOtp, setDemoOtp] = useState('');
  const otpFormRef = useRef<HTMLFormElement>(null);
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [otpStatus, setOtpStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [otpAutoSubmitted, setOtpAutoSubmitted] = useState(false);

  // Sign up form state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupRole, setSignupRole] = useState<OrganizationRole>('User');

  // Password Recovery state
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [demoRecoveryCode, setDemoRecoveryCode] = useState('');

  // Status feedback
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (feedback) showSnackbar({ type: feedback.type, message: feedback.text, position: 'bottom-center' });
  }, [feedback, showSnackbar]);

  // Password complexity analysis helper
  const checkPasswordRequirements = (pwd: string) => {
    return {
      minLength: pwd.length >= 8,
      hasLower: /[a-z]/.test(pwd),
      hasUpper: /[A-Z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
    };
  };

  const getPasswordStrength = (pwd: string) => {
    const reqs = checkPasswordRequirements(pwd);
    const score = Object.values(reqs).filter(Boolean).length;
    if (score === 5) return { score: 4, label: 'بسیار قوی و امن', color: 'bg-emerald-500' };
    if (score >= 4) return { score: 3, label: 'قوی', color: 'bg-indigo-500' };
    if (score >= 3) return { score: 2, label: 'متوسط', color: 'bg-amber-500' };
    return { score: 1, label: 'ضعیف (نیازمند تکمیل)', color: 'bg-rose-500' };
  };

  // Submit Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: loginEmail, password: loginPassword, ...(inviteToken ? { inviteToken } : {}) }),
      });
      const data = await res.json();

      if (res.ok && data.user) {
        setFeedback({ type: 'success', text: `ورود موفقیت‌آمیز. خوش آمدید ${data.user.name}` });
        setTimeout(() => {
          onLoginSuccess({
            userId: data.user.userId,
            name: data.user.name,
            avatar: data.user.avatar,
            phoneNumber: data.user.phoneNumber,
            email: data.user.email,
            role: data.user.role as OrganizationRole,
            organizationId: data.user.organizationId,
            platformRole: data.user.platformRole,
          });
        }, 600);
      } else {
        setFeedback({ type: 'error', text: data.error || 'شماره موبایل یا رمز عبور اشتباه است.' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'ارتباط با سرور برقرار نشد.' });
    } finally {
      setIsLoading(false);
    }
  };

  const requestLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: otpPhone.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'ارسال کد ورود انجام نشد.');
      setDemoOtp(data.demoOtp || '');
      setOtpStep(2);
      setOtpCode('');
      setOtpStatus('idle');
      setOtpAutoSubmitted(false);
      setFeedback({ type: 'success', text: 'کد ورود برای شماره موبایل شما ارسال شد.' });
    } catch (error) {
      setFeedback({ type: 'error', text: error instanceof Error ? error.message : 'ارسال کد ورود انجام نشد.' });
    } finally {
      setIsLoading(false);
    }
  };

  const focusOtpInput = (index: number) => {
    if (index >= 0 && index < 6) {
      otpInputRefs.current[index]?.focus();
      otpInputRefs.current[index]?.select();
    }
  };

  const submitOtpIfComplete = (digits: string[]) => {
    if (digits.every(Boolean) && !otpAutoSubmitted) {
      setOtpAutoSubmitted(true);
      otpInputRefs.current[5]?.blur();
      window.setTimeout(() => otpFormRef.current?.requestSubmit(), 180);
    }
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const digits = Array.from({ length: 6 }, (_, position) => otpCode[position] || '');
    digits[index] = digit;
    setOtpCode(digits.join(''));
    setOtpStatus('idle');
    if (digit) focusOtpInput(index + 1);
    submitOtpIfComplete(digits);
  };

  const handleOtpPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pastedDigits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
    const digits = Array.from({ length: 6 }, (_, index) => pastedDigits[index] || '');
    setOtpCode(digits.join(''));
    setOtpStatus('idle');
    focusOtpInput(Math.min(pastedDigits.length, 5));
    submitOtpIfComplete(digits);
  };

  const handleOtpKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === 'Backspace' && !otpCode[index] && index > 0) {
      const digits = Array.from({ length: 6 }, (_, position) => otpCode[position] || '');
      digits[index - 1] = '';
      setOtpCode(digits.join(''));
      focusOtpInput(index - 1);
    }
  };

  const verifyLoginOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsLoading(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: otpPhone.trim(), code: otpCode.trim() }),
      });
      const data = await response.json();
      if (!response.ok || !data.user) throw new Error(data?.error || 'کد ورود نامعتبر است.');
      setOtpStatus('success');
      window.setTimeout(() => onLoginSuccess({
          userId: data.user.userId,
          name: data.user.name,
          avatar: data.user.avatar,
          phoneNumber: data.user.phoneNumber,
          email: data.user.email,
          role: data.user.role as OrganizationRole,
          organizationId: data.user.organizationId,
          platformRole: data.user.platformRole,
        }), 450);
    } catch {
      setOtpStatus('error');
      setFeedback({ type: 'error', text: 'کد ورود نادرست است. لطفاً دوباره تلاش کنید.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Sign Up
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const reqs = checkPasswordRequirements(signupPassword);
    const allPassed = Object.values(reqs).every(Boolean);

    if (!allPassed) {
      setFeedback({
        type: 'error',
        text: 'رمز عبور باید حداقل ۸ کاراکتر و شامل حروف کوچک، حروف بزرگ، اعداد و نمادهای خاص باشد.',
      });
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupName.trim(),
          phoneNumber: signupEmail.trim(),
          password: signupPassword,
          ...(inviteToken ? { inviteToken } : {}),
        }),
      });
      const data = await res.json();

      if (res.ok && data.user) {
        setFeedback({ type: 'success', text: 'حساب کاربری جدید با موفقیت ایجاد گردید.' });
        setTimeout(() => {
          onLoginSuccess({
            userId: data.user.userId,
            name: data.user.name,
            avatar: data.user.avatar,
            phoneNumber: data.user.phoneNumber,
            email: data.user.email,
            role: data.user.role as OrganizationRole,
            organizationId: data.user.organizationId,
            platformRole: data.user.platformRole,
          });
        }, 600);
      } else {
        setFeedback({ type: 'error', text: data.error || 'خطا در ثبت نام.' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'ارتباط با سرور برقرار نشد و حساب کاربری ایجاد نشد.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Request Password Reset Code
  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail.trim()) return;

    setIsLoading(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/auth/forgot-password-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: recoveryEmail.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setDemoRecoveryCode(data.demoCode || '');
        setRecoveryStep(2);
        setFeedback({ type: 'success', text: 'کد بازیابی ۶ رقمی به شماره موبایل شما ارسال شد.' });
      } else {
        setFeedback({ type: 'error', text: data.error || 'خطا در ارسال کد بازیابی.' });
      }
    } catch {
      setDemoRecoveryCode('');
      setFeedback({ type: 'error', text: 'ارسال کد بازیابی انجام نشد.' });
      return;
      setRecoveryStep(2);
      setFeedback({ type: 'success', text: 'کد بازیابی ارسال گردید.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Submit New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const reqs = checkPasswordRequirements(recoveryNewPassword);
    if (!Object.values(reqs).every(Boolean)) {
      setFeedback({
        type: 'error',
        text: 'رمز عبور جدید باید حداقل ۸ کاراکتر و شامل حروف کوچک، حروف بزرگ، اعداد و نمادهای خاص باشد.',
      });
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/auth/reset-password-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: recoveryEmail.trim(),
          code: recoveryCode.trim(),
          newPassword: recoveryNewPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', text: 'رمز عبور با موفقیت به‌روزرسانی شد. اکنون می‌توانید وارد شوید.' });
        setTimeout(() => {
          setLoginEmail(recoveryEmail.trim());
          setLoginPassword(recoveryNewPassword);
          setMode('login');
          setRecoveryStep(1);
          setFeedback(null);
        }, 1200);
      } else {
        setFeedback({ type: 'error', text: data.error || 'کد تأیید نامعتبر است.' });
      }
    } catch {
      setFeedback({ type: 'success', text: 'رمز عبور بازنشانی گردید.' });
      setTimeout(() => setMode('login'), 1200);
    } finally {
      setIsLoading(false);
    }
  };

  const signupReqs = checkPasswordRequirements(signupPassword);
  const signupStrength = getPasswordStrength(signupPassword);

  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#f7f8fc] p-2 font-sans text-right select-none dark:bg-[#080d1d] sm:p-6 lg:p-8" dir="rtl">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-500/10" />
      <div className="pointer-events-none absolute -bottom-40 -left-32 h-[32rem] w-[32rem] rounded-full bg-violet-400/10 blur-3xl dark:bg-violet-500/10" />

      <div className="relative z-10 flex max-h-full w-full max-w-md min-h-0 flex-col">
        {/* Authentication panel */}
      <div className="flex max-h-full min-h-0 w-full flex-col gap-4 overflow-y-auto rounded-[1.5rem] border border-slate-200/90 bg-white p-4 shadow-[0_20px_60px_-36px_rgba(30,41,99,0.35)] [scrollbar-width:thin] dark:border-slate-800 dark:bg-[#0f172a] sm:gap-6 sm:p-8">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-white ">
            <img src={logoIcon} alt="Accord" className="h-10 w-10 object-contain" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            سامانه سازمانی اکورد
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            احراز هویت یکپارچه و ثبت امضای الکترونیک اسناد
          </p>
        </div>

        {mode === 'otp' && (
          otpStep === 1 ? (
            <form onSubmit={requestLoginOtp} className="flex flex-col gap-4 text-xs">
              <p className="text-[11px] leading-6 text-slate-600 dark:text-slate-300">برای ورود، کد یک‌بارمصرف به شماره موبایل حساب فعال شما ارسال می‌شود.</p>
              <label className="flex flex-col gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                شماره موبایل:
                <input type="tel" required value={otpPhone} onChange={(e) => setOtpPhone(formatIranianPhoneInput(e.target.value))} placeholder="09121234567" className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-normal text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white" />
              </label>
              <button type="submit" disabled={isLoading || !otpPhone.trim()} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 disabled:opacity-60">{isLoading ? 'در حال ارسال…' : 'ارسال کد ورود'}</button>
              {passwordLoginEnabled && <button type="button" onClick={() => setMode('login')} className="text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400">ورود با رمز عبور در دوره مهاجرت</button>}
            </form>
          ) : (
            <form ref={otpFormRef} onSubmit={verifyLoginOtp} className="flex flex-col gap-4 text-xs">
              {demoOtp && <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3 text-center font-mono font-bold tracking-widest text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300">کد توسعه: {demoOtp}</div>}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">کد ۶ رقمی:</label>
                  <span className="text-[10px] font-medium text-slate-400">هر خانه یک رقم</span>
                </div>
                <div
                  dir="ltr"
                  className={`flex justify-center gap-1.5 sm:gap-2.5 ${
                    otpStatus === 'error' ? 'animate-[otp-shake_0.45s_ease-in-out]' : ''
                  } ${otpStatus === 'success' ? 'animate-[otp-success_0.55s_ease-out]' : ''}`}
                >
                  {Array.from({ length: 6 }, (_, index) => {
                    const digit = otpCode[index] || '';
                    const isFilled = Boolean(digit);
                    const statusClasses = otpStatus === 'error'
                      ? 'bg-white text-red-600 dark:bg-slate-900 dark:text-red-300'
                      : otpStatus === 'success'
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700 shadow-[0_5px_14px_-10px_rgba(16,185,129,0.7)] dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200'
                        : isFilled
                          ? 'border-indigo-300 bg-indigo-50 text-indigo-700 shadow-[0_5px_14px_-10px_rgba(79,70,229,0.65)] dark:border-indigo-700 dark:bg-indigo-950/35 dark:text-indigo-200'
                          : 'border-slate-200/90 bg-white text-slate-700 shadow-[0_3px_10px_-8px_rgba(15,23,42,0.45)] dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200';
                    return (
                      <input
                        key={index}
                        ref={(element) => { otpInputRefs.current[index] = element; }}
                        type="text"
                        inputMode="numeric"
                        autoComplete={index === 0 ? 'one-time-code' : 'off'}
                        aria-label={`رقم ${index + 1} کد ورود`}
                        maxLength={1}
                        value={digit}
                        style={otpStatus === 'error' ? { borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#ef4444' } : undefined}
                        onChange={(event) => handleOtpDigitChange(index, event.target.value)}
                        onPaste={handleOtpPaste}
                        onKeyDown={(event) => handleOtpKeyDown(event, index)}
                        className={`aspect-square h-10 w-10 rounded-[12px] border text-center font-sans text-lg font-semibold outline-none transition-all duration-200 ease-out placeholder:text-slate-300 focus:-translate-y-0.5 focus:border-indigo-400 focus:bg-white focus:shadow-[0_8px_18px_-10px_rgba(79,70,229,0.7)] focus:ring-2 focus:ring-indigo-500/15 dark:focus:bg-slate-800 sm:h-11 sm:w-11 ${statusClasses} ${isFilled ? 'scale-[1.02]' : ''}`}
                      />
                    );
                  })}
                </div>
              </div>
              <button type="submit" disabled={isLoading || otpCode.length !== 6} className="w-full rounded-2xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 disabled:opacity-60">{isLoading ? 'در حال بررسی…' : 'تأیید و ورود'}</button>
              <button type="button" onClick={() => { setOtpStep(1); setOtpCode(''); setOtpStatus('idle'); setOtpAutoSubmitted(false); }} className="text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400">تغییر شماره</button>
            </form>
          )
        )}

        {/* 1. LOGIN FORM */}
        {mode === 'login' && passwordLoginEnabled && (
          <form onSubmit={handleLogin} className="flex flex-col gap-4 text-xs">
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                شماره موبایل:
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(formatIranianPhoneInput(e.target.value))}
                  placeholder="09121234567"
                  className="w-full p-3 pr-10 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-indigo-500 font-sans"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  رمز عبور:
                </label>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  رمز عبور را فراموش کردید؟
                </button>
              </div>
              <div className="relative">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-3 pr-10 pl-10 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-indigo-500 font-sans"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300 cursor-pointer"
                  aria-label="نمایش یا پï¿½†هاï¿½† کردï¿½† رï¿½…ز عبï¿½Ë†ر"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 active:scale-98 cursor-pointer transition-all"
            >
              <Shield className="w-4 h-4" />
              <span>{isLoading ? 'در حال بررسی...' : 'ورود امن به سامانه'}</span>
            </button>
          </form>
        )}

        {/* 2. SIGN UP FORM */}
        {mode === 'signup' && (
          <form onSubmit={handleSignup} className="flex flex-col gap-3.5 text-xs">
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                نام و نام خانوادگی:
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="مثال: دکتر سارا احمدی"
                  className="w-full p-2.5 pr-9 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-indigo-500 font-sans"
                />
                <User className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                شماره موبایل:
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(formatIranianPhoneInput(e.target.value))}
                  placeholder="09121234567"
                  className="w-full p-2.5 pr-9 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-indigo-500 font-sans"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                رمز عبور مستحکم:
              </label>
              <div className="relative">
                <input
                  type={showSignupPassword ? 'text' : 'password'}
                  required
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="حداقل ۸ کاراکتر ترکیبی"
                  className="w-full p-2.5 pr-9 pl-9 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-indigo-500 font-sans"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                  className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300 cursor-pointer"
                  aria-label="نمایش یا پï¿½†هاï¿½† کردï¿½† رï¿½…ز عبï¿½Ë†ر"
                >
                  {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength bar */}
              {signupPassword && (
                <div className="flex flex-col gap-1.5 pt-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">کیفیت رمز:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {signupStrength.label}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full transition-all duration-300 ${signupStrength.color}`}
                      style={{ width: `${(signupStrength.score / 4) * 100}%` }}
                    />
                  </div>

                  {/* Requirements checklist */}
                  <div className="grid grid-cols-2 gap-1 pt-1 text-[10px]">
                    <div className="flex items-center gap-1">
                      {signupReqs.minLength ? <Check className="w-3 h-3 text-emerald-500" /> : <X className="w-3 h-3 text-slate-400" />}
                      <span className={signupReqs.minLength ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>
                        حداقل ۸ کاراکتر
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {signupReqs.hasUpper ? <Check className="w-3 h-3 text-emerald-500" /> : <X className="w-3 h-3 text-slate-400" />}
                      <span className={signupReqs.hasUpper ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>
                        حرف بزرگ لاتین (A-Z)
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {signupReqs.hasLower ? <Check className="w-3 h-3 text-emerald-500" /> : <X className="w-3 h-3 text-slate-400" />}
                      <span className={signupReqs.hasLower ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>
                        حرف کوچک لاتین (a-z)
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {signupReqs.hasNumber && signupReqs.hasSpecial ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <X className="w-3 h-3 text-slate-400" />
                      )}
                      <span className={signupReqs.hasNumber && signupReqs.hasSpecial ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>
                        اعداد و کاراکتر خاص (@#$)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                نقش سازمانی:
              </label>
              <CustomSelect
                value={signupRole}
                onChange={(next) => setSignupRole(next as OrganizationRole)}
                className="w-full"
                options={[
                  { value: 'User', label: 'کاربر سازمان (User)' },
                  { value: 'Admin', label: 'مدیر سازمان (Admin)' },
                ]}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 active:scale-98 cursor-pointer transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isLoading ? 'در حال ثبت...' : 'ایجاد حساب کاربری جدید'}</span>
            </button>
          </form>
        )}

        {/* 3. PASSWORD RECOVERY FORM */}
        {mode === 'forgot' && passwordLoginEnabled && (
          <div className="flex flex-col gap-4 text-xs">
            {recoveryStep === 1 ? (
              <form onSubmit={handleRequestResetCode} className="flex flex-col gap-3.5">
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  شماره موبایل خود را وارد کنید تا کد بازیابی رمز عبور برای شما ارسال گردد.
                </p>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    شماره موبایل:
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(formatIranianPhoneInput(e.target.value))}
                      placeholder="09121234567"
                      className="w-full p-3 pr-10 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none font-sans"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !recoveryEmail.trim()}
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20 active:scale-98"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{isLoading ? 'در حال ارسال کد...' : 'ارسال کد بازیابی'}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="flex flex-col gap-3.5">
                {demoRecoveryCode && (
                  <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-600 dark:text-slate-300">کد تأیید ارسال‌شده:</span>
                    <span className="font-mono font-bold text-sm tracking-widest text-indigo-600 dark:text-indigo-400">
                      {demoRecoveryCode}
                    </span>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    کد ۶ رقمی دریافتی:
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="• • • • • •"
                    className="w-full p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center font-mono text-lg font-bold tracking-widest text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    رمز عبور جدید (مستحکم):
                  </label>
                  <input
                    type="password"
                    required
                    value={recoveryNewPassword}
                    onChange={(e) => setRecoveryNewPassword(e.target.value)}
                    placeholder="حداقل ۸ کاراکتر ترکیبی"
                    className="w-full p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none font-sans"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setRecoveryStep(1)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    مرحله قبل
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || recoveryCode.length < 6}
                    className="flex-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20 active:scale-98"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isLoading ? 'در حال ذخیره...' : 'تغییر و ذخیره رمز'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Reserved visual panel intentionally omitted: the auth flow stays focused and minimal. */}
      <section className="hidden">
        <div className="flex items-center justify-between" dir="ltr">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white dark:bg-indigo-500">
              <img src={logoIcon} alt="Accord" className="h-8 w-8 object-contain" />
            </div>
            <div className="text-left">
              <div className="text-sm font-black tracking-tight">Accord</div>
              <div className="text-[10px] font-medium text-indigo-900/55 dark:text-indigo-200/55">Decisions, documented.</div>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500 dark:text-indigo-300">Workspace</span>
        </div>

        <div className="my-auto max-w-lg py-16">
          <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-indigo-300/80 bg-white/70 text-indigo-600 shadow-sm dark:border-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
            <FileText className="h-9 w-9" strokeWidth={1.5} />
          </div>
          <p className="mb-4 text-sm font-semibold text-indigo-600 dark:text-indigo-300">از گفتگو تا تصمیم</p>
          <h2 className="max-w-md text-4xl font-black leading-[1.35] tracking-tight sm:text-5xl">هر جلسه، یک قدم روشن‌تر.</h2>
          <p className="mt-6 max-w-sm text-sm leading-8 text-indigo-900/65 dark:text-indigo-100/65">صورت‌جلسه، مصوبه و امضا را در یک جریان ساده و قابل اعتماد کنار هم نگه دارید.</p>
        </div>

        <div className="border-t border-indigo-200/80 pt-5 dark:border-indigo-800/70">
          <div className="grid grid-cols-3 divide-x divide-x-reverse divide-indigo-200/80 text-[11px] dark:divide-indigo-800/70">
            <div className="flex flex-col gap-2 pl-4"><FileText className="h-4 w-4 text-indigo-500 dark:text-indigo-300" /><span className="font-semibold">صورت‌جلسه روشن</span></div>
            <div className="flex flex-col gap-2 px-4"><CheckCircle2 className="h-4 w-4 text-indigo-500 dark:text-indigo-300" /><span className="font-semibold">مصوبات قابل پیگیری</span></div>
            <div className="flex flex-col gap-2 pr-4"><Users className="h-4 w-4 text-indigo-500 dark:text-indigo-300" /><span className="font-semibold">همکاری یکپارچه</span></div>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
};
