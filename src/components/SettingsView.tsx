import React, { useState } from 'react';
import {
  Settings,
  User,
  Shield,
  Bell,
  Smartphone,
  Save,
  PenTool,
  CheckCircle2
} from 'lucide-react';
import { currentUser } from '../data/mockData';

export const SettingsView: React.FC = () => {
  const [name, setName] = useState(currentUser.name);
  const [role, setRole] = useState(currentUser.role);
  const [emailNotification, setEmailNotification] = useState(true);
  const [telegramNotification, setTelegramNotification] = useState(true);
  const [autoSeal, setAutoSeal] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="flex-1 max-w-4xl mx-auto flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            تنظیمات حساب کاربری و امضای دیجیتال
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            شخصی‌سازی پروفایل، تنظیمات گواهی امضای الکترونیکی و سیاست‌های امنیتی
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Profile Card */}
        <div className="p-6 rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/80 dark:border-slate-800 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <User className="w-4 h-4 text-indigo-500" />
            <span>مشخصات فردی و سازمانی</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                نام و نام‌خانوادگی:
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                عنوان شغلی:
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Digital Signature Profile */}
        <div className="p-6 rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/80 dark:border-slate-800 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <PenTool className="w-4 h-4 text-indigo-500" />
            <span>پروفایل امضای دیجیتال شما</span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            امضای ذخیره‌شده شما در زمان تأیید صورت‌جلسات مورد استفاده قرار می‌گیرد و با
            کلید خصوصی SHA-256 کدگذاری می‌شود.
          </p>

          <div className="w-full h-28 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center">
            <svg
              className="w-48 h-16 text-indigo-700 dark:text-indigo-400"
              viewBox="0 0 240 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 70 C 40 20, 60 85, 80 40 C 95 10, 110 60, 125 50 C 140 40, 150 70, 170 30 C 185 10, 190 65, 220 50 M 80 65 Q 120 75 160 60" />
            </svg>
          </div>
        </div>

        {/* Telegram Integration */}
        <div className="p-6 rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/80 dark:border-slate-800 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Smartphone className="w-4 h-4 text-sky-500" />
            <span>اتصال به تلگرام و ربات هوشمند</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900 text-xs">
            <div className="flex flex-col">
              <span className="font-bold text-sky-950 dark:text-sky-200">
                شناسه متصل: @arash_fathi
              </span>
              <span className="text-[11px] text-sky-700 dark:text-sky-400">
                دریافت اعلانات جلسات و امضا از طریق تلگرام فعال است.
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white font-semibold text-[10px]">
              متصل شد
            </span>
          </div>
        </div>

        {/* Notification & Organization Policies */}
        <div className="p-6 rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/80 dark:border-slate-800 shadow-sm flex flex-col gap-4 text-xs">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Bell className="w-4 h-4 text-indigo-500" />
            <span>تنظیمات اعلانات و سیاست‌های سازمان</span>
          </div>

          <div className="flex flex-col gap-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                ارسال ایمیل اطلاع‌رسانی هنگام ثبت امضا و مهر و موم سند
              </span>
              <input
                type="checkbox"
                checked={emailNotification}
                onChange={(e) => setEmailNotification(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                مهر و موم خودکار سند بلافاصله پس از تکمیل تمام امضاها
              </span>
              <input
                type="checkbox"
                checked={autoSeal}
                onChange={(e) => setAutoSeal(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          {savedSuccess && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>تنظیمات با موفقیت ذخیره شد</span>
            </span>
          )}
          <button
            type="submit"
            className="py-2.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer transition-all active:scale-98"
          >
            <Save className="w-4 h-4" />
            <span>ذخیره تغییرات</span>
          </button>
        </div>
      </form>
    </div>
  );
};
