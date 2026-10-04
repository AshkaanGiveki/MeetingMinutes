import React, { useEffect, useState } from 'react';
import { Users, Plus, Shield, Mail, CheckCircle2, UserCheck, Key, X, Trash2 } from 'lucide-react';
import { Participant } from '../types';

export const ContactsView: React.FC = () => {
  const [members, setMembers] = useState<Participant[]>([]);
  const [loadError, setLoadError] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('مدیر فنی');

  useEffect(() => {
    fetch('/api/members')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('اعضای سازمان قابل دریافت نیستند.')))
      .then((data) => setMembers((data.members || []).map((member: Participant) => ({ ...member, hasSigned: false }))))
      .catch((error) => setLoadError(error instanceof Error ? error.message : 'اعضای سازمان قابل دریافت نیستند.'));
  }, []);

  const permissionsList = [
    { code: 'meeting.create', label: 'ایجاد و ویرایش جلسه' },
    { code: 'signature.sign', label: 'امضای رسمی دیجیتال' },
    { code: 'document.seal', label: 'مهر و موم و آرشیو سند' },
    { code: 'audit.read', label: 'مشاهده لاگ‌های بازرسی' },
  ];

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    void fetch('/api/members/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail.trim(), phoneNumber: newPhone.trim(), name: newName.trim(), role: 'Participant' }),
    }).then(async (response) => {
      if (!response.ok) throw new Error((await response.json()).error || 'دعوت عضو انجام نشد.');
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setIsInviteModalOpen(false);
    }).catch((error) => setLoadError(error instanceof Error ? error.message : 'دعوت عضو انجام نشد.'));
    return;

    const newMember: Participant = {
      id: `usr_${Date.now()}`,
      name: newName.trim(),
      email: newEmail.trim(),
      role: newRole,
      avatar: `https://images.unsplash.com/photo-${1534528741775 + members.length * 100}?w=100&auto=format&fit=crop&q=80`,
      hasSigned: false,
    };

    setMembers([...members, newMember]);
    setNewName('');
    setNewEmail('');
    setIsInviteModalOpen(false);
  };

  const handleRemoveMember = async (id: string) => {
    const response = await fetch(`/api/members/${id}`, { method: 'DELETE' });
    if (response.ok) setMembers((current) => current.filter((member) => member.id !== id));
  };

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
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              مدیریت تیم‌ها، نقش‌ها، دسترسی‌های امضا و احراز هویت اعضا
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer transition-all active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>دعوت عضو جدید</span>
        </button>
      </div>

      {loadError && <div className="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{loadError}</div>}

      {/* Permissions overview bar */}
      <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold">
          <Key className="w-4 h-4 text-indigo-500" />
          <span>سیاست‌های مجوز سازمان:</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
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
                        src={m.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80'}
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
                  <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400 dir-ltr text-left">
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
                      onClick={() => handleRemoveMember(m.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="حذف عضو"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-white/80 dark:border-slate-800 p-6 flex flex-col gap-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                دعوت عضو جدید به سازمان
              </h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  نام و نام خانوادگی:
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="مثال: پویا رحیمی"
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  ایمیل سازمانی:
                </label>
                <input
                  type="tel"
                  required={false}
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+989121234567"
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none"
                />
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="pouya@company.ir"
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  سمت سازمانی:
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none"
                >
                  <option value="مدیر ارشد">مدیر ارشد</option>
                  <option value="مدیر محصول">مدیر محصول</option>
                  <option value="توسعه‌دهنده ارشد">توسعه‌دهنده ارشد</option>
                  <option value="کارشناس حقوقی">کارشناس حقوقی</option>
                  <option value="طراح محصول">طراح محصول</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer shadow-md shadow-indigo-600/20 active:scale-98"
                >
                  ارسال دعوت‌نامه
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
