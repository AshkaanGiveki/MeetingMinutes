import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, FileCheck2, LockKeyhole, PenLine, Settings2, ShieldCheck } from 'lucide-react';
import { LayoutGroup, motion } from 'motion/react';
import { Meeting } from '../types';

export type MeetingWorkspaceStage = 'prepare' | 'write' | 'review' | 'sign';

interface MeetingWorkspaceProps {
  meeting: Meeting;
  stage: MeetingWorkspaceStage;
  onBack: () => void;
  onStatusChange?: (status: Meeting['status']) => void;
  onOpenReview?: () => void;
  onOpenSign?: () => void;
  canReview?: boolean;
  canSign?: boolean;
  children: React.ReactNode;
}

const stages: Array<{
  id: MeetingWorkspaceStage;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'prepare', label: 'آماده‌سازی', description: 'اطلاعات، افراد و دستور جلسه', icon: Settings2 },
  { id: 'write', label: 'ثبت جلسه', description: 'یادداشت‌ها، تصمیم‌ها و اقدامات', icon: PenLine },
  { id: 'review', label: 'بازبینی', description: 'کنترل نهایی و درخواست تأیید', icon: FileCheck2 },
  { id: 'sign', label: 'تأیید و نهایی‌سازی', description: 'امضاها، اعتبارسنجی و مهروموم', icon: ShieldCheck },
];

const stageIndex = (stage: MeetingWorkspaceStage) => stages.findIndex((item) => item.id === stage);

export function getMeetingWorkspaceStage(meeting: Meeting): MeetingWorkspaceStage {
  if (meeting.status === 'IN_REVIEW') return 'review';
  if (['READY_FOR_SIGNATURE', 'SIGNING', 'SEALED', 'ARCHIVED'].includes(meeting.status)) return 'sign';
  return meeting.title.trim() && meeting.participants.length > 0 && meeting.agenda.length > 0 ? 'write' : 'prepare';
}

