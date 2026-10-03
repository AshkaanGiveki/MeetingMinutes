import React, { useState } from 'react';
import { Users, Plus, Shield, Mail, CheckCircle2, UserCheck, Key } from 'lucide-react';
import { sampleParticipants, currentUser } from '../data/mockData';
import { Participant } from '../types';

export const ContactsView: React.FC = () => {
  const [members, setMembers] = useState<Participant[]>([
    currentUser,
    ...sampleParticipants,
  ]);

  const permissionsList = [
    { code: 'meeting.create', label: 'ایجاد و ویرایش جلسه' },
    { code: 'signature.sign', label: 'امضای رسمی دیجیتال' },
    { code: 'document.seal', label: 'مهر و موم و آرشیو سند' },
    { code: 'audit.read', label: 'مشاهده لاگ‌های بازرسی' },
  ];

  return (
    <div className="flex-1 max-w-5xl mx-auto flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              اعضای سازمان و سطوح دسترسی
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              مدیریت تیم‌ها، نقش‌ها، دسترسی‌های امضا و احراز هویت اعضا
            </p>
          </div>
        </div>

        <button
          onClick={() => alert('دعوت عضو جدید به سازمان')}
          className="py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer transition-all active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>دعوت عضو جدید</span>
        </button>
      </div>

      {/* Permissions overview bar */}
      <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold">
          <Key className="w-4 h-4 text-indigo-500" />
          <span>سیاست‌های مجوز سازمان:</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
          {permissionsList.map((p) => (
            <span
              key={p.code}
              className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>{p.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Members Table */}
      <div className="rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-400 text-[11px] font-medium border-b border-slate-100 dark:border-slate-800">
                <th className="py-3 px-4">کاربر</th>
                <th className="py-3 px-4">نقش سازمانی</th>
                <th className="py-3 px-4">ایمیل</th>
                <th className="py-3 px-4">وضعیت گواهی امضا</th>
                <th className="py-3 px-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {members.map((m) => (
                <tr
                  key={m.id}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-100">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={m.avatar || currentUser.avatar}
                        alt={m.name}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                      />
                      <span>{m.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                      {m.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500 dir-ltr text-left">
                    {m.email}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>احراز هویت شده</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => alert(`تنظیم دسترسی‌های ${m.name}`)}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      ویرایش دسترسی‌ها
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
