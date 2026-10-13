import React, { useState } from 'react';
import {
  Share2,
  Plus,
  ChevronRight,
  MessageSquare,
  Send,
  UserPlus,
  PenTool,
  ShieldCheck,
  LockKeyhole
} from 'lucide-react';
import { Meeting, Participant, CommentItem } from '../types';
import { motion } from 'motion/react';
import { staggerContainerVariants, staggerItemVariants } from './stagger';
import { EmptyState } from './EmptyState';
import { UserAvatar } from './UserAvatar';
import { MeetingRoleIcon } from './MeetingRoleIcon';

interface LeftSidebarProps {
  meeting: Meeting;
  onOpenShareModal: () => void;
  onOpenAddParticipant: () => void;
  onAddComment: (comment: CommentItem) => void;
  onStatusChange?: (status: Meeting['status']) => void;
  onOpenReviewModal?: () => void;
  onOpenSignModal?: () => void;
  onOpenSealModal?: () => void;
  hasUserSigned?: boolean;
  onRejectSigning?: () => void;
  onOpenSigningDecision?: () => void;
  canManageMeeting?: boolean;
  canEditMeeting?: boolean;
  canReviewMeeting?: boolean;
  canSignMeeting?: boolean;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  meeting,
  onOpenShareModal,
  onOpenAddParticipant,
  onAddComment,
  onStatusChange,
  onOpenReviewModal,
  onOpenSignModal,
  onOpenSealModal,
  hasUserSigned = false,
  onRejectSigning,
  onOpenSigningDecision,
  canManageMeeting = false,
  canEditMeeting = false,
  canReviewMeeting = false,
  canSignMeeting = false,
}) => {
  const [newCommentText, setNewCommentText] = useState('');

  const handleSendComment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCommentText.trim()) return;

    const newComment: CommentItem = {
      id: `com_${Date.now()}`,
      author: meeting.organizer,
      text: newCommentText.trim(),
      timestamp: new Intl.DateTimeFormat('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date()),
    };

    onAddComment(newComment);
    setNewCommentText('');
  };

  const statusSteps: Array<{
    id: Meeting['status'];
    label: string;
    stepIndex: number;
  }> = [
    { id: 'DRAFT', label: 'پیش‌نویس', stepIndex: 0 },
    { id: 'IN_REVIEW', label: 'در حال بررسی', stepIndex: 1 },
    { id: 'READY_FOR_SIGNATURE', label: 'آماده امضا', stepIndex: 2 },
    { id: 'SEALED', label: 'امضا شده', stepIndex: 3 },
  ];

  const currentStepIndex =
    meeting.status === 'DRAFT'
      ? 0
      : meeting.status === 'IN_REVIEW'
      ? 1
      : meeting.status === 'READY_FOR_SIGNATURE' || meeting.status === 'SIGNING'
      ? 2
      : 3;

  /* The context rail stays open; collapsing it hides signing and participant actions. */
  /*
    return (
      <aside className="w-14 shrink-0 flex flex-col items-center py-4 gap-4 z-10">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 shadow-sm cursor-pointer"
          title="باز کردن پنل کناری"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </aside>
    );
  */

  const isSigningStage = meeting.status === 'READY_FOR_SIGNATURE' || meeting.status === 'SIGNING';
  const isSealed = meeting.status === 'SEALED';
  const hasRole = (participant: Participant, role: string) => (participant.roles || [participant.role]).includes(role as any);
  const participantRoles = (participant: Participant) => Array.from(new Set([...(participant.roles || []), participant.role])).map((role) => role === 'Participant' ? 'Viewer' : role);
  const totalSignatures = meeting.totalSignaturesRequired || meeting.participants.filter((participant) => hasRole(participant, 'Signer')).length || 0;
  const signedParticipantIds = new Set((meeting.signatures || []).map((signature) => signature.signerId));
  const hasSignatureRecords = Array.isArray(meeting.signatures);
  const signedCount = hasSignatureRecords
    ? signedParticipantIds.size
    : (meeting.signatureCount || meeting.participants.filter((participant) => participant.hasSigned).length);
  const allSignaturesCollected = totalSignatures > 0 && signedCount >= totalSignatures;
  const participants = meeting.participants.filter(Boolean);
  const visibleParticipants = participants.slice(0, 4);
  const remainingParticipants = Math.max(0, participants.length - visibleParticipants.length);
  const roleLabels: Record<string, string> = { Editor: 'ویرایشگر', Reviewer: 'بازبین', Signer: 'امضاکننده' };
  const missingRequiredRoles = (['Editor', 'Reviewer', 'Signer'] as const).filter((role) => !participants.some((participant) => hasRole(participant, role)));

  return (
    <aside className="w-full shrink-0 flex flex-col gap-4 select-none">
      <div className="flex items-center justify-between px-1">
        <div>
          <p className="text-[10px] font-semibold tracking-wide text-slate-400 dark:text-slate-500">پنل جلسه</p>
          <h2 className="text-sm font-black text-slate-900 dark:text-white">وضعیت و همکاری</h2>
        </div>
        <span className="rounded-full border border-indigo-200/70 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 dark:border-indigo-800/70 dark:bg-indigo-950/40 dark:text-indigo-300">
          {isSealed ? 'نهایی شده' : isSigningStage ? 'در انتظار امضا' : 'در جریان'}
        </span>
      </div>
      {meeting.signatureRejection?.status === 'pending' && onOpenSigningDecision && canManageMeeting && (
        <div className="rounded-[1.35rem] border border-rose-200 bg-rose-50/80 p-4 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/25">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300">!</div>
            <div className="min-w-0 flex-1" dir="rtl">
              <p className="text-xs font-black text-rose-900 dark:text-rose-100">درخواست اصلاح امضا</p>
              <p className="mt-1 text-[11px] leading-5 text-rose-700 dark:text-rose-300">{meeting.signatureRejection.signerName} پیش از امضا این صورت‌جلسه را نپذیرفته است.</p>
              <p className="mt-2 line-clamp-3 rounded-lg bg-white/60 p-2 text-[10px] leading-5 text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{meeting.signatureRejection.reason}</p>
              <button type="button" onClick={onOpenSigningDecision} className="mt-3 w-full rounded-xl bg-rose-600 px-3 py-2 text-[11px] font-black text-white transition hover:bg-rose-700">بررسی درخواست</button>
            </div>
          </div>
        </div>
      )}
      {/* 1. Top Card: In Progress / Share / Participants */}
      <div className="rounded-[1.5rem] p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/80 shadow-lg shadow-slate-200/30 dark:shadow-black/10 flex flex-col gap-4">
        {/* Top header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>در حال انجام</span>
          </div>

          <button
            aria-hidden="true"
            className="hidden"
            title="بستن پنل"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Avatar Stack with +2 */}
        <motion.div className="flex items-center justify-center -space-x-2.5 space-x-reverse py-1 [&>div:last-child]:hidden" initial="hidden" animate="show" variants={staggerContainerVariants}>
          {visibleParticipants.map((p, index) => (
            <motion.span
              key={p.id || `participant-${index}`}
              variants={staggerItemVariants}
            ><UserAvatar name={p.name} avatar={p.avatar} className="h-10 w-10 text-xs ring-2 ring-white shadow-sm dark:ring-slate-900" imageClassName="h-10 w-10 rounded-full object-cover ring-2 ring-white shadow-sm dark:ring-slate-900" /></motion.span>
          ))}
          <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-sm">
            +۲
          </div>
        </motion.div>

        {remainingParticipants > 0 && <div className="-mt-2 text-center text-[10px] font-semibold text-slate-400 dark:text-slate-500">+{remainingParticipants} نفر دیگر</div>}

        {/* Share Button (Vibrant purple gradient matching screenshot) */}
        {canManageMeeting && <button
          onClick={onOpenShareModal}
          className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-purple-500 via-indigo-600 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-medium text-xs shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 active:scale-98"
        >
          <Share2 className="w-4 h-4" />
          <span>اشتراک‌گذاری</span>
        </button>}

        {/* Participants Header */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
            <UserPlus className="w-4 h-4 text-slate-500" />
            <span>شرکت‌کنندگان</span>
          </div>
          {canManageMeeting && <button
            onClick={onOpenAddParticipant}
            className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 flex items-center justify-center cursor-pointer transition-colors"
            title="افزودن شرکت‌کننده"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>}
        </div>

        {/* Participants list */}
        <motion.div className="flex flex-col gap-2.5 max-h-56 overflow-y-auto pr-0.5" initial="hidden" animate="show" variants={staggerContainerVariants}>
          {meeting.participants.filter(Boolean).map((p, index) => (
            <motion.div
              key={p.id || `participant-${index}`}
              variants={staggerItemVariants}
              className="flex items-center justify-between p-1 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <UserAvatar name={p.name} avatar={p.avatar} className="h-8 w-8 border border-slate-200 text-[10px] dark:border-slate-700" imageClassName="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700" />
                <div className="flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {p.name}
                  </span>
                  <span className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400" aria-label="نقش‌های عضو">
                    {participantRoles(p).map((role) => <span key={role} title={role} className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800"><MeetingRoleIcon role={role} className="h-3 w-3" /></span>)}
                  </span>
                </div>
              </div>

              {(hasSignatureRecords ? signedParticipantIds.has(p.id) : Boolean(p.hasSigned)) ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500" title="امضا کرده" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber-400/80" title="در انتظار امضا" />
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* 2. Middle Card: Meeting Status Stepper */}
      <div className="rounded-[1.5rem] p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/80 shadow-lg shadow-slate-200/30 dark:shadow-black/10 flex flex-col gap-3">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
          وضعیت جلسه
        </h4>

        {/* Timeline dots line */}
        <motion.div className="relative flex items-center justify-between pt-2 pb-1 px-1" initial="hidden" animate="show" variants={staggerContainerVariants}>
          {/* Background horizontal line */}
          <div className="absolute top-[15px] left-3 right-3 h-[2px] bg-slate-200 dark:bg-slate-700 -z-0" />

          {/* Active completed line */}
          <div
            className="absolute top-[15px] right-3 h-[2px] bg-indigo-600 transition-all duration-500 -z-0"
            style={{
              width: `${(currentStepIndex / (statusSteps.length - 1)) * 88}%`,
            }}
          />

          {statusSteps.map((step) => {
            const isCompleted = step.stepIndex < currentStepIndex;
            const isCurrent = step.stepIndex === currentStepIndex;

            return (
              <motion.div
                key={step.id}
                variants={staggerItemVariants}
                className="relative z-10 flex flex-col items-center"
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-300 flex items-center justify-center ${
                    isCurrent
                      ? 'bg-indigo-600 ring-4 ring-indigo-200 dark:ring-indigo-900/60 scale-125'
                      : isCompleted
                      ? 'bg-indigo-600'
                      : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                />
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div className="flex items-center justify-between text-[10px] text-slate-400 px-0.5" initial="hidden" animate="show" variants={staggerContainerVariants}>
          {statusSteps.map((step) => {
            const isCurrent = step.stepIndex === currentStepIndex;
            return (
              <motion.span
                key={step.id}
                variants={staggerItemVariants}
                className={`transition-colors text-center ${
                  isCurrent
                    ? 'font-bold text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {step.label}
              </motion.span>
            );
          })}
        </motion.div>

        {meeting.status === 'DRAFT' && onStatusChange && canEditMeeting && (
          <button
            type="button"
            onClick={() => onStatusChange('IN_REVIEW')}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-3 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition-colors hover:bg-indigo-700"
          >
            <Send className="h-3.5 w-3.5" />
            <span>ارسال برای بررسی</span>
          </button>
        )}

        {missingRequiredRoles.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-[10px] leading-5 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-300">
            نقش‌های ضروری باقی‌مانده: {missingRequiredRoles.map((role) => roleLabels[role]).join('، ')}. پیش از ارسال برای بازبینی، آن‌ها را تعیین کنید.
          </div>
        )}

        {meeting.status === 'IN_REVIEW' && onOpenReviewModal && canReviewMeeting && (
          <button
            onClick={onOpenReviewModal}
            className="mt-2 py-2 px-3 rounded-2xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
          >
            <span>بازبینی رسمی و تأیید محتوا</span>
          </button>
        )}

        <div className="mt-1 border-t border-slate-200/70 pt-3 dark:border-slate-800/80">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100">
              <PenTool className="h-3.5 w-3.5 text-indigo-500" />
              <span>امضاهای سند</span>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {signedCount}/{totalSignatures || '—'}
            </span>
          </div>

          {isSigningStage && !hasUserSigned && onOpenSignModal && canSignMeeting && (
            <button
              type="button"
              onClick={onOpenSignModal}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-2.5 text-xs font-black text-white shadow-md shadow-indigo-600/20 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-600/30"
            >
              <PenTool className="h-3.5 w-3.5" />
              <span>امضای من</span>
            </button>
          )}

          {isSigningStage && !hasUserSigned && onRejectSigning && canSignMeeting && (
            <button
              type="button"
              onClick={onRejectSigning}
              className="mt-2 w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50"
            >
              عدم موافقت و ارسال دلیل
            </button>
          )}

          {hasUserSigned && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
              <span>امضای شما ثبت شده است</span>
            </div>
          )}

          {false && allSignaturesCollected && !isSealed && onOpenSealModal && (
            <button
              type="button"
              onClick={onOpenSealModal}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-black text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/50"
            >
              <LockKeyhole className="h-3.5 w-3.5" />
              <span>مهر و موم نهایی</span>
            </button>
          )}

          {!isSigningStage && !isSealed && (
            <p className="text-[10px] leading-5 text-slate-400 dark:text-slate-500">پس از تأیید بازبینی، امضای سند فعال می‌شود.</p>
          )}

          {isSealed && (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
              <LockKeyhole className="h-4 w-4" />
              <span>این سند نهایی و غیرقابل تغییر است</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Bottom Card: Notes & Comments */}
      <div className="rounded-[1.5rem] p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/80 shadow-lg shadow-slate-200/30 dark:shadow-black/10 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
            <MessageSquare className="w-4 h-4 text-slate-500" />
            <span>یادداشت‌ها</span>
          </div>
          <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center">
            {meeting.comments.length}
          </span>
        </div>

        {/* Comments list */}
        <motion.div className="flex flex-col gap-3 max-h-48 overflow-y-auto pr-0.5" initial="hidden" animate="show" variants={staggerContainerVariants}>
          {meeting.comments.length === 0 ? <EmptyState compact icon={MessageSquare} title="هنوز یادداشتی ثبت نشده است" description="اولین نظر یا یادداشت خود را برای این جلسه اضافه کنید." /> : meeting.comments.map((comment) => (
            <motion.div
              key={comment.id}
              layout
              exit={{ opacity: 0, x: 18, transition: { duration: 0.2 } }}
              variants={staggerItemVariants}
              className="flex items-start gap-2.5 text-xs p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
            >
              <UserAvatar name={comment.author?.name || 'کاربر'} avatar={comment.author?.avatar} className="mt-0.5 h-7 w-7 shrink-0 text-[9px]" imageClassName="mt-0.5 h-7 w-7 shrink-0 rounded-full object-cover" />
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                    {comment.author?.name || 'کاربر'}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">
                    {comment.timestamp}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {comment.text}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Add comment input */}
        <form onSubmit={handleSendComment} className="relative mt-1">
          <input
            type="text"
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="افزودن نظر..."
            className="w-full h-9 pr-3 pl-9 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-transparent focus:border-indigo-400 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none transition-all"
          />
          <button
            type="submit"
            disabled={!newCommentText.trim()}
            className="absolute left-1 top-1 w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 rotate-180" />
          </button>
        </form>
      </div>
    </aside>
  );
};
