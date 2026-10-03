import React, { useState } from 'react';
import { X, UserPlus, Check } from 'lucide-react';
import { Participant } from '../types';

interface AddParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddParticipant: (p: Participant) => void;
  existingParticipants: Participant[];
}

export const AddParticipantModal: React.FC<AddParticipantModalProps> = ({
  isOpen,
  onClose,
  onAddParticipant,
  existingParticipants,
}) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('عضو تیم');
  const [email, setEmail] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newParticipant: Participant = {
      id: `usr_${Date.now()}`,
      name: name.trim(),
      role: role.trim(),
      email: email.trim() || `${Date.now()}@metameet.ir`,
      initials: name.trim().slice(0, 2),
      hasSigned: false,
      statusText: 'در انتظار امضا',
    };

    onAddParticipant(newParticipant);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-white/80 dark:border-slate-800 p-6 flex flex-col gap-4 text-right">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              افزودن شرکت‌کننده به جلسه
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-xs">
          <div className="flex flex-col gap-1">
            <label className="font-medium text-slate-700 dark:text-slate-300">
              نام و نام‌خانوادگی:
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: نیلوفر افشار"
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-medium text-slate-700 dark:text-slate-300">
              سمت سازمانی / نقش:
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="مثال: مدیر تضمین کیفیت"
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-medium text-slate-700 dark:text-slate-300">
              ایمیل سازمانی (جهت ارسال لینک امضا):
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100 dir-ltr text-right"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer shadow-xs"
            >
              افزودن
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
