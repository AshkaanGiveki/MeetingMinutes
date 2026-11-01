import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Users, Plus, CheckCircle2, UserCheck, X, Trash2, LoaderCircle, Mail, Clock3, Search, ChevronDown, MoreVertical } from 'lucide-react';
import { Participant } from '../types';
import { EmptyState } from './EmptyState';
import { UserAvatar } from './UserAvatar';
import { PageHeader } from './PageHeader';
import { AnimatedModal } from './AnimatedModal';
import { formatIranianPhoneInput } from '../utils/phone';

interface ContactsViewProps {
  isAuthenticated?: boolean;
  organizationId?: string;
  canManageMembers?: boolean;
  platformRole?: string;
}

interface PendingOrganizationInvitation {
  id: string;
  phoneNumber?: string;
  name?: string;
  role: string;
  createdAt: string;
  expiresAt: number;
  status?: string;
  deliveryStatus?: string;
  offeredRole?: string;
}

interface MobileRecoveryRequest {
  id: string;
  targetUserId: string;
  organizationId: string;
  oldPhoneNumber: string;
  newPhoneNumber: string;
  newVerified: boolean;
  oldVerified: boolean;
  recoveryStatus: string;
  status: string;
  createdAt: string;
}

type OrganizationInvitationRole = 'InternalMember';
type InvitationDistribution = 'sms' | 'copy';
type RecoveryDecision = 'approved' | 'rejected' | 'inconclusive' | 'expired';

