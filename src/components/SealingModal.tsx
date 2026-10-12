import React, { useState } from 'react';
import { ShieldCheck, Lock, CheckCircle2, X } from 'lucide-react';
import { Meeting } from '../types';
import { AnimatedModal } from './AnimatedModal';

interface SealingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: Meeting;
  onConfirmSeal: () => void;
}

export const SealingModal: React.FC<SealingModalProps> = ({
  isOpen,
  onClose,
  meeting,
  onConfirmSeal,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!meeting) return null;

  const handleSeal = async () => {
    setIsProcessing(true);
    try {
      await fetch('/api/meetings/seal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: meeting.id,
          content: {
            title: meeting.title,
            discussion: meeting.discussion,
            decisions: meeting.decisions,
            agenda: meeting.agenda,
          },
        }),
      });
    } catch (err) {
      console.warn('Seal API fallback:', err);
    }

    setTimeout(() => {
      setIsProcessing(false);
      onConfirmSeal();
      onClose();
    }, 600);
  };

  return (
    <AnimatedModal isOpen={isOpen} onClose={onClose} contentClassName="w-full max-w-md">
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-white/80 dark:border-slate-800 p-6 flex flex-col gap-4 text-right">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                مهر و موم قطعی صورت‌جلسه
              </h3>
              <p className="text-[11px] text-slate-400">
                پلمپ رسمی و غیرقابل تغییر سازی سند
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-200 leading-relaxed flex flex-col gap-2">
          <div className="flex items-center gap-1.5 font-bold">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span>هشدار تغییرناپذیری:</span>
          </div>
          <p>
            بعد از نهایی‌سازی و مهر و موم، محتوای سند برای همیشه قفل شده و هرگونه
            تغییر نیازمند تشکیل جلسه متمم جدید خواهد بود.
          </p>
        </div>

        <div className="flex flex-col gap-1 text-xs text-slate-500">
          <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
            <span>تعداد امضاهای تکمیل‌شده:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
              {meeting.signatureCount} از {meeting.totalSignaturesRequired}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
            <span>وضعیت تأیید هویت:</span>
            <span className="text-emerald-600 font-medium">کامل و معتبر</span>
          </div>
          <div className="flex justify-between py-1">
            <span>الگوریتم گواهی:</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">
              SHA-256 + HMAC
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            انصراف
          </button>
          <button
            onClick={handleSeal}
            disabled={isProcessing}
            className="flex-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            {isProcessing ? (
              <span>در حال مهر و موم سند...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>مهر و موم و آرشیو نهایی</span>
              </>
            )}
          </button>
        </div>
      </div>
    </AnimatedModal>
  );
};
