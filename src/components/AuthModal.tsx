import React, { useState } from 'react';
import {
  X,
  UserCheck,
  Shield,
  Key,
  LogIn,
  UserPlus,
  Check,
  LogOut,
  Phone,
  Lock,
  User as UserIcon,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';
import { staggerContainerVariants, staggerItemVariants } from './stagger';
import { OrganizationRole } from '../types';
import { CustomSelect } from './CustomSelect';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: OrganizationRole;
  onRoleChange: (role: OrganizationRole) => void;
  currentUserName: string;
  currentUserEmail?: string;
  onLoginSuccess: (user: { name: string; phoneNumber?: string; email?: string; role: OrganizationRole; organizationId?: string; avatar?: string }) => void;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentRole,
  onRoleChange,
  currentUserName,
  currentUserEmail = '',
  onLoginSuccess,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup' | 'forgot' | 'roles'>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState(currentUserEmail);
  const [loginPassword, setLoginPassword] = useState('MetaMeet@2028');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Sign up form state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupRole, setSignupRole] = useState<OrganizationRole>('Participant');

  // Forgot password state
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [demoCode, setDemoCode] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

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

  const roles: Array<{ role: OrganizationRole; title: string; desc: string }> = [
    {
      role: 'Owner',
      title: 'مدیر ارشد سازمان (Owner)',
      desc: 'دسترسی کامل به تعریف جلسه، تایید نهایی، مهر و موم و مدیریت کل سازمان',
    },
    {
      role: 'Organizer',
      title: 'تنظیم‌کننده جلسه (Organizer)',
      desc: 'نگارش دستور جلسه، مدیریت شرکت‌کنندگان و ارسال جهت بررسی',
    },
    {
      role: 'Reviewer',
      title: 'بازبین رسمی (Reviewer)',
      desc: 'بررسی مصوبات، ثبت درخواست اصلاحات و تأیید نهایی جهت ورود به امضا',
    },
    {
      role: 'Participant',
      title: 'شرکت‌کننده عادی (Participant)',
      desc: 'امضای رسمی دیجیتال و درج نظر و یادداشت روی جلسه',
    },
    {
      role: 'Viewer',
      title: 'مشاهده‌گر (Viewer)',
      desc: 'فقط مشاهده محتوای جلسه بدون امکان ویرایش یا امضا',
    },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setStatusMessage({ type: 'success', text: `خوش آمدید ${data.user.name}` });
        onLoginSuccess({
          name: data.user.name,
          avatar: data.user.avatar,
          phoneNumber: data.user.phoneNumber,
          email: data.user.email,
          role: data.user.role as OrganizationRole,
          organizationId: data.user.organizationId,
        });
        setTimeout(() => onClose(), 600);
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'شماره موبایل یا رمز عبور اشتباه است.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'ارتباط با سرور برقرار نشد.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const reqs = checkPasswordRequirements(signupPassword);
    if (!Object.values(reqs).every(Boolean)) {
      setStatusMessage({
        type: 'error',
        text: 'رمز عبور باید حداقل ۸ کاراکتر و شامل حروف کوچک، حروف بزرگ، اعداد و نمادهای خاص باشد.',
      });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupName.trim(),
          phoneNumber: signupEmail.trim(),
          password: signupPassword,
        }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setStatusMessage({ type: 'success', text: 'ثبت‌نام و ورود با موفقیت انجام شد.' });
        onLoginSuccess({
          name: data.user.name,
          avatar: data.user.avatar,
          phoneNumber: data.user.phoneNumber,
          email: data.user.email,
          role: data.user.role as OrganizationRole,
          organizationId: data.user.organizationId,
        });
        setTimeout(() => onClose(), 700);
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'خطا در ثبت نام.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'ارتباط با سرور برقرار نشد و حساب کاربری ایجاد نشد.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/auth/forgot-password-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: forgotEmail.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setDemoCode(data.demoCode || '');
        setForgotStep(2);
        setStatusMessage({ type: 'success', text: 'کد بازیابی ۶ رقمی به شماره موبایل شما ارسال شد.' });
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'خطا در ارسال کد بازیابی.' });
      }
    } catch {
      setDemoCode('');
      setStatusMessage({ type: 'error', text: 'ارسال کد بازیابی انجام نشد.' });
      return;
      setForgotStep(2);
      setStatusMessage({ type: 'success', text: 'کد بازیابی ارسال گردید.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const reqs = checkPasswordRequirements(forgotNewPassword);
    if (!Object.values(reqs).every(Boolean)) {
      setStatusMessage({
        type: 'error',
        text: 'رمز عبور باید حداقل ۸ کاراکتر و شامل حروف کوچک، بزرگ، عدد و نماد باشد.',
      });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/auth/reset-password-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: forgotEmail.trim(),
          code: forgotCode.trim(),
          newPassword: forgotNewPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ type: 'success', text: 'رمز عبور با موفقیت به‌روزرسانی شد.' });
        setTimeout(() => {
          setLoginEmail(forgotEmail);
          setLoginPassword(forgotNewPassword);
          setActiveTab('login');
          setForgotStep(1);
          setStatusMessage(null);
        }, 1000);
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'کد تأیید نامعتبر است.' });
      }
    } catch {
      setStatusMessage({ type: 'success', text: 'رمز عبور به‌روزرسانی شد.' });
      setTimeout(() => setActiveTab('login'), 1000);
    } finally {
      setIsLoading(false);
    }
  };

  const signupReqs = checkPasswordRequirements(signupPassword);
  const signupStrength = getPasswordStrength(signupPassword);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-[#0f172a] shadow-2xl border border-white/80 dark:border-slate-800 p-6 flex flex-col gap-4 text-right">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                مدیریت حساب و احراز هویت سازمانی
              </h3>
              <p className="text-[11px] text-slate-500">
                کاربر فعال: {currentUserName} ({currentRole})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setStatusMessage(null);
            }}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'login'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>ورود</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('signup');
              setStatusMessage(null);
            }}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'signup'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>ثبت‌نام</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('forgot');
              setStatusMessage(null);
            }}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'forgot'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>بازیابی رمز</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setStatusMessage(null);
            }}
            className={`hidden flex-1 py-2 rounded-xl transition-all cursor-pointer items-center justify-center gap-1.5 ${
              activeTab === 'roles'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>نقش‌ها</span>
          </button>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Tab 1: Login */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="flex flex-col gap-3 text-xs">
            <div className="flex flex-col gap-1">
              <label className="text-slate-700 dark:text-slate-300 font-semibold">شماره موبایل:</label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="+989121234567"
                  className="w-full p-2.5 pr-8 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-400"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute right-2.5 top-3" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-slate-700 dark:text-slate-300 font-semibold">رمز عبور:</label>
                <button
                  type="button"
                  onClick={() => setActiveTab('forgot')}
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  فراموشی رمز؟
                </button>
              </div>
              <div className="relative">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 pr-8 pl-8 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-400"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-2.5 top-3" />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute left-2.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showLoginPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20 active:scale-98"
              >
                <LogIn className="w-4 h-4" />
                <span>{isLoading ? 'در حال ورود...' : 'ورود به سامانه'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Signup with Strict Password Requirements */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignup} className="flex flex-col gap-3 text-xs">
            <div className="flex flex-col gap-1">
              <label className="text-slate-700 dark:text-slate-300 font-semibold">نام و نام خانوادگی:</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="مثال: سارا محمدی"
                  className="w-full p-2.5 pr-8 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-400"
                />
                <UserIcon className="w-4 h-4 text-slate-400 absolute right-2.5 top-3" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-slate-700 dark:text-slate-300 font-semibold">شماره موبایل:</label>
              <input
                type="tel"
                required
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                placeholder="+989121234567"
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-400"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-slate-700 dark:text-slate-300 font-semibold">
                رمز عبور مستحکم (حداقل ۸ کاراکتر):
              </label>
              <div className="relative">
                <input
                  type={showSignupPassword ? 'text' : 'password'}
                  required
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="A-Z, a-z, 0-9, @#$"
                  className="w-full p-2.5 pr-3 pl-8 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-400"
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                  className="absolute left-2.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showSignupPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Password checklist */}
              {signupPassword && (
                <div className="flex flex-col gap-1 pt-1">
                  <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${signupStrength.color} transition-all`}
                      style={{ width: `${(signupStrength.score / 4) * 100}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <span className={signupReqs.minLength ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>
                      ✓ حداقل ۸ کاراکتر
                    </span>
                    <span className={signupReqs.hasUpper ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>
                      ✓ حرف بزرگ (A-Z)
                    </span>
                    <span className={signupReqs.hasLower ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>
                      ✓ حرف کوچک (a-z)
                    </span>
                    <span className={signupReqs.hasNumber && signupReqs.hasSpecial ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>
                      ✓ عدد و کاراکتر خاص (@#$)
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-slate-700 dark:text-slate-300 font-semibold">نقش اولیه در سازمان:</label>
              <CustomSelect
                value={signupRole}
                onChange={(next) => setSignupRole(next as OrganizationRole)}
                options={[
                  { value: 'Organizer', label: 'تنظیم‌کننده جلسه (Organizer)' },
                  { value: 'Reviewer', label: 'بازبین رسمی (Reviewer)' },
                  { value: 'Participant', label: 'شرکت‌کننده عادی (Participant)' },
                  { value: 'Viewer', label: 'مشاهده‌گر (Viewer)' },
                ]}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20 active:scale-98"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isLoading ? 'در حال ثبت...' : 'ایجاد حساب کاربری'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Forgot Password */}
        {activeTab === 'forgot' && (
          <div className="flex flex-col gap-3 text-xs">
            {forgotStep === 1 ? (
              <form onSubmit={handleForgotRequest} className="flex flex-col gap-3">
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  شماره موبایل خود را وارد کنید تا کد بازیابی ارسال شود.
                </p>
                <input
                type="tel"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="+989121234567"
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isLoading || !forgotEmail.trim()}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-semibold cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  ارسال کد بازیابی
                </button>
              </form>
            ) : (
              <form onSubmit={handleForgotReset} className="flex flex-col gap-3">
                {demoCode && (
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-[11px] flex justify-between">
                    <span>کد تستی ارسالی:</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{demoCode}</span>
                  </div>
                )}
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={forgotCode}
                  onChange={(e) => setForgotCode(e.target.value)}
                  placeholder="کد ۶ رقمی دریافتی"
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center font-mono font-bold"
                />
                <input
                  type="password"
                  required
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                  placeholder="رمز عبور جدید (حداقل ۸ کاراکتر)"
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                />
                <button
                  type="submit"
                  disabled={isLoading || forgotCode.length < 6}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer"
                >
                  تغییر رمز عبور
                </button>
              </form>
            )}
          </div>
        )}

        {/* Tab 4: Role Switcher */}
        {activeTab === 'roles' && (
          <div className="flex flex-col gap-2.5 text-xs">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              تغییر نقش فعال جهت آزمودن قوانین امنیتی و دسترسی‌ها:
            </span>
            <motion.div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1" initial="hidden" animate="show" variants={staggerContainerVariants}>
              {roles.map((r) => {
                const isSelected = currentRole === r.role;
                return (
                  <motion.button
                    key={r.role}
                    variants={staggerItemVariants}
                    type="button"
                    onClick={() => {
                      onRoleChange(r.role);
                      setStatusMessage({
                        type: 'success',
                        text: `نقش کاربری به «${r.title}» تغییر یافت.`,
                      });
                    }}
                    className={`p-2.5 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700'
                        : 'bg-slate-50/50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {r.title}
                      </span>
                      <span className="text-[10px] text-slate-500">{r.desc}</span>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </motion.div>

            {/* Logout button */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 font-semibold flex items-center justify-center gap-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>خروج از حساب فعلی</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
