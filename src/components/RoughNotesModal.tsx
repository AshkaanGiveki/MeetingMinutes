import React, { useState } from 'react';
import { X, Sparkles, Wand2, FileText, ArrowLeft, Loader2 } from 'lucide-react';
import { Meeting, Participant } from '../types';

interface RoughNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMeetingCreated: (meeting: Meeting) => void;
  organizer?: Participant;
}

export const RoughNotesModal: React.FC<RoughNotesModalProps> = ({
  isOpen,
  onClose,
  onMeetingCreated,
  organizer,
}) => {
  const [roughText, setRoughText] = useState(
    `- بچه‌ها با محصول جدید موافق بودن ولی گفتن روی سرعت API کار بشه
- سارا قراره داکیومنت دیزاین رو تا شنبه آینده آماده کنه
- علی مسئول بهینه‌سازی سرورها شد
- بودجه فاز اول هم تصویب شد`
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roughText.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'convert_rough_notes',
          text: roughText,
          meetingTitle: 'جلسه هماهنگی تیم محصول',
        }),
      });

      const resData = await response.json();
      if (!response.ok || !resData?.success || !resData?.data) {
        throw new Error(resData?.error || 'AI conversion failed.');
      }
      const aiData = resData.data;

      const newMeeting: Meeting = {
        id: `meet_${Date.now()}`,
        title: aiData?.title || 'جلسه بازنگری و هماهنگی فنی سامانه',
        persianDate: '۱۵ مهر ۱۴۰۴',
        timeRange: '۱۰:۰۰ - ۱۱:۳۰',
        location: 'اتاق جلسات اصلی',
        status: 'DRAFT',
        statusLabel: 'پیش‌نویس',
        organizer: organizer || { id: 'unknown', name: 'کاربر فعلی', role: 'Participant', email: '', avatar: '' },
        participants: organizer ? [organizer] : [],
        agenda: (aiData?.agenda || ['بررسی معماری', 'تخصیص وظایف']).map((text: string, idx: number) => ({
          id: `ag_${idx + 1}`,
          order: idx + 1,
          text,
        })),
        discussion:
          aiData?.discussion ||
          'جلسه با حضور اعضا رسمیت یافت و موضوعات کلیدی بررسی و تصمیم‌گیری شد.',
        aiSuggestion: {
          summary: 'این صورت‌جلسه بر پایه تحلیل هوشمند یادداشت‌های اولیه تنظیم شده است.',
          applied: true,
        },
        decisions: (aiData?.keyDecisions || ['تصویب برنامه اجرایی']).map((text: string, idx: number) => ({
          id: `dec_${idx + 1}`,
          text,
          approved: true,
        })),
        actionItems: (aiData?.suggestedTasks || []).map((t: any, idx: number) => ({
          id: `act_${idx + 1}`,
          task: t.task || 'پیگیری موارد تعیین‌شده',
          assignee: organizer || { id: 'unknown', name: 'کاربر فعلی', role: 'Participant', email: '', avatar: '' },
          assigneeName: t.role || 'مسئول پیگیری',
          assigneeAvatar: organizer?.avatar,
          dueDate: t.deadline || '۱۰ روز آینده',
          completed: false,
        })),
        comments: [],
        signatureCount: 0,
        totalSignaturesRequired: 3,
      };

      onMeetingCreated(newMeeting);
      onClose();
    } catch (err: unknown) {
      setError('خطا در ارتباط با هوش مصنوعی. لطفاً دوباره تلاش نمایید.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-white/80 dark:border-slate-800 p-6 flex flex-col gap-4 text-right">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                تبدیل هوشمند یادداشت‌های خام به صورت‌جلسه
              </h3>
              <p className="text-[11px] text-slate-500">
                با موتور Gemini 3.8 Flash یادداشت‌های پراکنده یا متن پیاده‌شده صوت را رسمی کنید
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

        <form onSubmit={handleConvert} className="flex flex-col gap-3 text-xs">
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>متن خام یا پیش‌نویس جلسه:</span>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono">
                Gemini Flash Model
              </span>
            </label>
            <textarea
              rows={6}
              required
              value={roughText}
              onChange={(e) => setRoughText(e.target.value)}
              placeholder="نکات مطرح شده، مصوبات شفاهی یا گفتگوهای ضبط شده را اینجا وارد کنید..."
              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-purple-500 font-sans leading-relaxed resize-none"
            />
          </div>

          {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

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
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-purple-600/20 active:scale-98"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>در حال نگارش و ساختارسازی...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>تبدیل و ساخت صورت‌جلسه</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
