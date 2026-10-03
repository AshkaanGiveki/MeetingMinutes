import React, { useState } from 'react';
import { X, Copy, Check, Mail, Send, Link, Smartphone } from 'lucide-react';
import { Meeting } from '../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: Meeting;
  onOpenTelegramModal: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  meeting,
  onOpenTelegramModal,
}) => {
  const [copied, setCopied] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [invitedSent, setInvitedSent] = useState(false);

  if (!isOpen) return null;

  const meetingLink = `${window.location.origin}/meeting/${meeting.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(meetingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setInvitedSent(true);
    setTimeout(() => {
      setEmailInput('');
      setInvitedSent(false);
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-white/80 dark:border-slate-800 p-6 flex flex-col gap-5 text-right">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              اشتراک‌گذاری و دعوت به امضا
            </h3>
            <p className="text-[11px] text-slate-400">
              ارسال لینک امن برای اعضا و حاضرین جلسه
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Link Copy Box */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            لینک مستقیم صورت‌جلسه:
          </label>
          <div className="flex items-center gap-2 p-1.5 pr-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <Link className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              readOnly
              value={meetingLink}
              className="flex-1 text-xs text-slate-600 dark:text-slate-300 bg-transparent focus:outline-none dir-ltr font-mono truncate"
            />
            <button
              onClick={handleCopy}
              className="py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>کپی شد</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>کپی لینک</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Email Invitation Form */}
        <form onSubmit={handleSendEmail} className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            ارسال دعوت‌نامه ایمیلی:
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 p-2 pr-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <Mail className="w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="ایمیل مخاطب را وارد کنید..."
                className="w-full text-xs text-slate-800 dark:text-slate-100 bg-transparent focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={!emailInput.trim() || invitedSent}
              className="py-2.5 px-4 rounded-2xl bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 text-white text-xs font-medium cursor-pointer transition-colors disabled:opacity-40"
            >
              {invitedSent ? 'ارسال شد ✓' : 'ارسال'}
            </button>
          </div>
        </form>

        {/* Telegram Mini App Action */}
        <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-sky-950 dark:text-sky-200">
                مینی‌اپلیکیشن تلگرام (Telegram Mini App)
              </span>
              <span className="text-[10px] text-sky-700 dark:text-sky-400">
                مشاهده و امضای آسان از طریق ربات تلگرام
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              onOpenTelegramModal();
            }}
            className="py-1.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors flex items-center gap-1"
          >
            <Send className="w-3.5 h-3.5 rotate-180" />
            <span>باز کردن</span>
          </button>
        </div>
      </div>
    </div>
  );
};