export const ContactsView: React.FC<ContactsViewProps> = ({ isAuthenticated = true, organizationId, canManageMembers = false, platformRole }) => {
  const [members, setMembers] = useState<Participant[]>([]);
  const [invitations, setInvitations] = useState<PendingOrganizationInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [operationMessage, setOperationMessage] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<OrganizationInvitationRole>('InternalMember');
  const [invitationDistribution, setInvitationDistribution] = useState<InvitationDistribution>('sms');
  const [memberPendingRemoval, setMemberPendingRemoval] = useState<Participant | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [memberSearchInput, setMemberSearchInput] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [openMemberMenuId, setOpenMemberMenuId] = useState<string | null>(null);
  const [mobileChangeMember, setMobileChangeMember] = useState<Participant | null>(null);
  const [newMobile, setNewMobile] = useState('');
  const [mobileRequestId, setMobileRequestId] = useState('');
  const [newMobileOtp, setNewMobileOtp] = useState('');
  const [oldMobileOtp, setOldMobileOtp] = useState('');
  const [recoveryRequests, setRecoveryRequests] = useState<MobileRecoveryRequest[]>([]);
  const [hasMoreMembers, setHasMoreMembers] = useState(false);
  const [isLoadingMoreMembers, setIsLoadingMoreMembers] = useState(false);
  const memberOffsetRef = useRef(0);
  const loadingMoreRef = useRef(false);

  const loadMembersPage = async (offset: number, search: string, append: boolean, signal?: AbortSignal) => {
    if (append) {
      if (loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      setIsLoadingMoreMembers(true);
    }
    else if (members.length === 0) setIsLoading(true);
    try {
      const pageSize = window.matchMedia('(max-width: 639px)').matches ? 10 : 500;
      const query = new URLSearchParams({ offset: String(offset), limit: String(pageSize) });
      if (search.trim()) query.set('search', search.trim());
      const response = await fetch(`/api/members?${query.toString()}`, { signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'اعضای سازمان قابل دریافت نیستند.');
      const pageMembers = (data.members || []).map((member: Participant) => ({ ...member, hasSigned: false }));
      setMembers((current) => append ? [...current, ...pageMembers] : pageMembers);
      setHasMoreMembers(Boolean(data.hasMore));
      memberOffsetRef.current = Number(data.nextOffset || offset + pageMembers.length);
      if (!append && organizationId && canManageMembers) {
        const invitationResponse = await fetch(`/api/organizations/${organizationId}/invitations/managed`);
        if (invitationResponse.ok) {
          const invitationData = await invitationResponse.json();
          setInvitations(invitationData.invitations || []);
        }
      }
      setLoadError('');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setLoadError(error instanceof Error ? error.message : 'اعضای سازمان قابل دریافت نیستند.');
    } finally {
      if (append) setIsLoadingMoreMembers(false);
      else setIsLoading(false);
      if (append) loadingMoreRef.current = false;
    }
  };

  const loadRecoveryRequests = async () => {
    if (platformRole !== 'SuperAdmin') return;
    const response = await fetch('/api/mobile-change');
    if (!response.ok) return;
    const data = await response.json();
    setRecoveryRequests((data.requests || []).filter((request: MobileRecoveryRequest) => request.status === 'pending'));
  };

  const reviewRecovery = async (requestId: string, decision: RecoveryDecision) => {
    const evidenceReference = window.prompt('مرجع مدرک مالکیت را وارد کنید:')?.trim() || '';
    const reason = window.prompt('توضیح تصمیم بازبین را وارد کنید:')?.trim() || '';
    if (!evidenceReference || !reason) { setLoadError('مرجع مدرک و توضیح بررسی الزامی است.'); return; }
    const response = await fetch(`/api/mobile-change/${requestId}/recovery-review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision, evidenceReference, reason }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setLoadError(data.error || 'بررسی بازیابی انجام نشد.');
      return;
    }
    setOperationMessage(decision === 'approved' ? 'درخواست بازیابی تأیید شد.' : decision === 'rejected' ? 'درخواست بازیابی رد شد.' : decision === 'inconclusive' ? 'نتیجه بررسی: شواهد ناکافی.' : 'درخواست بازیابی منقضی شد.');
    await loadRecoveryRequests();
  };

  useEffect(() => { if (isAuthenticated && platformRole === 'SuperAdmin') void loadRecoveryRequests(); }, [isAuthenticated, platformRole]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setMemberSearch(memberSearchInput.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [memberSearchInput]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      memberOffsetRef.current = 0;
      void loadMembersPage(0, memberSearch, false, controller.signal);
    }, 0);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [isAuthenticated, organizationId, memberSearch]);

  const handleMembersScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (!hasMoreMembers || isLoadingMoreMembers || loadingMoreRef.current) return;
    const element = event.currentTarget;
    const distanceFromEnd = element.scrollWidth - element.clientWidth - Math.abs(element.scrollLeft);
    if (distanceFromEnd < 180) void loadMembersPage(memberOffsetRef.current, memberSearch, true);
  };

  const filteredMembers = members.filter((member) => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) return true;
    return `${member.name || ''} ${member.email || ''}`.toLowerCase().includes(query);
  });

  useEffect(() => {
    if (loadError) setIsLoading(false);
  }, [loadError]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim() || !organizationId) return;
    setIsInviting(true);
    setLoadError('');
    setOperationMessage('');
    try {
      const response = await fetch(`/api/organizations/${organizationId}/invitations${invitationDistribution === 'copy' ? '/copy' : ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: newPhone.trim(), role: newRole }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'دعوت عضو انجام نشد.');
      if (invitationDistribution === 'copy') {
        if (!data.invitationUrl) throw new Error('لینک دعوت ایجاد نشد.');
        await navigator.clipboard.writeText(data.invitationUrl);
      }
      setNewPhone('');
      setIsInviteModalOpen(false);
      setOperationMessage(invitationDistribution === 'copy'
        ? 'دعوت ایجاد شد و لینک آن در کلیپ‌بورد کپی شد.'
        : 'دعوت کاربر سازمان با موفقیت برای ارسال پیامک ثبت شد.');
      const refreshed = await fetch(`/api/organizations/${organizationId}/invitations/managed`);
      if (refreshed.ok) {
        const refreshedData = await refreshed.json();
        setInvitations(refreshedData.invitations || []);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'دعوت عضو انجام نشد.');
    } finally {
      setIsInviting(false);
    }
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

  const manageInvitation = async (invitation: PendingOrganizationInvitation, action: 'copy-link' | 'reissue' | 'cancel') => {
    if (!organizationId) return;
    const suffix = action === 'cancel' ? '' : `/${action}`;
    const response = await fetch(`/api/organizations/${organizationId}/invitations/by-id/${invitation.id}${suffix}`, { method: action === 'cancel' ? 'DELETE' : 'POST' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setLoadError(data.error || 'عملیات دعوت‌نامه انجام نشد.'); return; }
    if (action === 'copy-link' && data.invitationUrl) { try { await navigator.clipboard.writeText(data.invitationUrl); setOperationMessage('لینک دعوت در کلیپ‌بورد کپی شد.'); } catch { setLoadError('کپی لینک انجام نشد؛ دوباره تلاش کنید.'); } }
    else setOperationMessage(action === 'cancel' ? 'دعوت‌نامه لغو شد.' : 'دعوت‌نامه دوباره صادر شد.');
    void loadMembersPage(0, memberSearch, false);
  };

  const startMobileChange = async () => {
    if (!mobileChangeMember || !newMobile.trim()) return;
    const response = await fetch('/api/mobile-change', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizationId, targetUserId: mobileChangeMember.id, newPhoneNumber: newMobile.trim() }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setLoadError(data.error || 'درخواست تغییر موبایل ایجاد نشد.'); return; }
    setMobileRequestId(data.request.id); setOperationMessage('درخواست تغییر موبایل ایجاد شد. ابتدا شماره جدید را تأیید کنید.');
    const otpResponse = await fetch(`/api/mobile-change/${data.request.id}/otp/new/request`, { method: 'POST' });
    const otpData = await otpResponse.json().catch(() => ({}));
    if (otpData.demoCode) setOperationMessage(`کد توسعه شماره جدید: ${otpData.demoCode}`);
  };
  const verifyMobileSide = async (side: 'new' | 'old') => {
    if (!mobileRequestId) return;
    const code = side === 'new' ? newMobileOtp : oldMobileOtp;
    const response = await fetch(`/api/mobile-change/${mobileRequestId}/otp/${side}/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setLoadError(data.error || 'کد تأیید نامعتبر است.'); return; }
    if (side === 'new') {
      const oldResponse = await fetch(`/api/mobile-change/${mobileRequestId}/otp/old/request`, { method: 'POST' });
      const oldData = await oldResponse.json().catch(() => ({}));
      setOperationMessage(oldData.demoCode ? `کد توسعه شماره قبلی: ${oldData.demoCode}` : 'کد تأیید به شماره قبلی ارسال شد.');
    } else {
      const completeResponse = await fetch(`/api/mobile-change/${mobileRequestId}/complete`, { method: 'POST' });
      const completeData = await completeResponse.json().catch(() => ({}));
      setOperationMessage(completeResponse.ok ? 'تغییر موبایل انجام شد و نشست‌های قبلی باطل شدند.' : completeData.error || 'تغییر موبایل کامل نشد.');
    }
  };

  return (
    <div className="responsive-page flex-1 max-w-5xl mx-auto flex flex-col gap-6 p-6">
      {platformRole === 'SuperAdmin' && <section className="rounded-[1.75rem] border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/20"><div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-sm font-black text-amber-950 dark:text-amber-100">درخواست‌های بازیابی شماره موبایل</h2><p className="mt-1 text-[11px] text-amber-800/80 dark:text-amber-200/70">بررسی Super Admin جایگزین تأیید شماره قدیمی نیست؛ فقط برای شماره‌های غیرقابل‌دسترسی استفاده می‌شود.</p></div><span className="rounded-xl bg-white px-2.5 py-1.5 text-[10px] font-black text-amber-800 dark:bg-slate-900 dark:text-amber-200">{recoveryRequests.length} در انتظار</span></div>{recoveryRequests.length === 0 ? <p className="rounded-xl bg-white/70 p-3 text-xs text-slate-500 dark:bg-slate-900/50">درخواست بازیابی در انتظاری وجود ندارد.</p> : <div className="space-y-2">{recoveryRequests.map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3 dark:bg-slate-900"><div className="text-xs"><p className="font-bold text-slate-800 dark:text-slate-100">حساب {request.targetUserId}</p><p className="mt-1 text-[10px] text-slate-500">شماره قبلی {request.oldPhoneNumber} ← شماره جدید {request.newPhoneNumber}</p><p className="mt-1 text-[10px] text-slate-500">تأیید جدید: {request.newVerified ? 'بله' : 'خیر'} · وضعیت بازیابی: {request.recoveryStatus}</p></div><div className="flex gap-2"><button type="button" onClick={() => void reviewRecovery(request.id, 'approved')} className="rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-bold text-white">تأیید</button><button type="button" onClick={() => void reviewRecovery(request.id, 'rejected')} className="rounded-lg border border-rose-200 px-3 py-2 text-[10px] font-bold text-rose-600">رد</button></div></div>)}</div>}</section>}
      <PageHeader
        icon={Users}
        title={'\u0627\u0639\u0636\u0627\u06cc \u0633\u0627\u0632\u0645\u0627\u0646'}
        description="مدیریت اعضای تیم، نقش‌ها، دسترسی‌ها و احراز هویت اعضای سازمان"
        action={canManageMembers ? <button onClick={() => setIsInviteModalOpen(true)} className="w-fit self-start flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-95"><Plus className="h-4 w-4" /><span>دعوت عضو جدید</span></button> : undefined}
      />
      {/* Header */}
      <div className="hidden flex items-center justify-between">
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

      {invitations.length > 0 && <section className="contacts-invitations rounded-[1.75rem] border border-indigo-100 bg-gradient-to-br from-indigo-50/90 via-white to-slate-50 p-4 dark:border-indigo-900/60 dark:from-indigo-950/45 dark:via-slate-900 dark:to-slate-950">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"><Mail className="h-4 w-4" /></span><div><h2 className="text-sm font-black text-slate-900 dark:text-white">دعوت‌نامه‌های در انتظار</h2><p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">در انتظار پاسخ اعضای دعوت‌شده</p></div></div>
          </div>
          <span className="shrink-0 rounded-xl bg-white px-2.5 py-1.5 text-[10px] font-black text-indigo-700 shadow-sm ring-1 ring-indigo-100 dark:bg-slate-800 dark:text-indigo-300 dark:ring-indigo-900/60">{invitations.length} مورد</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {invitations.map((invitation) => <div key={invitation.id} className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white/90 p-2 dark:border-slate-700 dark:bg-slate-900/80">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"><Clock3 className="h-3.5 w-3.5" /></div>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100" style={{ fontFamily: 'IRANSansXFaNum, sans-serif' }}>{invitation.phoneNumber}</p><p className="mt-0.5 text-[10px] text-slate-500">کاربر سازمان</p></div>
            <span className="shrink-0 rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">در انتظار</span>
            <div className="flex shrink-0 gap-1"><button type="button" onClick={() => void manageInvitation(invitation, 'copy-link')} className="rounded-lg px-2 py-1 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50">کپی</button><button type="button" onClick={() => void manageInvitation(invitation, 'cancel')} className="rounded-lg px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50">لغو</button></div>
          </div>)}
        </div>
      </section>}

      <label className="contacts-member-search contacts-member-search-desktop">
        <Search className="h-4 w-4 shrink-0 text-indigo-500" />
        <input value={memberSearchInput} onChange={(event) => setMemberSearchInput(event.target.value)} placeholder="جست‌وجوی نام یا ایمیل عضو" aria-label="جست‌وجوی نام یا ایمیل عضو" />
        {memberSearchInput && <button type="button" onClick={() => { setMemberSearchInput(''); setMemberSearch(''); }} aria-label="پاک کردن جست‌وجو"><X className="h-4 w-4" /></button>}
      </label>

      {/* Members list */}
      <section className="rounded-3xl border border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90" dir="rtl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">اعضای سازمان</h2>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">اطلاعات اصلی اعضا و وضعیت احراز هویت</p>
          </div>
          <span className="rounded-xl bg-slate-100 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{filteredMembers.length} عضو</span>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-3 sm:p-4" aria-label="در حال بارگذاری اعضا">
            {[1, 2, 3].map((item) => <div key={item} className="h-[4.75rem] animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)}
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-4"><EmptyState compact icon={Search} title={memberSearch ? 'عضوی با این جست‌وجو پیدا نشد' : 'عضوی پیدا نشد'} description={memberSearch ? 'نام یا ایمیل دیگری را جست‌وجو کنید.' : 'هنوز عضوی به این سازمان اضافه نشده است.'} action={!memberSearch && canManageMembers ? <button onClick={() => setIsInviteModalOpen(true)} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white">دعوت عضو جدید</button> : undefined} /></div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <AnimatePresence initial={false} mode="popLayout">
              {filteredMembers.map((member, index) => {
                const isExpanded = expandedMemberId === member.id;
                const isMenuOpen = openMemberMenuId === member.id;
                return (
                  <motion.article key={member.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 18 }} transition={{ duration: 0.25, delay: index * 0.04 }} className="relative px-3 py-3.5 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/35 sm:px-5">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={member.name} avatar={member.avatar} className="h-10 w-10 shrink-0 text-xs ring-1 ring-slate-200 dark:ring-slate-700" imageClassName="h-10 w-10 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700" />
                      <button type="button" onClick={() => setExpandedMemberId(isExpanded ? null : member.id)} className="min-w-0 flex-1 text-right">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">{member.name}</h3>
                          {member.role?.trim() && <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{member.role}</span>}
                        </div>
                        <p className="mt-1 truncate text-[11px] text-slate-500 dark:text-slate-400" dir="ltr">{member.email || 'ایمیل ثبت نشده'}</p>
                      </button>
                      <span className="hidden items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 sm:flex"><UserCheck className="h-3.5 w-3.5" />احراز هویت شده</span>
                      <button type="button" onClick={() => setExpandedMemberId(isExpanded ? null : member.id)} aria-label={isExpanded ? 'بستن جزئیات عضو' : 'نمایش جزئیات عضو'} className={`rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 ${isExpanded ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' : ''}`}><ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} /></button>
                      <div className="relative shrink-0">
                        <button type="button" onClick={() => setOpenMemberMenuId(isMenuOpen ? null : member.id)} aria-label="عملیات عضو" className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"><MoreVertical className="h-4 w-4" /></button>
                        {isMenuOpen && <div className="absolute left-0 top-10 z-20 min-w-40 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                          <button type="button" onClick={() => { setExpandedMemberId(isExpanded ? null : member.id); setOpenMemberMenuId(null); }} className="w-full rounded-xl px-3 py-2 text-right text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">{isExpanded ? 'بستن جزئیات' : 'مشاهده جزئیات'}</button>
                          {canManageMembers && <button type="button" onClick={() => { setOpenMemberMenuId(null); setMemberPendingRemoval(member); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-right text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30"><Trash2 className="h-3.5 w-3.5" />حذف عضو</button>}
                        </div>}
                      </div>
                    </div>
                    {isExpanded && canManageMembers && <button type="button" onClick={() => { setMobileChangeMember(member); setMobileRequestId(''); setNewMobile(''); setNewMobileOtp(''); setOldMobileOtp(''); }} className="mt-3 rounded-2xl border border-amber-100 bg-amber-50/70 px-3 py-2 text-right text-[11px] font-bold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">شروع درخواست امن تغییر موبایل</button>}
                    {isExpanded && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 grid gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300 sm:grid-cols-3">
                      <div className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/55">
                        <span className="block text-[10px] font-medium text-slate-400">ایمیل</span>
                        <span className="mt-1.5 block truncate font-medium" dir="ltr">{member.email || 'ثبت نشده'}</span>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/55">
                        <span className="block text-[10px] font-medium text-slate-400">وضعیت گواهی امضا</span>
                        <span className="mt-1.5 flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400"><UserCheck className="h-3.5 w-3.5" />احراز هویت شده</span>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/55">
                        <span className="block text-[10px] font-medium text-slate-400">نقش سازمانی</span>
                        <span className="mt-1.5 block font-semibold">{member.role || 'ثبت نشده'}</span>
                      </div>
                    </motion.div>}
                  </motion.article>
                );
              })}
            </AnimatePresence>
            {isLoadingMoreMembers && <div className="px-4 py-3 text-center text-xs text-slate-500">در حال دریافت اعضای بیشتر…</div>}
          </div>
        )}
      </section>

      {mobileChangeMember && <div className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-950/45 p-4"><section className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"><div className="flex items-center justify-between"><h3 className="text-sm font-black">تغییر امن شماره موبایل</h3><button type="button" onClick={() => setMobileChangeMember(null)} className="text-slate-400"><X className="h-4 w-4" /></button></div><p className="mt-2 text-xs leading-6 text-slate-500">برای {mobileChangeMember.name}، شماره قبلی فقط پس از تأیید شماره جدید و شماره قبلی یا بررسی Super Admin تغییر می‌کند.</p>{!mobileRequestId ? <div className="mt-4 space-y-3"><input value={newMobile} onChange={(event) => setNewMobile(event.target.value)} placeholder="شماره موبایل جدید" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-800" /><button type="button" onClick={() => void startMobileChange()} className="w-full rounded-xl bg-indigo-600 px-3 py-3 text-xs font-bold text-white">ایجاد درخواست و ارسال OTP جدید</button></div> : <div className="mt-4 space-y-3"><input value={newMobileOtp} onChange={(event) => setNewMobileOtp(event.target.value)} placeholder="OTP شماره جدید" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-800" /><button type="button" onClick={() => void verifyMobileSide('new')} className="w-full rounded-xl bg-indigo-600 px-3 py-3 text-xs font-bold text-white">تأیید شماره جدید</button><input value={oldMobileOtp} onChange={(event) => setOldMobileOtp(event.target.value)} placeholder="OTP شماره قبلی" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-800" /><button type="button" onClick={() => void verifyMobileSide('old')} className="w-full rounded-xl bg-emerald-600 px-3 py-3 text-xs font-bold text-white">تأیید قبلی و تکمیل تغییر</button></div>}</section></div>}

      {/* Invite Modal */}
      <AnimatedModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} zIndexClassName="z-[200]" contentClassName="w-full max-w-md">
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
                <label className="font-semibold text-slate-700 dark:text-slate-300">شماره موبایل دعوت‌شونده:</label>
                <input type="tel" required value={newPhone} onChange={(e) => setNewPhone(formatIranianPhoneInput(e.target.value))} placeholder="09121234567" className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">نقش پیشنهادی:</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value as OrganizationInvitationRole)} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                  <option value="InternalMember">عضو داخلی</option>
                </select>
                <p className="text-[10px] leading-5 text-slate-500">نام و نام خانوادگی در مرحله فعال‌سازی توسط خود فرد تکمیل می‌شود.</p>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">روش توزیع دعوت:</label>
                <select value={invitationDistribution} onChange={(e) => setInvitationDistribution(e.target.value as InvitationDistribution)} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                  <option value="sms">ثبت برای ارسال پیامک</option>
                  <option value="copy">کپی لینک بدون ارسال پیامک</option>
                </select>
                <p className="text-[10px] leading-5 text-slate-500">کپی لینک فقط لینک را در کلیپ‌بورد می‌نویسد و به‌معنای ارسال یا دریافت پیام نیست.</p>
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
