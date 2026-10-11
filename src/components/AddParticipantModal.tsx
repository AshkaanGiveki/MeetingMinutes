import React, { useEffect, useMemo, useState } from 'react';
import { Search, UserPlus, Users, X, Check, Phone, Send, ShieldCheck, LoaderCircle } from 'lucide-react';
import { Participant } from '../types';
import { useSnackbar } from './Snackbar';
import { formatIranianPhoneInput } from '../utils/phone';

interface OrganizationMember { userId: string; name: string; phoneNumber?: string; email?: string; avatar?: string; role: string; }
interface PendingInvitation { token: string; phoneNumber?: string; name?: string; role: string; meetingRequiresSignature?: boolean; }
interface AddParticipantModalProps { isOpen: boolean; onClose: () => void; meetingId: string; onAddParticipant: (participant: Participant) => void; existingParticipants: Participant[]; }

const roles = [
  { value: 'Participant', label: 'شرکت‌کننده' },
  { value: 'Reviewer', label: 'بازبین' },
  { value: 'Signer', label: 'امضاکننده' },
  { value: 'Editor', label: 'ویرایشگر' },
  { value: 'Viewer', label: 'مشاهده‌گر' },
];

export const AddParticipantModal: React.FC<AddParticipantModalProps> = ({ isOpen, onClose, meetingId, onAddParticipant, existingParticipants }) => {
  const { showSnackbar } = useSnackbar();
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [search, setSearch] = useState('');
  const [phoneNumber, setPhoneNumberState] = useState('');
  const setPhoneNumber = (value: string) => setPhoneNumberState(formatIranianPhoneInput(value));
  const [assignment, setAssignment] = useState('Participant');
  const [requiresSignature, setRequiresSignature] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const assignedIds = useMemo(() => new Set(existingParticipants.map((participant) => participant.id)), [existingParticipants]);
  const filteredMembers = useMemo(() => { const query = search.trim().toLowerCase(); return query ? members.filter((member) => [member.name, member.phoneNumber, member.email].filter(Boolean).some((value) => String(value).toLowerCase().includes(query))) : members; }, [members, search]);

  useEffect(() => {
    if (!isOpen || !meetingId) return;
    setIsLoading(true); setSelectedUserId('');
    fetch(`/api/meetings/${meetingId}/participant-options`)
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data?.error || 'فهرست اعضای سازمان دریافت نشد.'); setMembers(data.members || []); setInvitations(data.invitations || []); })
      .catch((error) => showSnackbar({ type: 'error', message: error instanceof Error ? error.message : 'فهرست اعضا دریافت نشد.' }))
      .finally(() => setIsLoading(false));
  }, [isOpen, meetingId, showSnackbar]);

  if (!isOpen) return null;

  const addExistingMember = async () => {
    const member = members.find((item) => item.userId === selectedUserId);
    if (!member || assignedIds.has(member.userId)) return;
    setIsBusy(true);
    try {
      const response = await fetch(`/api/meetings/${meetingId}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: member.userId, assignment, requiresSignature }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'افزودن عضو به جلسه انجام نشد.');
      onAddParticipant({ id: member.userId, name: member.name, role: assignment, email: member.email || '', avatar: member.avatar, initials: member.name.slice(0, 2), hasSigned: false, requiresSignature, membershipStatus: 'active', statusText: requiresSignature ? 'آماده امضا' : 'شرکت‌کننده' });
      showSnackbar({ type: 'success', message: 'عضو سازمان به جلسه اضافه شد.' }); setSelectedUserId('');
    } catch (error) { showSnackbar({ type: 'error', message: error instanceof Error ? error.message : 'افزودن عضو انجام نشد.' }); }
    finally { setIsBusy(false); }
  };

  const inviteByPhone = async (event: React.FormEvent) => {
    event.preventDefault(); if (!phoneNumber.trim()) return; setIsBusy(true);
    try {
      const response = await fetch(`/api/meetings/${meetingId}/participants/invite`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phoneNumber: phoneNumber.trim(), assignment, requiresSignature }) });
      const data = await response.json(); if (!response.ok) throw new Error(data?.error || 'ارسال دعوت انجام نشد.');
      setInvitations((current) => [{ ...(data.invitation || {}), role: assignment, meetingRequiresSignature: requiresSignature }, ...current.filter((item) => item.phoneNumber !== phoneNumber.trim())]);
      setPhoneNumber(''); showSnackbar({ type: 'success', message: data.status === 'platform_user_invited' ? 'دعوت عضویت و جلسه برای کاربر ارسال شد.' : 'لینک ثبت‌نام و دعوت جلسه با پیامک ارسال شد.' });
    } catch (error) { showSnackbar({ type: 'error', message: error instanceof Error ? error.message : 'ارسال دعوت انجام نشد.' }); }
    finally { setIsBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div dir="rtl" className="flex max-h-[min(760px,calc(100vh-2rem))] w-full max-w-2xl flex-col overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300"><UserPlus className="h-5 w-5" /></div><div><h3 className="font-bold text-slate-900 dark:text-white">افزودن افراد به جلسه</h3><p className="mt-0.5 text-[11px] text-slate-500">فقط اعضای ثبت‌شده می‌توانند صورت‌جلسه را امضا کنند.</p></div></div><button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button></div>
        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-5 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="min-w-0 space-y-3"><div className="flex items-center justify-between"><div><h4 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100"><Users className="h-4 w-4 text-indigo-500" />اعضای سازمان</h4><p className="mt-1 text-[11px] text-slate-500">یک عضو را انتخاب کنید و نقش او را تعیین کنید.</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">{members.length} عضو</span></div><div className="relative"><Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جست‌وجوی نام یا شماره تلفن" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-9 pl-3 text-xs text-slate-800 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" /></div><div className="max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-slate-200/80 p-2 dark:border-slate-800">{isLoading ? <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />در حال دریافت اعضا…</div> : filteredMembers.length === 0 ? <div className="py-10 text-center text-xs text-slate-500">عضوی با این مشخصات پیدا نشد.</div> : filteredMembers.map((member) => { const isAssigned = assignedIds.has(member.userId); const isSelected = selectedUserId === member.userId; return <button type="button" key={member.userId} disabled={isAssigned} onClick={() => setSelectedUserId(member.userId)} className={`flex w-full items-center gap-3 rounded-xl p-3 text-right transition ${isAssigned ? 'cursor-not-allowed opacity-50' : isSelected ? 'bg-indigo-50 ring-1 ring-indigo-300 dark:bg-indigo-950/50 dark:ring-indigo-700' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{member.name.slice(0, 2)}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-800 dark:text-slate-100">{member.name}</span><span className="mt-0.5 block truncate text-[10px] text-slate-500">{member.phoneNumber || member.email || member.role}</span></span>{isAssigned ? <span className="text-[10px] font-semibold text-emerald-600">افزوده شد</span> : isSelected ? <Check className="h-4 w-4 text-indigo-600" /> : null}</button>; })}</div><div className="grid gap-2 sm:grid-cols-2"><select value={assignment} onChange={(event) => setAssignment(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">{roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select><label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"><input type="checkbox" checked={requiresSignature} onChange={(event) => setRequiresSignature(event.target.checked)} className="accent-indigo-600" />نیازمند امضا</label></div><button type="button" disabled={!selectedUserId || isBusy} onClick={() => void addExistingMember()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"><Check className="h-4 w-4" />افزودن عضو انتخاب‌شده</button></section>
          <section className="space-y-3"><div><h4 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100"><Phone className="h-4 w-4 text-indigo-500" />افزودن فرد جدید</h4><p className="mt-1 text-[11px] leading-5 text-slate-500">شماره تلفن را وارد کنید؛ کاربر موجود دعوت عضویت می‌گیرد و کاربر جدید لینک ثبت‌نام دریافت می‌کند.</p></div><form onSubmit={inviteByPhone} className="space-y-2 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3 dark:border-indigo-900/60 dark:bg-indigo-950/20"><input required value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="مثال: 09121234567" dir="ltr" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" /><button disabled={isBusy} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900"><Send className="h-3.5 w-3.5" />ارسال دعوت</button></form><div className="rounded-2xl border border-slate-200/80 p-3 dark:border-slate-800"><div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200"><ShieldCheck className="h-4 w-4 text-emerald-500" />دعوت‌های در انتظار</div>{invitations.length === 0 ? <p className="py-4 text-center text-[11px] text-slate-500">دعوت در انتظاری وجود ندارد.</p> : <div className="space-y-2">{invitations.map((inv) => <div key={inv.token} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800"><div className="min-w-0"><p className="truncate text-[11px] font-semibold text-slate-700 dark:text-slate-200">{inv.name || inv.phoneNumber}</p><p className="text-[10px] text-amber-600">در انتظار پذیرش دعوت</p></div><span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[9px] font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">{inv.meetingRequiresSignature === false ? 'بدون امضا' : 'امضاکننده'}</span></div>)}</div>}</div></section>
        </div>
      </div>
    </div>
  );
};
