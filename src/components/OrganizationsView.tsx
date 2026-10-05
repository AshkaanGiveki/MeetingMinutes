import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Building2, Check, ChevronDown, Plus, RefreshCw, ShieldCheck, Users, X } from 'lucide-react';
import { staggerContainerVariants, staggerItemVariants } from './stagger';
import { EmptyState } from './EmptyState';
import { LoadingState } from './LoadingState';

interface OrganizationContext {
  organization: { id: string; name: string; visibility: string };
  membership: { role: string; permissions: string[] };
  memberCount: number;
}

interface Invitation {
  token: string;
  organizationId: string;
  email?: string;
  phoneNumber?: string;
  name?: string;
  role: string;
  expiresAt: number;
}

interface OrganizationsViewProps {
  activeOrganizationId?: string;
  onOrganizationChanged: (user: { organizationId: string; organizationName?: string; role?: string; permissions?: string[] }) => void;
}

export const OrganizationsView: React.FC<OrganizationsViewProps> = ({ activeOrganizationId, onOrganizationChanged }) => {
  const [organizations, setOrganizations] = useState<OrganizationContext[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [name, setName] = useState('');
  const [inviteTarget, setInviteTarget] = useState('');
  const [inviteRole, setInviteRole] = useState('Participant');
  const [feedback, setFeedback] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    try {
      const [orgResponse, invitationResponse] = await Promise.all([fetch('/api/organizations'), fetch('/api/organizations/invitations')]);
      const orgData = await orgResponse.json();
      const invitationData = await invitationResponse.json();
      setOrganizations(orgData.organizations || []);
      setInvitations(invitationData.invitations || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const createOrganization = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setIsBusy(true);
    const response = await fetch('/api/organizations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    const data = await response.json();
    setIsBusy(false);
    if (!response.ok) return setFeedback(data.error || 'ایجاد سازمان انجام نشد.');
    onOrganizationChanged(data.user);
    setName('');
    setFeedback('سازمان ایجاد شد.');
    await load();
  };

  const switchOrganization = async (organizationId: string) => {
    setIsBusy(true);
    const response = await fetch(`/api/organizations/${organizationId}/switch`, { method: 'POST' });
    const data = await response.json();
    setIsBusy(false);
    if (!response.ok) return setFeedback(data.error || 'تغییر سازمان انجام نشد.');
    onOrganizationChanged(data.user);
    setFeedback('سازمان فعال تغییر کرد.');
  };

  const invite = async (event: React.FormEvent, organizationId: string) => {
    event.preventDefault();
    const isEmail = inviteTarget.includes('@');
    const response = await fetch(`/api/organizations/${organizationId}/invitations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [isEmail ? 'email' : 'phoneNumber']: inviteTarget, role: inviteRole }) });
    const data = await response.json();
    setFeedback(response.ok ? 'دعوت‌نامه ایجاد شد.' : data.error || 'ارسال دعوت‌نامه انجام نشد.');
    if (response.ok) setInviteTarget('');
  };

  const respondToInvitation = async (token: string, action: 'accept' | 'reject') => {
    const response = await fetch(`/api/organizations/invitations/${token}/${action}`, { method: 'POST' });
    const data = await response.json();
    if (response.ok && action === 'accept') onOrganizationChanged(data.user);
    setFeedback(response.ok ? (action === 'accept' ? 'عضویت در سازمان پذیرفته شد.' : 'دعوت‌نامه رد شد.') : data.error || 'عملیات انجام نشد.');
    await load();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5 py-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-slate-900 dark:text-white">سازمان‌های من</h1><p className="mt-1 text-sm text-slate-500">عضویت‌ها، دعوت‌نامه‌ها و دسترسی‌های سازمانی خود را مدیریت کنید.</p></div>
        <button onClick={() => void load()} className="rounded-xl border border-slate-200 p-2 text-slate-500 dark:border-slate-700"><RefreshCw className="h-4 w-4" /></button>
      </div>
      {feedback && <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">{feedback}</div>}
      <form onSubmit={createOrganization} className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="نام سازمان جدید" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <button disabled={isBusy} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" />ایجاد سازمان</button>
      </form>
      {isLoading && <LoadingState label="در حال بارگذاری سازمان‌ها…" />}
      {!isLoading && <motion.div className="flex flex-col gap-4" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}>
        {organizations.length === 0 ? <EmptyState compact icon={Building2} title="هنوز سازمانی پیدا نشد" description="برای شروع، سازمان اول خود را ایجاد کنید." /> : organizations.map((item) => {
          const isActive = item.organization.id === activeOrganizationId;
          const canManageMembers = item.membership.permissions.includes('members.manage');
          return <motion.div key={item.organization.id} variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' } } }} layout className={`group relative overflow-hidden rounded-[1.75rem] border transition-all duration-300 ${isActive ? 'border-indigo-200/90 bg-gradient-to-l from-indigo-50/80 via-white to-violet-50/60 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-100/70 dark:border-indigo-800/80 dark:from-indigo-950/50 dark:via-slate-900 dark:to-violet-950/30 dark:shadow-indigo-950/30 dark:ring-indigo-900/50' : 'border-slate-200 bg-white shadow-sm hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-xl hover:shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800'}`}>
            {isActive && <div className="absolute inset-y-0 right-0 w-1 bg-gradient-to-b from-indigo-500 via-violet-500 to-fuchsia-400" aria-hidden="true" />}
            <div className="flex flex-col gap-5 p-4 sm:p-5 lg:grid lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-6 lg:p-6">
              <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.35rem] ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}><Building2 className="h-7 w-7" /></div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-lg font-bold tracking-tight text-slate-900 dark:text-white">{item.organization.name}</h2>{isActive ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />فعال فعلی</span> : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">سازمان</span>}</div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">فضای کاری سازمانی برای مدیریت جلسات و همکاری تیمی</p>
                <div className="mt-4 flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"><Users className="h-3.5 w-3.5 text-slate-400" />{item.memberCount} عضو</span><span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"><ShieldCheck className="h-3.5 w-3.5 text-slate-400" />نقش شما: {item.membership.role}</span>{canManageMembers && <span className="rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1.5 text-[10px] font-semibold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300">مدیریت اعضا</span>}</div>
              </div>
              <div className="flex w-full flex-col gap-2 lg:w-40">
                {isActive ? <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400"><Check className="h-4 w-4 text-emerald-500" />فضای فعال شما</div> : <button disabled={isBusy} onClick={() => void switchOrganization(item.organization.id)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-60"><ChevronDown className="h-4 w-4" />فعال‌سازی</button>}
              </div>
            </div>
          </motion.div>;
        })}
      </motion.div>}
      {invitations.length > 0 && <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5"><h2 className="mb-3 font-bold text-amber-900">دعوت‌نامه‌های دریافتی</h2><motion.div className="space-y-2" initial="hidden" animate="show" variants={staggerContainerVariants}>{invitations.map((inv) => <motion.div key={inv.token} variants={staggerItemVariants} className="flex items-center justify-between rounded-xl bg-white p-3"><div><p className="text-sm font-semibold text-slate-800">دعوت به عضویت · {inv.role}</p><p className="text-xs text-slate-500">{inv.email || inv.phoneNumber}</p></div><div className="flex gap-2"><button onClick={() => void respondToInvitation(inv.token, 'accept')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">پذیرش</button><button onClick={() => void respondToInvitation(inv.token, 'reject')} className="rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700"><X className="inline h-3 w-3" /> رد</button></div></motion.div>)}</motion.div></section>}
    </div>
  );
};
