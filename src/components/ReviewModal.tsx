import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle, MessageSquare, ShieldCheck, ArrowRight } from 'lucide-react';
import { Meeting } from '../types';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: Meeting;
  onReviewSubmit: (action: 'approve' | 'request_changes', notes?: string, section?: string) => Promise<void>;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  meeting,
  onReviewSubmit,
}) => {
  const [activeTab, setActiveTab] = useState<'approve' | 'request_changes'>('approve');
  const [section, setSection] = useState('متن بحث و گفتگو');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onReviewSubmit(activeTab, notes, section);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-white/80 dark:border-slate-800 p-6 flex flex-col gap-4 text-right">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                فرآیند بازبینی رسمی صورت‌جلسه
              </h3>
              <p className="text-[11px] text-slate-500">
                بررسی صحت مصوبات و محتوا قبل از ورود به چرخه امضا
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

        {/* Tab selector */}
        <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('approve')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'approve'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>تأیید محتوای جلسه (آماده امضا)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('request_changes')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'request_changes'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>درخواست اصلاحات و بازنگری</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
          {activeTab === 'approve' ? (
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/60 flex flex-col gap-2">
              <span className="font-bold text-emerald-900 dark:text-emerald-200">
                آماده‌سازی سند برای مرحله امضای الکترونیک:
              </span>
              <p className="text-emerald-700 dark:text-emerald-400 text-[11px] leading-relaxed">
                با تأیید محتوای این جلسه، وضعیت آن به «آماده امضا» تغییر یافته و شرکت‌کنندگان می‌توانند
                امضای دیجیتال خود را ثبت نمایند. پس از آغاز امضا، ایجاد تغییرات ساختاری در سند محدود خواهد شد.
              </p>
              <div className="flex flex-col gap-1 mt-2">
                <label className="font-semibold text-emerald-900 dark:text-emerald-200 text-[11px]">
                  یادداشت بازبین (اختیاری):
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: کلیه بندها با توافقات مطابقت دارد."
                  className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-slate-800 dark:text-slate-100 text-xs focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/60 flex flex-col gap-3">
              <span className="font-bold text-amber-900 dark:text-amber-200">
                مشخص کردن بخش نیازمند بازنگری:
              </span>
              <div className="flex flex-col gap-1">
                <label className="text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                  بخش مورد نظر:
                </label>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-slate-800 dark:text-slate-100 text-xs focus:outline-none"
                >
                  <option value="دستور جلسه">دستور جلسه (Agenda)</option>
                  <option value="متن بحث و گفتگو">متن بحث و گفتگو (Discussion)</option>
                  <option value="تصمیمات مصوب">تصمیمات مصوب (Decisions)</option>
                  <option value="جدول وظایف و اقدامات">جدول وظایف و اقدامات (Action Items)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                  توضیحات اصلاحات مورد نیاز:
                </label>
                <textarea
                  required
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="لطفاً شرح دهید چه موردی باید قبل از آغاز امضا اصلاح گردد..."
                  className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-slate-800 dark:text-slate-100 text-xs focus:outline-none resize-none"
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
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
              disabled={isSubmitting}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-white shadow-md cursor-pointer transition-all active:scale-98 ${
                activeTab === 'approve'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
              }`}
            >
              {isSubmitting
                ? 'در حال ثبت...'
                : activeTab === 'approve'
                ? 'تأیید نهایی و آماده‌سازی امضا'
                : 'ثبت درخواست اصلاحات'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
