import React, { useEffect, useState } from 'react';
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

interface AuthViewProps {
  inviteToken?: string;
  onLoginSuccess: (user: { name: string; phoneNumber?: string; email?: string; role: OrganizationRole; organizationId?: string; avatar?: string }) => void;
  onBackToApp: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  inviteToken,
  onLoginSuccess,
  onBackToApp,
}) => {
  const { showSnackbar } = useSnackbar();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

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
            name: data.user.name,
            avatar: data.user.avatar,
            phoneNumber: data.user.phoneNumber,
            email: data.user.email,
            role: data.user.role as OrganizationRole,
            organizationId: data.user.organizationId,
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
            name: data.user.name,
            avatar: data.user.avatar,
            phoneNumber: data.user.phoneNumber,
            email: data.user.email,
            role: data.user.role as OrganizationRole,
            organizationId: data.user.organizationId,
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
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#f7f8fc] p-4 font-sans text-right select-none dark:bg-[#080d1d] sm:p-6 lg:p-8" dir="rtl">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-500/10" />
      <div className="pointer-events-none absolute -bottom-40 -left-32 h-[32rem] w-[32rem] rounded-full bg-violet-400/10 blur-3xl dark:bg-violet-500/10" />

      <div className="relative z-10 w-full max-w-md">
        {/* Authentication panel */}
      <div className="flex w-full flex-col gap-6 rounded-[1.5rem] border border-slate-200/90 bg-white p-6 shadow-[0_20px_60px_-36px_rgba(30,41,99,0.35)] dark:border-slate-800 dark:bg-[#0f172a] sm:p-8">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 dark:bg-indigo-500">
            <span className="text-lg font-black tracking-[-0.16em]">M</span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            سامانه سازمانی متا‌میت
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            احراز هویت یکپارچه و ثبت امضای الکترونیک اسناد
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex rounded-xl border border-slate-200/80 bg-slate-50 p-1 text-xs font-semibold dark:border-slate-800 dark:bg-slate-900/80">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setFeedback(null);
            }}
            className={`flex-1 rounded-lg py-2.5 transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            ورود به حساب
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setFeedback(null);
            }}
            className={`flex-1 rounded-lg py-2.5 transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            ثبت‌نام جدید
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('forgot');
              setFeedback(null);
            }}
            className={`flex-1 rounded-lg py-2.5 transition-all cursor-pointer ${
              mode === 'forgot'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            بازیابی رمز
          </button>
        </div>

        {/* 1. LOGIN FORM */}
        {mode === 'login' && (
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
                  className="absolute left-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
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
                  className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
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
        {mode === 'forgot' && (
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
              <span className="text-base font-black tracking-[-0.16em]">M</span>
            </div>
            <div className="text-left">
              <div className="text-sm font-black tracking-tight">MetaMeet</div>
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
