import React, { useState } from 'react';
import {
  Share2,
  Plus,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Send,
  UserPlus
} from 'lucide-react';
import { Meeting, Participant, CommentItem } from '../types';
import { motion } from 'motion/react';
import { staggerContainerVariants, staggerItemVariants } from './stagger';

interface LeftSidebarProps {
  meeting: Meeting;
  onOpenShareModal: () => void;
  onOpenAddParticipant: () => void;
  onAddComment: (comment: CommentItem) => void;
  onStatusChange?: (status: Meeting['status']) => void;
  onOpenReviewModal?: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  meeting,
  onOpenShareModal,
  onOpenAddParticipant,
  onAddComment,
  onStatusChange,
  onOpenReviewModal,
}) => {
  const [collapsed, setCollapsed] = useState(false);
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

  if (collapsed) {
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
  }

  return (
    <aside className="w-72 shrink-0 flex flex-col gap-4 select-none">
      {/* 1. Top Card: In Progress / Share / Participants */}
      <div className="rounded-3xl p-5 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-white/90 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col gap-4">
        {/* Top header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>در حال انجام</span>
          </div>

          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="بستن پنل"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Avatar Stack with +2 */}
        <motion.div className="flex items-center justify-center -space-x-2.5 space-x-reverse py-1" initial="hidden" animate="show" variants={staggerContainerVariants}>
          {meeting.participants.slice(0, 4).map((p) => (
            <motion.img
              key={p.id}
              variants={staggerItemVariants}
              src={p.avatar}
              alt={p.name}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-slate-900 shadow-sm"
              title={`${p.name} (${p.role})`}
            />
          ))}
          <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-sm">
            +۲
          </div>
        </motion.div>

        {/* Share Button (Vibrant purple gradient matching screenshot) */}
        <button
          onClick={onOpenShareModal}
          className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-purple-500 via-indigo-600 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-medium text-xs shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 active:scale-98"
        >
          <Share2 className="w-4 h-4" />
          <span>اشتراک‌گذاری</span>
        </button>

        {/* Participants Header */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
            <UserPlus className="w-4 h-4 text-slate-500" />
            <span>شرکت‌کنندگان</span>
          </div>
          <button
            onClick={onOpenAddParticipant}
            className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 flex items-center justify-center cursor-pointer transition-colors"
            title="افزودن شرکت‌کننده"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Participants list */}
        <motion.div className="flex flex-col gap-2.5 max-h-56 overflow-y-auto pr-0.5" initial="hidden" animate="show" variants={staggerContainerVariants}>
          {meeting.participants.map((p) => (
            <motion.div
              key={p.id}
              variants={staggerItemVariants}
              className="flex items-center justify-between p-1 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                {p.avatar ? (
                  <img
                    src={p.avatar}
                    alt={p.name}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-semibold flex items-center justify-center border border-slate-200 dark:border-slate-700">
                    {p.initials || 'م‌ک'}
                  </div>
                )}
                <div className="flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {p.name}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {p.role}
                  </span>
                </div>
              </div>

              {p.hasSigned ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500" title="امضا کرده" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber-400/80" title="در انتظار امضا" />
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* 2. Middle Card: Meeting Status Stepper */}
      <div className="rounded-3xl p-5 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-white/90 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col gap-3">
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
              <motion.button
                key={step.id}
                variants={staggerItemVariants}
                onClick={() => onStatusChange?.(step.id)}
                className="relative z-10 flex flex-col items-center cursor-pointer group focus:outline-none"
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
              </motion.button>
            );
          })}
        </motion.div>

        {/* Labels below */}
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

        {meeting.status === 'IN_REVIEW' && onOpenReviewModal && (
          <button
            onClick={onOpenReviewModal}
            className="mt-2 py-2 px-3 rounded-2xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
          >
            <span>بازبینی رسمی و تأیید محتوا</span>
          </button>
        )}
      </div>

      {/* 3. Bottom Card: Notes & Comments */}
      <div className="rounded-3xl p-5 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-white/90 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col gap-3">
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
          {meeting.comments.map((comment) => (
            <motion.div
              key={comment.id}
              variants={staggerItemVariants}
              className="flex items-start gap-2.5 text-xs p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
            >
              <img
                src={comment.author.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80'}
                alt={comment.author.name}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
              />
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                    {comment.author.name}
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
