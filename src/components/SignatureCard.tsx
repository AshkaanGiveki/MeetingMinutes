import React from 'react';
import { motion } from 'motion/react';
import { staggerContainerVariants, staggerItemVariants } from './stagger';
import { PenTool, CheckCircle2, ShieldCheck, Lock } from 'lucide-react';
import { Meeting } from '../types';
import { UserAvatar } from './UserAvatar';

interface SignatureCardProps {
  meeting: Meeting;
  onOpenSignModal: () => void;
  onOpenSealModal: () => void;
  hasUserSigned: boolean;
}

export const SignatureCard: React.FC<SignatureCardProps> = ({
  meeting,
  onOpenSignModal,
  onOpenSealModal,
  hasUserSigned,
}) => {
  const isSealed = meeting.status === 'SEALED' || meeting.status === 'ARCHIVED';
  const allSigned = meeting.signatureCount >= meeting.totalSignaturesRequired;

  return (
    <aside className="w-72 shrink-0 flex flex-col gap-4">
      {/* Floating Signature Glass Box */}
      <div className="relative overflow-hidden rounded-3xl p-5 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-white/90 dark:border-slate-800 shadow-xl shadow-indigo-500/5 flex flex-col items-center text-center transition-all duration-300 hover:shadow-indigo-500/10">
        {/* Soft abstract luminous wave backdrop */}
        <div className="w-full h-36 relative rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-50/80 via-purple-50/50 to-pink-50/40 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900/40 border border-indigo-100/60 dark:border-indigo-900/40 flex items-center justify-center mb-4">
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:12px_12px]" />

          {/* Flowing decorative gradient ribbons */}
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-xl" />
          <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-gradient-to-tr from-pink-400/20 to-indigo-400/20 rounded-full blur-xl" />

          {/* Handwritten cursive electronic signature representation */}
          <svg
            className="w-44 h-20 text-indigo-700/80 dark:text-indigo-400/90 drop-shadow-sm select-none"
            viewBox="0 0 240 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path
              d="M20 70 C 40 20, 60 85, 80 40 C 95 10, 110 60, 125 50 C 140 40, 150 70, 170 30 C 185 10, 190 65, 220 50 M 80 65 Q 120 75 160 60"
              className="animate-[dash_3s_ease-in-out_infinite]"
              style={{ strokeDasharray: 300, strokeDashoffset: 0 }}
            />
          </svg>

          {hasUserSigned && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-500/90 text-white text-[10px] font-medium px-2 py-0.5 rounded-full shadow-xs backdrop-blur-xs">
              <CheckCircle2 className="w-3 h-3" />
              <span>تأیید هویت شده</span>
            </div>
          )}
        </div>

        {/* Title & subtitle */}
        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1">
          {hasUserSigned ? 'امضای شما ثبت شد' : 'امضای شما'}
        </h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4 leading-relaxed max-w-[210px]">
          {isSealed
            ? 'این صورت‌جلسه مهر و موم شده و دارای اعتبار حقوقی و امضای دیجیتال است.'
            : hasUserSigned
            ? 'امضای الکترونیکی شما با کلید هش اختصاصی ثبت گردید.'
            : 'لطفاً قبل از امضا، محتوای جلسه را بررسی کنید.'}
        </p>

        {/* CTA Button */}
        {isSealed ? (
          <div className="w-full py-3 px-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold text-xs flex items-center justify-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>سند مهر و موم شده</span>
          </div>
        ) : hasUserSigned ? (
          <div className="w-full flex flex-col gap-2">
            <div className="w-full py-2.5 px-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-medium text-xs flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>امضای شما تأیید شد</span>
            </div>

            {allSigned && (
              <button
                onClick={onOpenSealModal}
                className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>مهر و موم نهایی سند</span>
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenSignModal}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-500 via-indigo-600 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-medium text-xs shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all duration-200"
          >
            <PenTool className="w-4 h-4" />
            <span>امضا کردن</span>
          </button>
        )}

        {/* Footer: Signer Progress */}
        <div className="w-full mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {meeting.signatureCount} از {meeting.totalSignaturesRequired} امضا
          </span>
          <motion.div className="flex items-center -space-x-2 space-x-reverse" initial="hidden" animate="show" variants={staggerContainerVariants}>
            {meeting.participants.filter(Boolean).slice(0, 3).map((p, index) => (
              <motion.span
                key={p.id || `participant-${index}`}
                variants={staggerItemVariants}
              ><UserAvatar name={p.name} avatar={p.avatar} className="h-6 w-6 text-[8px] ring-2 ring-white shadow-2xs dark:ring-slate-900" imageClassName="h-6 w-6 rounded-full object-cover ring-2 ring-white shadow-2xs dark:ring-slate-900" /></motion.span>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Security & Document Hash Info */}
      <div className="rounded-2xl p-3.5 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xs border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex flex-col gap-1.5">
        <div className="flex items-center justify-between font-medium text-slate-700 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            <span>اعتبار سنجی SHA-256</span>
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
            VERIFIED
          </span>
        </div>
        <p className="font-mono text-[9px] text-slate-400 truncate text-left dir-ltr">
          {meeting.documentHash || '8d23419992f96129486c76e274c4e09f87...'}
        </p>
      </div>
    </aside>
  );
};
