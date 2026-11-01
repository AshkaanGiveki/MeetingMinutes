import React from 'react';
import { Building2, LogOut, UserCircle, ShieldAlert } from 'lucide-react';

interface SessionUser { organizationId?: string; role?: string; }

export const OrganizationOnboarding: React.FC<{
  name: string;
  onOrganizationReady: (user: SessionUser) => void;
  onProfile: () => void;
  onSignOut: () => void;
  isSuperAdmin?: boolean;
  onRecoveryReview?: () => void;
}> = ({ name, onProfile, onSignOut, isSuperAdmin, onRecoveryReview }) => (
  <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[#f4f7fb] px-4 py-8 text-slate-900 dark:bg-[#080d1d] dark:text-white">
    <section className="w-full max-w-xl rounded-[2rem] border border-slate-200/80 bg-white/95 p-8 text-center shadow-2xl dark:border-slate-700/80 dark:bg-slate-900/95">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300"><ShieldAlert className="h-8 w-8" /></div>
      <p className="mt-5 text-sm font-bold text-indigo-600 dark:text-indigo-300">{name || 'کاربر'}</p>
      <h1 className="mt-2 text-2xl font-black">دسترسی فعالی ندارید</h1>
      <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-slate-500 dark:text-slate-400">You do not currently have access to an organization or project. Your workspace will appear here when an administrator grants you access.</p>
      <div className="mt-7 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-right text-xs leading-6 text-indigo-800 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-200"><Building2 className="mb-2 h-5 w-5" />ساخت سازمان از طریق ثبت‌نام عمومی امکان‌پذیر نیست. برای دریافت دسترسی، از مدیر سازمان یا مدیر سامانه دعوت بخواهید.</div>
      <div className="mt-7 flex flex-wrap gap-3 border-t border-slate-100 pt-6 dark:border-slate-800"><button type="button" onClick={onProfile} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300"><UserCircle className="h-4 w-4" />پروفایل</button>{isSuperAdmin && <button type="button" onClick={onRecoveryReview} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-amber-200 px-3 py-3 text-xs font-bold text-amber-700 dark:border-amber-900/60 dark:text-amber-300">بررسی بازیابی</button>}<button type="button" onClick={onSignOut} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 px-3 py-3 text-xs font-bold text-rose-600 dark:border-rose-900/60 dark:text-rose-300"><LogOut className="h-4 w-4" />خروج</button></div>
    </section>
  </main>
);