export const MeetingWorkspace: React.FC<MeetingWorkspaceProps> = ({ meeting, stage, onBack, onStatusChange, onOpenReview, onOpenSign, canReview = true, canSign = true, children }) => {
  const activeIndex = stageIndex(stage);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const compactRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const [isCompact, setIsCompact] = useState(false);
  const [stageNotice, setStageNotice] = useState('');

  const isInReviewOrLater = ['IN_REVIEW', 'READY_FOR_SIGNATURE', 'SIGNING', 'SEALED', 'ARCHIVED'].includes(meeting.status);
  const isReadyForSignature = ['READY_FOR_SIGNATURE', 'SIGNING', 'SEALED', 'ARCHIVED'].includes(meeting.status);
  const isSealed = ['SEALED', 'ARCHIVED'].includes(meeting.status);
  const stageCompletion: Record<MeetingWorkspaceStage, boolean> = {
    prepare: Boolean(meeting.title.trim() && meeting.participants.length > 0 && meeting.agenda.length > 0),
    write: Boolean(meeting.discussion.trim()),
    review: isReadyForSignature,
    sign: isSealed,
  };
  const stageAvailability: Record<MeetingWorkspaceStage, boolean> = {
    prepare: true,
    write: true,
    review: Boolean(meeting.discussion.trim()) || isInReviewOrLater,
    sign: isReadyForSignature,
  };

  const goToStage = (nextStage: MeetingWorkspaceStage) => {
    if (!stageAvailability[nextStage]) {
      setStageNotice(nextStage === 'review'
        ? 'برای ورود به بازبینی، ابتدا متن جلسه را ثبت کنید.'
        : 'این مرحله پس از تأیید محتوای جلسه در دسترس قرار می‌گیرد.');
      return;
    }
    setStageNotice('');
    setStageNotice('مرحله جلسه فقط بر اساس وضعیت رسمی جلسه تغییر می‌کند.');
  };

  const handlePrimaryAction = () => {
    if (stage === 'prepare') {
      setStageNotice('اطلاعات پایه جلسه را تکمیل کنید تا مرحله ثبت جلسه فعال شود.');
      return;
    }
    if (stage === 'write') {
      if (!meeting.discussion.trim()) {
        setStageNotice('برای ارسال به بازبینی، ابتدا حداقل یک یادداشت از جلسه ثبت کنید.');
        return;
      }
      if (meeting.status === 'DRAFT' && onStatusChange) onStatusChange('IN_REVIEW');
      return;
    }
    if (stage === 'review') {
      if (meeting.status === 'IN_REVIEW' && onOpenReview) {
        if (!canReview) {
          setStageNotice('این بازبینی برای نقش شما قابل انجام نیست.');
          return;
        }
        onOpenReview();
        return;
      }
      return;
    }
    if (stage === 'sign' && onOpenSign && !isSealed) {
      if (!canSign) {
        setStageNotice('ثبت امضا برای نقش یا حساب کاربری شما فعال نیست.');
        return;
      }
      onOpenSign();
    }
  };

  const primaryActionLabel = stage === 'prepare'
    ? 'ادامه به ثبت جلسه'
    : stage === 'write'
    ? meeting.discussion.trim() ? 'ارسال برای بازبینی' : 'ثبت یادداشت برای ادامه'
    : stage === 'review'
    ? meeting.status === 'IN_REVIEW' ? canReview ? 'باز کردن بازبینی رسمی' : 'در انتظار بازبین مجاز' : 'ادامه به تأیید و نهایی‌سازی'
    : isSealed ? 'جلسه نهایی و مهروموم شده است' : canSign ? 'ثبت امضای من' : 'در انتظار امضای شما';

  useEffect(() => {
    const scrollContainer = workspaceRef.current?.closest<HTMLElement>('.overflow-y-auto');
    if (!scrollContainer) return;

    // The header changes its own height while it is sticky. Browser scroll
    // anchoring can interpret that resize as a user scroll and pull the
    // container back toward the top, which makes the two modes oscillate.
    const previousOverflowAnchor = scrollContainer.style.overflowAnchor;
    scrollContainer.style.overflowAnchor = 'none';

    const handleScroll = () => {
      const scrollTop = Math.max(0, scrollContainer.scrollTop);
      const previousScrollTop = lastScrollTopRef.current;
      const isMovingDown = scrollTop >= previousScrollTop;
      lastScrollTopRef.current = scrollTop;

      // Use a wide dead zone so the header's own height animation cannot
      // bounce the scroll position back across the mode boundary.
      if (!compactRef.current && isMovingDown && scrollTop >= 84) {
        compactRef.current = true;
        setIsCompact(true);
      } else if (compactRef.current && !isMovingDown && scrollTop <= 16) {
        compactRef.current = false;
        setIsCompact(false);
      }
    };
    handleScroll();
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      scrollContainer.style.overflowAnchor = previousOverflowAnchor;
    };
  }, []);

  return (
    <div ref={workspaceRef} className="meeting-workspace mx-auto flex w-full max-w-[1500px] flex-col gap-4 pb-6" dir="rtl" style={{ overflowAnchor: 'none' }}>
      <motion.header
        initial={false}
        animate={{ maxWidth: isCompact ? 896 : 1500 }}
        transition={{ type: 'spring', stiffness: 360, damping: 32, mass: 0.78 }}
        className={`meeting-workspace-header sticky top-0 z-50 mx-auto w-full overflow-hidden border dark:border-slate-800/90 ${isCompact ? 'rounded-2xl border-white/70 bg-white/55 px-3 py-2 shadow-[0_16px_36px_-18px_rgba(15,23,42,0.5),0_3px_10px_-5px_rgba(99,102,241,0.18)] ring-1 ring-slate-900/[0.06] backdrop-blur-2xl backdrop-saturate-150 dark:bg-slate-950/75 dark:shadow-[0_16px_36px_-18px_rgba(0,0,0,0.7)] dark:ring-white/[0.06]' : 'rounded-[1.75rem] border-white/80 bg-white/90 p-4 shadow-lg shadow-slate-200/40 backdrop-blur-xl dark:bg-slate-950/85 dark:shadow-black/20 sm:p-5'}`}
        style={{ overflowAnchor: 'none' }}
      >
        <motion.div
          initial={false}
          animate={{ opacity: isCompact ? 1 : 0, height: isCompact ? 'auto' : 0, y: isCompact ? 0 : -10 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.72 }}
          style={{ pointerEvents: isCompact ? 'auto' : 'none' }}
          className="overflow-hidden"
        >
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <button type="button" onClick={onBack} className="group flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="بازگشت به جلسات">
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-slate-900 dark:text-white">{meeting.title}</p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                      <span>{meeting.statusLabel}</span>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <span>مرحله {activeIndex + 1} از {stages.length}</span>
                    </div>
                  </div>
                </div>
                <div className="hidden shrink-0 items-center gap-1.5 text-[10px] text-slate-400 sm:flex">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span>ذخیره خودکار فعال است</span>
                </div>
              </div>
              <LayoutGroup id="meeting-workspace-compact-stages">
                <nav className="grid grid-cols-4 gap-1 rounded-2xl border border-slate-200/80 bg-slate-100/75 p-1.5 shadow-inner shadow-white/70 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/75 dark:shadow-black/10" aria-label="مراحل جلسه">
                  {stages.map((item, index) => {
                    const isActive = item.id === stage;
                    const isComplete = stageCompletion[item.id];
                    const isLocked = index > activeIndex;
                    const Icon = item.icon;
                    return (
                      <motion.div key={item.id} className={`group relative flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl px-1.5 text-[10px] font-bold transition-colors sm:px-2.5 ${isActive ? 'text-white' : isLocked ? 'cursor-not-allowed text-slate-300 dark:text-slate-700' : isComplete ? 'text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'}`} aria-current={isActive ? 'step' : undefined} aria-disabled={isLocked || undefined} title={isLocked ? 'این مرحله هنوز در دسترس نیست' : item.label}>
                        {isActive && <motion.span layoutId="meeting-workspace-compact-stage-background" className="absolute inset-0 rounded-xl bg-gradient-to-l from-indigo-600 via-violet-600 to-cyan-500 shadow-lg shadow-indigo-500/25 ring-1 ring-white/20 dark:shadow-indigo-950/50" transition={{ type: 'spring', stiffness: 440, damping: 30 }} />}
                        <span className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors ${isActive ? 'bg-white/20 text-white ring-1 ring-white/25' : isComplete ? 'bg-emerald-100 text-emerald-600 shadow-sm dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-white/80 text-slate-400 shadow-sm group-hover:bg-white group-hover:text-indigo-600 dark:bg-slate-800/80 dark:text-slate-500 dark:group-hover:bg-slate-800 dark:group-hover:text-indigo-300'}`}>
                          {isLocked ? <LockKeyhole className="h-3 w-3" /> : isComplete ? <Check className="h-3 w-3" strokeWidth={2.75} /> : <Icon className="h-3 w-3" />}
                        </span>
                        <span className="relative z-10 hidden min-w-0 truncate sm:inline">{item.label}</span>
                      </motion.div>
                    );
                  })}
                </nav>
              </LayoutGroup>
              {stageNotice && <p className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-[10px] font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">{stageNotice}</p>}
            </div>
        </motion.div>
        <motion.div layout animate={{ height: isCompact ? 0 : 'auto', opacity: isCompact ? 0 : 1, y: isCompact ? -12 : 0 }} transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.72 }} className="overflow-hidden">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={onBack} className="group inline-flex shrink-0 items-center gap-2 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white">
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              <span>بازگشت به جلسات</span>
            </button>
            <div className="flex min-w-0 items-center gap-2">
              <span className="hidden text-[10px] font-medium text-slate-400 sm:inline">فضای کاری جلسه</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/50 dark:text-indigo-300">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                {meeting.statusLabel}
              </span>
            </div>
          </div>

          <div className="flex min-w-0 items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">{meeting.title}</h1>
              <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{meeting.persianDate} · {meeting.timeRange} · {meeting.location}</p>
            </div>
            <div className="hidden shrink-0 items-center gap-1.5 text-[10px] text-slate-400 sm:flex">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span>ذخیره خودکار فعال است</span>
            </div>
          </div>

          <LayoutGroup id="meeting-workspace-stages">
            <nav className="grid grid-cols-4 gap-1 rounded-2xl bg-slate-100/90 p-1 dark:bg-slate-900" aria-label="مراحل جلسه">
            {stages.map((item, index) => {
              const isActive = item.id === stage;
                const isComplete = stageCompletion[item.id];
                const isLocked = index > activeIndex;
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.id}
                    className={`relative flex min-w-0 items-center gap-2 rounded-xl px-2 py-2.5 text-right sm:px-3 ${isActive ? 'text-indigo-700 dark:text-indigo-200' : isLocked ? 'text-slate-300 dark:text-slate-700' : 'text-slate-500 dark:text-slate-400'}`}
                    aria-current={isActive ? 'step' : undefined}
                    aria-disabled={isLocked || undefined}
                    title={isLocked ? 'این مرحله هنوز در دسترس نیست' : item.label}
                  >
                    {isActive && <motion.span layoutId="meeting-workspace-stage-background" className="absolute inset-0 rounded-xl bg-white shadow-sm dark:bg-slate-800" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                    <span className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${isActive ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : isComplete ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-white/70 text-slate-400 dark:bg-slate-800/70'}`}>
                      {isLocked ? <LockKeyhole className="h-3.5 w-3.5" /> : isComplete ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    </span>
                    <span className="relative z-10 min-w-0 text-right">
                      <span className="block truncate text-[11px] font-bold">{item.label}</span>
                      <span className="hidden truncate text-[9px] opacity-70 lg:block">{item.description}</span>
                    </span>
                  </motion.div>
                );
              })}
            </nav>
          </LayoutGroup>
          {stageNotice && <p className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-[11px] font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">{stageNotice}</p>}
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-indigo-100/80 bg-gradient-to-l from-indigo-50/80 via-white to-cyan-50/70 px-3 py-2.5 dark:border-indigo-900/50 dark:from-indigo-950/30 dark:via-slate-950/50 dark:to-cyan-950/20">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{stageCompletion[stage] ? 'این مرحله تکمیل شده است' : 'گام بعدی پیشنهادی'}</p>
              <p className="mt-0.5 truncate text-xs font-bold text-slate-800 dark:text-slate-100">{primaryActionLabel}</p>
            </div>
            {!isSealed && <button type="button" onClick={handlePrimaryAction} className="shrink-0 rounded-xl bg-indigo-600 px-3 py-2 text-[10px] font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-95">{primaryActionLabel}</button>}
          </div>
        </div>
        </motion.div>
      </motion.header>

      <div className="rounded-2xl border border-indigo-100/80 bg-gradient-to-l from-indigo-50/80 via-white to-cyan-50/60 px-4 py-3 dark:border-indigo-900/50 dark:from-indigo-950/35 dark:via-slate-950/60 dark:to-cyan-950/20">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-500">{stages[activeIndex]?.label}</p>
            <p className="mt-1 truncate text-xs text-slate-600 dark:text-slate-300">{stages[activeIndex]?.description}</p>
          </div>
          <span className="shrink-0 text-[10px] font-semibold text-slate-400">مرحله {activeIndex + 1} از {stages.length}</span>
        </div>
      </div>

      {children}
    </div>
  );
};
