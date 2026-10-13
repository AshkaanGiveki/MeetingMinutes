import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Users, Plus, CheckCircle2, UserCheck, Key, X, Trash2, LoaderCircle } from 'lucide-react';
import { Participant } from '../types';
import { staggerContainerVariants, staggerItemVariants } from './stagger';
import { EmptyState } from './EmptyState';
import { TableRowsSkeleton } from './LoadingState';
import { UserAvatar } from './UserAvatar';
import { CustomSelect } from './CustomSelect';
import { AnimatedModal } from './AnimatedModal';
import { formatIranianPhoneInput } from '../utils/phone';

interface ContactsViewProps {
  isAuthenticated?: boolean;
  organizationId?: string;
  canManageMembers?: boolean;
}

interface PendingOrganizationInvitation {
  token: string;
  phoneNumber?: string;
  name?: string;
  role: string;
  createdAt: string;
  expiresAt: number;
}

export const ContactsView: React.FC<ContactsViewProps> = ({ isAuthenticated = true, organizationId, canManageMembers = false }) => {
  const [members, setMembers] = useState<Participant[]>([]);
  const [invitations, setInvitations] = useState<PendingOrganizationInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [operationMessage, setOperationMessage] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('User');
  const [memberPendingRemoval, setMemberPendingRemoval] = useState<Participant | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setLoadError('');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    fetch('/api/members', { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('اعضای سازمان قابل دریافت نیستند.')))
      .then((data) => { setMembers((data.members || []).map((member: Participant) => ({ ...member, hasSigned: false }))); setInvitations(data.invitations || []); setIsLoading(false); })
      .catch((error) => setLoadError(error instanceof DOMException && error.name === 'AbortError' ? 'دریافت اعضای سازمان بیش از حد طول کشید. لطفاً دوباره تلاش کنید.' : error instanceof Error ? error.message : 'اعضای سازمان قابل دریافت نیستند.'))
      .finally(() => window.clearTimeout(timeout));
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [isAuthenticated, organizationId]);

  useEffect(() => {
    if (loadError) setIsLoading(false);
  }, [loadError]);

  const permissionsList = [
    { code: 'meeting.create', label: 'ایجاد و ویرایش جلسه' },
    { code: 'signature.sign', label: 'امضای رسمی دیجیتال' },
    { code: 'document.seal', label: 'مهر و موم و آرشیو سند' },
    { code: 'audit.read', label: 'مشاهده لاگ‌های بازرسی' },
  ];

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim()) return;
    setIsInviting(true);
    setLoadError('');
    setOperationMessage('');

    void fetch('/api/members/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: newPhone.trim() }),
    }).then(async (response) => {
      if (!response.ok) throw new Error((await response.json()).error || 'دعوت عضو انجام نشد.');
      setNewPhone('');
      setIsInviteModalOpen(false);
      setOperationMessage('دعوت‌نامه با موفقیت ارسال شد و در فهرست دعوت‌های در انتظار قرار گرفت.');
      return fetch('/api/members').then(async (refreshResponse) => {
        if (!refreshResponse.ok) return;
        const refreshed = await refreshResponse.json();
        setInvitations(refreshed.invitations || []);
      });
    }).catch((error) => setLoadError(error instanceof Error ? error.message : 'دعوت عضو انجام نشد.')).finally(() => setIsInviting(false));
  };

  const handleRemoveMember = async () => {
    if (!memberPendingRemoval) return;
    setIsRemovingMember(true);
    try {
      const response = await fetch(`/api/members/${memberPendingRemoval.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'حذف عضو انجام نشد.');
      }
      setMembers((current) => current.filter((member) => member.id !== memberPendingRemoval.id));
      setMemberPendingRemoval(null);
      setLoadError('');
      setOperationMessage('عضو با موفقیت از سازمان حذف شد.');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'حذف عضو انجام نشد.');
    } finally {
      setIsRemovingMember(false);
    }
  };

  return (
    <div className="responsive-page flex-1 max-w-5xl mx-auto flex flex-col gap-6 p-6">
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

        {canManageMembers && <button
          onClick={() => setIsInviteModalOpen(true)}
          className="py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer transition-all active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>دعوت عضو جدید</span>
        </button>}
      </div>

      {loadError && <div className="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{loadError}</div>}
      {operationMessage && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4 shrink-0" />{operationMessage}</div>}

      {/* Permissions overview bar */}
      <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold">
          <Key className="w-4 h-4 text-indigo-500" />
          <span>سیاست‌های مجوز سازمان:</span>
        </div>
        <motion.div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400" initial="hidden" animate="show" variants={staggerContainerVariants}>
          {permissionsList.map((p) => (
            <motion.span
              key={p.code}
              variants={staggerItemVariants}
              layout
              className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>{p.label}</span>
            </motion.span>
          ))}
        </motion.div>
      </div>

      {invitations.length > 0 && <section className="rounded-3xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-amber-900 dark:text-amber-100">دعوت‌نامه‌های در انتظار</h2>
            <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">تا تعیین تکلیف این دعوت‌نامه‌ها، ارسال دعوت‌نامه تکراری برای همان شماره امکان‌پذیر نیست.</p>
          </div>
          <span className="rounded-full bg-amber-200/70 px-2.5 py-1 text-[10px] font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">{invitations.length} دعوت</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {invitations.map((invitation) => <div key={invitation.token} className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-amber-200/80 bg-white/75 p-3 dark:border-amber-900/50 dark:bg-slate-900/50">
            <div className="min-w-0"><p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">{invitation.name || invitation.phoneNumber}</p><p className="mt-1 truncate font-mono text-[10px] text-slate-500 dark:text-slate-400">{invitation.phoneNumber}</p></div>
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700 dark:bg-amber-900/50 dark:text-amber-200">در انتظار پذیرش</span>
          </div>)}
        </div>
      </section>}

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
              {isLoading ? (
                <TableRowsSkeleton columns={5} />
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4">
                    <EmptyState compact icon={Users} title="عضوی پیدا نشد" description="هنوز عضوی به این سازمان اضافه نشده است." action={canManageMembers ? <button onClick={() => setIsInviteModalOpen(true)} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white">دعوت عضو جدید</button> : undefined} />
                  </td>
                </tr>
              ) : <AnimatePresence initial={false} mode="popLayout">{members.map((m, index) => (
                <motion.tr
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1, ease: 'easeOut' }}
                  exit={{ opacity: 0, x: 18, transition: { duration: 0.2 } }}
                  layout
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-100">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar name={m.name} avatar={m.avatar} className="h-8 w-8 text-[10px] ring-1 ring-slate-200 dark:ring-slate-700" imageClassName="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700" />
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
                    {canManageMembers && <button
                      onClick={() => setMemberPendingRemoval(m)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="حذف عضو"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>}
                  </td>
                </motion.tr>
              ))}</AnimatePresence>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      <AnimatedModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} contentClassName="w-full max-w-md">
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

            <form onSubmit={handleInvite} className="contacts-invite-form flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  نام و نام خانوادگی:
                </label>
                <input
                  type="text"
                  disabled
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
                  onChange={(e) => setNewPhone(formatIranianPhoneInput(e.target.value))}
                  placeholder="09121234567"
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none"
                />
                <input
                  type="email"
                  disabled
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
                <CustomSelect
                  value={newRole}
                  onChange={setNewRole}
                  options={[
                    { value: 'مدیر ارشد', label: 'مدیر ارشد' },
                    { value: 'مدیر محصول', label: 'مدیر محصول' },
                    { value: 'توسعه‌دهنده ارشد', label: 'توسعه‌دهنده ارشد' },
                    { value: 'کارشناس حقوقی', label: 'کارشناس حقوقی' },
                    { value: 'طراح محصول', label: 'طراح محصول' },
                  ]}
                />
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
                  disabled={isInviting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer shadow-md shadow-indigo-600/20 active:scale-98 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isInviting && <LoaderCircle className="ml-1 inline h-3.5 w-3.5 animate-spin" />}
                  ارسال دعوت‌نامه
                </button>
              </div>
            </form>
          </div>
      </AnimatedModal>

      {/* Remove member confirmation */}
      <AnimatedModal
        isOpen={Boolean(memberPendingRemoval)}
        onClose={() => { if (!isRemovingMember) setMemberPendingRemoval(null); }}
        contentClassName="w-full max-w-md"
      >
        {memberPendingRemoval && (
          <div className="w-full max-w-md rounded-3xl border border-white/80 bg-white p-6 text-right shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">حذف عضو از سازمان</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">این عضو دیگر به جلسات و اطلاعات این سازمان دسترسی نخواهد داشت.</p>
                  </div>
                  <button type="button" onClick={() => setMemberPendingRemoval(null)} disabled={isRemovingMember} className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200" aria-label="بستن">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/60">
              <UserAvatar name={memberPendingRemoval.name} avatar={memberPendingRemoval.avatar} className="h-10 w-10 shrink-0 text-xs ring-2 ring-white dark:ring-slate-700" imageClassName="h-10 w-10 rounded-full object-cover ring-2 ring-white dark:ring-slate-700" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{memberPendingRemoval.name}</p>
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{memberPendingRemoval.email || 'عضو سازمان'}</p>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2">
              <button type="button" onClick={() => setMemberPendingRemoval(null)} disabled={isRemovingMember} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">انصراف</button>
              <button type="button" onClick={() => void handleRemoveMember()} disabled={isRemovingMember} className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-600/20 transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50">{isRemovingMember ? 'در حال حذف…' : 'حذف عضو'}</button>
            </div>
          </div>
        )}
      </AnimatedModal>
    </div>
  );
};
