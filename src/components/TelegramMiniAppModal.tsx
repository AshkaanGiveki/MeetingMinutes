import React, { useState } from 'react';
import { X, Send, CheckCircle2, ShieldCheck, PenTool, Smartphone } from 'lucide-react';
import { Meeting } from '../types';
import { currentUser } from '../data/mockData';

interface TelegramMiniAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: Meeting;
  onSignComplete: () => void;
}

export const TelegramMiniAppModal: React.FC<TelegramMiniAppModalProps> = ({
  isOpen,
  onClose,
  meeting,
  onSignComplete,
}) => {
  const [hasSigned, setHasSigned] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  if (!isOpen) return null;

  const handleTelegramSign = () => {
    setIsSigning(true);
    setTimeout(() => {
      setIsSigning(false);
      setHasSigned(true);
      onSignComplete();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs select-none">
      {/* Mobile Frame Container */}
      <div className="relative w-full max-w-[360px] h-[640px] rounded-[40px] bg-slate-950 p-3 shadow-2xl border-4 border-slate-700 flex flex-col overflow-hidden">
        
        {/* Smartphone top speaker notch */}
        <div className="w-full flex justify-center mb-1">
          <div className="w-24 h-4 bg-slate-800 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-slate-700 mr-2" />
            <div className="w-8 h-1 bg-slate-700 rounded-full" />
          </div>
        </div>

        {/* Telegram WebApp Header */}
        <div className="rounded-t-2xl bg-[#2481cc] text-white p-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <Send className="w-3.5 h-3.5 rotate-180 text-white" />
            </div>
            <div className="flex flex-col text-right">
              <span className="text-xs font-bold leading-tight">MetaMeet Bot</span>
              <span className="text-[9px] text-white/80">مینی‌اپلیکیشن تایید و امضا</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 text-white text-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Telegram App Content */}
        <div className="flex-1 bg-[#f0f2f5] dark:bg-slate-900 p-4 flex flex-col justify-between overflow-y-auto rounded-b-2xl text-right">
          
          <div className="flex flex-col gap-3">
            {/* Telegram User Verified Identity Badge */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 shadow-2xs border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-full object-cover"
                />
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800 dark:text-slate-100 text-[11px]">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    شناسه تلگرام: @arash_fathi
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                تأیید شد
              </span>
            </div>

            {/* Meeting card */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 shadow-xs border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
              <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                صورت‌جلسه نیازمند امضای شما
              </span>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-snug">
                {meeting.title}
              </h4>
              <p className="text-[11px] text-slate-500 line-clamp-3 leading-relaxed">
                {meeting.discussion}
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between text-[10px] text-slate-400">
                <span>تاریخ: {meeting.persianDate}</span>
                <span className="font-bold text-indigo-600">
                  {meeting.signatureCount} از {meeting.totalSignaturesRequired} امضا
                </span>
              </div>
            </div>

            {/* Verification & Integrity Check */}
            <div className="p-2.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-[10px] text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                رمزنگاری سراسری و امضای بدون دسترسی شخص ثالث با کلید امن تلگرام
              </span>
            </div>
          </div>

          {/* Action Button at bottom of Mobile Screen */}
          <div className="pt-4">
            {hasSigned ? (
              <div className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md">
                <CheckCircle2 className="w-4 h-4" />
                <span>امضای تلگرامی با موفقیت ثبت شد</span>
              </div>
            ) : (
              <button
                onClick={handleTelegramSign}
                disabled={isSigning}
                className="w-full py-3 rounded-xl bg-[#2481cc] hover:bg-[#1f70b3] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-colors"
              >
                {isSigning ? (
                  <span>در حال اعتبارسنجی و امضا...</span>
                ) : (
                  <>
                    <PenTool className="w-4 h-4" />
                    <span>بررسی کردم، امضا شود</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
