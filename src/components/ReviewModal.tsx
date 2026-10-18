import React, { useState } from 'react';
import { X, Check, CheckCircle, AlertTriangle, ClipboardList, Pencil, Plus, Send, ShieldCheck, Trash2 } from 'lucide-react';
import { Meeting } from '../types';
import { CustomSelect } from './CustomSelect';
import { AnimatedModal } from './AnimatedModal';

const correctionSectionOptions = [
  { value: 'دستور جلسه', label: 'دستور جلسه (Agenda)' },
  { value: 'متن بحث و گفتگو', label: 'متن بحث و گفتگو (Discussion)' },
  { value: 'تصمیمات مصوب', label: 'تصمیمات مصوب (Decisions)' },
  { value: 'جدول وظایف و اقدامات', label: 'جدول وظایف و اقدامات (Action Items)' },
];

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: Meeting;
  onReviewSubmit: (action: 'approve' | 'request_changes' | 'send_back' | 'update_change' | 'remove_change', notes?: string, section?: string, commentId?: string) => Promise<void>;
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
  const [editingPointId, setEditingPointId] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState('');
  const [editingNotes, setEditingNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onReviewSubmit(activeTab, notes, section);
      if (activeTab === 'request_changes') {
        setNotes('');
      } else {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendBack = async () => {
    setIsSubmitting(true);
    try {
      await onReviewSubmit('send_back', notes, section);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const correctionPoints = (meeting?.comments || []).filter((comment) => comment.text.startsWith('[درخواست اصلاح در '));
  const unresolvedCorrectionPoints = correctionPoints.filter((point) => point.resolved !== true);
  const startEditingPoint = (point: Meeting['comments'][number]) => {
    const match = point.text.match(/^\[درخواست اصلاح در (.*)\]:\s*([\s\S]*)$/);
    setEditingPointId(point.id);
    setEditingSection(match?.[1] || section);
    setEditingNotes(match?.[2] || point.text);
  };
  const saveEditedPoint = async () => {
    if (!editingPointId || !editingNotes.trim()) return;
    setIsSubmitting(true);
    try {
      await onReviewSubmit('update_change', editingNotes.trim(), editingSection, editingPointId);
      setEditingPointId(null);
    } finally {
      setIsSubmitting(false);
    }
  };
  const removePoint = async (commentId: string) => {
    setIsSubmitting(true);
    try {
      await onReviewSubmit('remove_change', undefined, undefined, commentId);
      if (editingPointId === commentId) setEditingPointId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatedModal isOpen={isOpen} onClose={onClose} contentClassName="w-full max-w-lg">
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
          {activeTab === 'request_changes' && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                  <ClipboardList className="h-4 w-4" />
                  <span>فهرست اصلاحات</span>
                </div>
                <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700 dark:bg-amber-900/50 dark:text-amber-200">{unresolvedCorrectionPoints.length} مورد حل‌نشده از {correctionPoints.length}</span>
              </div>
              {correctionPoints.length > 0 ? (
                <div className="max-h-36 space-y-2 overflow-y-auto pl-1">
                  {correctionPoints.map((point, index) => {
                    const [sectionLabel, ...detailParts] = point.text.replace(/^\[درخواست اصلاح در /, '').replace(/\]?:\s*/, '|').split('|');
                    return (
                      <div key={point.id} className="relative rounded-xl border border-amber-100 bg-white/80 p-2.5 dark:border-amber-900/50 dark:bg-slate-900/60">
                        <div className="flex flex-wrap items-start gap-2">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-amber-100 text-[10px] font-black text-amber-700 dark:bg-amber-900/60 dark:text-amber-200">{index + 1}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold text-amber-800 dark:text-amber-200">{sectionLabel}</p>
                                  <p className="mt-1 whitespace-pre-wrap text-[11px] leading-5 text-slate-600 dark:text-slate-300">{detailParts.join('|')}</p>
                                  {point.resolved === true && <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200"><Check className="h-3 w-3" />حل‌شده</span>}
                          </div>
                          {editingPointId === point.id ? (
                            <div className="basis-full space-y-2 border-t border-amber-100 pt-2 dark:border-amber-900/50">
                              <CustomSelect value={editingSection} onChange={setEditingSection} className="w-full" options={correctionSectionOptions} />
                              <textarea value={editingNotes} onChange={(event) => setEditingNotes(event.target.value)} rows={2} className="w-full resize-none rounded-lg border border-amber-200 bg-white px-2.5 py-2 text-[11px] text-slate-700 outline-none focus:border-indigo-400 dark:border-amber-800 dark:bg-slate-900 dark:text-slate-200" aria-label="توضیحات اصلاحی" />
                              <div className="flex gap-2">
                                <button type="button" disabled={isSubmitting || !editingNotes.trim()} onClick={() => void saveEditedPoint()} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-indigo-600 py-1.5 text-[10px] font-bold text-white disabled:opacity-50"><Check className="h-3 w-3" />ذخیره</button>
                                <button type="button" disabled={isSubmitting} onClick={() => setEditingPointId(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold text-slate-500 dark:border-slate-700 dark:text-slate-300">لغو</button>
                              </div>
                            </div>
                          ) : (
                            <div className="absolute left-2.5 top-2.5 flex shrink-0 items-start gap-1">
                              <button type="button" disabled={isSubmitting} onClick={() => startEditingPoint(point)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/40" title="ویرایش نکته"><Pencil className="h-3.5 w-3.5" /></button>
                              <button type="button" disabled={isSubmitting} onClick={() => void removePoint(point.id)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40" title="حذف نکته"><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-amber-200 px-3 py-3 text-center text-[11px] text-amber-700/80 dark:border-amber-800 dark:text-amber-300/80">هنوز نکته‌ای به فهرست اصلاحات اضافه نشده است.</p>
              )}
            </div>
          )}

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
                <CustomSelect
                  value={section}
                  onChange={setSection}
                  className="w-full"
                  options={[
                    { value: 'دستور جلسه', label: 'دستور جلسه (Agenda)' },
                    { value: 'متن بحث و گفتگو', label: 'متن بحث و گفتگو (Discussion)' },
                    { value: 'تصمیمات مصوب', label: 'تصمیمات مصوب (Decisions)' },
                    { value: 'جدول وظایف و اقدامات', label: 'جدول وظایف و اقدامات (Action Items)' },
                  ]}
                />
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
              type="submit"
              disabled={isSubmitting}
              className={`flex w-full items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-white shadow-md cursor-pointer transition-all active:scale-98 ${
                activeTab === 'approve'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
              }`}
            >
              {isSubmitting
                ? 'در حال ثبت...'
                : activeTab === 'approve'
                ? 'تأیید نهایی و آماده‌سازی امضا'
                : <><Plus className="h-3.5 w-3.5" />افزودن به فهرست اصلاحات</>}
            </button>
          </div>
        </form>
        {activeTab === 'request_changes' && (
          <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/25">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm"><Send className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-indigo-900 dark:text-indigo-200">آماده ارسال برای ویرایشگر؟</p>
                  <p className="mt-1 text-[11px] leading-5 text-indigo-700 dark:text-indigo-300">پس از بررسی همه موارد، فهرست اصلاحات را برای اصلاح صورت‌جلسه ارسال کنید.</p>
                  <button type="button" disabled={isSubmitting || unresolvedCorrectionPoints.length === 0} onClick={() => void handleSendBack()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-45"><Send className="h-3.5 w-3.5" />{unresolvedCorrectionPoints.length === 0 ? 'همه نکات حل شده‌اند' : 'ارسال فهرست به ویرایشگر'}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AnimatedModal>
  );
};
