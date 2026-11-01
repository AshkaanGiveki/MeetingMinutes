import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Building2, Check, Plus, RefreshCw, ShieldCheck, Users, X } from 'lucide-react';
import { staggerContainerVariants, staggerItemVariants } from './stagger';
import { EmptyState } from './EmptyState';
import { OrganizationCardsSkeleton } from './LoadingState';
import { useSnackbar } from './Snackbar';
import { formatIranianPhoneInput } from '../utils/phone';
import { PageHeader } from './PageHeader';
import { organizationRoleLabel } from '../utils/organization';

interface OrganizationContext {
  organization: { id: string; name: string; visibility: string };
  membership: { role: string; permissions: string[] };
  memberCount: number;
  memberPreviews?: Array<{ id: string; name: string; avatar?: string }>;
}

interface Invitation {
  id: string;
  organizationId: string;
  email?: string;
  phoneNumber?: string;
  name?: string;
  role: string;
  expiresAt: number;
}

interface AdministrativeOrganization { id: string; name: string; createdAt: string; memberCount: number; }

interface OrganizationsViewProps {
  isAuthenticated?: boolean;
  platformRole?: 'SuperAdmin' | 'User';
  activeOrganizationId?: string;
  onOrganizationChanged: (user: { organizationId: string; organizationName?: string; role?: string; permissions?: string[] }) => void;
}

interface CreateOrganizationModalProps {
  open: boolean;
  name: string;
  isBusy: boolean;
  onNameChange: (name: string) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

const CreateOrganizationModal: React.FC<CreateOrganizationModalProps> = ({ open, name, isBusy, onNameChange, onClose, onSubmit }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <motion.form
          onSubmit={onSubmit}
          dir="rtl"
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 360, damping: 26, mass: 0.7 }}
          className="w-full max-w-md rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-2xl shadow-slate-950/20 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40"
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300"><Building2 className="h-5 w-5" /></div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">ایجاد سازمان جدید</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">یک فضای کاری تازه برای مدیریت جلسات و همکاری تیمی بسازید.</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200" aria-label="بستن"><X className="h-4 w-4" /></button>
          </div>
          <label className="flex flex-col gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            نام سازمان
            <input autoFocus value={name} onChange={(event) => onNameChange(event.target.value)} placeholder="نام سازمان جدید" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-normal text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
          </label>
          <div className="mt-6 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">لغو</button>
            <button type="submit" disabled={isBusy || !name.trim()} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4" />{isBusy ? 'در حال ایجاد…' : 'ایجاد سازمان'}</button>
          </div>
        </motion.form>
      </motion.div>
    )}
  </AnimatePresence>
);

export const OrganizationsView: React.FC<OrganizationsViewProps> = ({ isAuthenticated = true, platformRole, activeOrganizationId, onOrganizationChanged }) => {
  const { showSnackbar } = useSnackbar();
  const [organizations, setOrganizations] = useState<OrganizationContext[]>([]);
  const [administrativeOrganizations, setAdministrativeOrganizations] = useState<AdministrativeOrganization[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [name, setName] = useState('');
  const [inviteTarget, setInviteTargetState] = useState('');
  const setInviteTarget = (value: string) => setInviteTargetState(value.includes('@') ? value : formatIranianPhoneInput(value));
  const [inviteRole, setInviteRole] = useState('User');
  const [isBusy, setIsBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const hasUnsavedOrganizationInput = Boolean(name.trim() || inviteTarget.trim());

  const load = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const organizationRequest = fetch('/api/organizations');
      const invitationRequest = fetch('/api/organizations/invitations');
      const orgResponse = await organizationRequest;
      const orgData = await orgResponse.json();
      if (!orgResponse.ok) throw new Error(orgData.error || 'سازمان‌ها دریافت نشدند.');
      setOrganizations(orgData.organizations || []);
      if (platformRole === 'SuperAdmin') {
        const adminResponse = await fetch('/api/admin/organizations');
        const adminData = await adminResponse.json();
        if (adminResponse.ok) setAdministrativeOrganizations(adminData.organizations || []);
      } else {
        setAdministrativeOrganizations([]);
      }
      setIsLoading(false);
      const invitationResponse = await invitationRequest;
      const invitationData = await invitationResponse.json();
      if (invitationResponse.ok) setInvitations(invitationData.invitations || []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'بارگذاری سازمان‌ها انجام نشد.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    void load();
  }, [isAuthenticated, activeOrganizationId, platformRole]);

  const createOrganization = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setIsBusy(true);
    const response = await fetch('/api/organizations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    const data = await response.json();
    setIsBusy(false);
    if (!response.ok) return showSnackbar({ type: 'error', message: data.error || 'ایجاد سازمان انجام نشد.' });
    onOrganizationChanged(data.user);
    setName('');
    setIsCreateModalOpen(false);
    showSnackbar({ type: 'success', message: 'سازمان ایجاد شد.', position: 'bottom-center' });
    await load();
  };

  const switchOrganization = async (organizationId: string) => {
    if (hasUnsavedOrganizationInput && !window.confirm('تغییر سازمان، تغییرات ذخیره‌نشده را از بین می‌برد. ادامه می‌دهید؟')) return;
    setIsBusy(true);
    const response = await fetch(`/api/organizations/${organizationId}/switch`, { method: 'POST' });
    const data = await response.json();
    setIsBusy(false);
    if (!response.ok) return showSnackbar({ type: 'error', message: data.error || 'تغییر سازمان انجام نشد.' });
    onOrganizationChanged(data.user);
    showSnackbar({ type: 'success', message: 'سازمان فعال تغییر کرد.', position: 'bottom-center' });
  };

  const invite = async (event: React.FormEvent, organizationId: string) => {
    event.preventDefault();
    const isEmail = inviteTarget.includes('@');
    const response = await fetch(`/api/organizations/${organizationId}/invitations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [isEmail ? 'email' : 'phoneNumber']: inviteTarget, role: inviteRole }) });
    const data = await response.json();
    showSnackbar({ type: response.ok ? 'success' : 'error', message: response.ok ? 'دعوت‌نامه ایجاد شد.' : data.error || 'ارسال دعوت‌نامه انجام نشد.' });
    if (response.ok) setInviteTarget('');
  };

  const respondToInvitation = async (token: string, action: 'accept' | 'reject') => {
    const response = await fetch(`/api/organizations/invitations/${token}/${action}`, { method: 'POST' });
    const data = await response.json();
    if (response.ok && action === 'accept') onOrganizationChanged(data.user);
    showSnackbar({ type: response.ok ? 'success' : 'error', message: response.ok ? (action === 'accept' ? 'عضویت در سازمان پذیرفته شد.' : 'دعوت‌نامه رد شد.') : data.error || 'عملیات انجام نشد.' });
    await load();
  };

  return (
    <div className="organizations-page responsive-page mx-auto max-w-6xl space-y-5 py-6" dir="rtl">
      <PageHeader
        icon={Building2}
        title="سازمان‌های من"
        description="عضویت‌ها، دعوت‌نامه‌ها و دسترسی‌های سازمانی خود را مدیریت کنید."
        action={platformRole === 'SuperAdmin' ? <button type="button" onClick={() => setIsCreateModalOpen(true)} className="flex w-fit items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:bg-indigo-700"><Plus className="h-4 w-4" />ایجاد سازمان</button> : undefined}
      >
        <motion.button
          type="button"
          onClick={() => void load()}
          whileHover={{ y: -2, scale: 1.03 }}
          whileTap={{ scale: 0.94 }}
          className="org-refresh-button group w-fit"
          title="تازه‌سازی سازمان‌ها"
          aria-label="تازه‌سازی سازمان‌ها"
        >
          <motion.span
            animate={isLoading ? { rotate: 360 } : { rotate: 0 }}
            transition={isLoading ? { duration: 0.9, ease: 'linear', repeat: Infinity } : { duration: 0.25 }}
            className="flex items-center justify-center"
          >
            <RefreshCw className="h-4 w-4" />
          </motion.span>
          <span className="org-refresh-label">تازه‌سازی</span>
        </motion.button>
      </PageHeader>
      {loadError && <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"><span>{loadError}</span><button type="button" onClick={() => void load()} className="font-bold underline">تلاش دوباره</button></div>}
      {platformRole === 'SuperAdmin' && !isLoading && <section className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-5 dark:border-indigo-900/50 dark:bg-indigo-950/20"><div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white"><ShieldCheck className="h-4 w-4 text-indigo-600" />Platform organization administration</div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{administrativeOrganizations.map((organization) => <div key={organization.id} className="rounded-2xl border border-indigo-100 bg-white px-4 py-3 dark:border-indigo-900/60 dark:bg-slate-900"><p className="font-bold text-slate-800 dark:text-slate-100">{organization.name}</p><p className="mt-1 text-[11px] text-slate-500">{organization.memberCount} members · {organization.id}</p></div>)}</div></section>}
      {isLoading && <OrganizationCardsSkeleton />}
      {!isLoading && <motion.div className="flex flex-col gap-4" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.15 } } }}>
        {organizations.length === 0 ? <EmptyState compact icon={Building2} title="هنوز سازمانی پیدا نشد" description="برای شروع، سازمان اول خود را ایجاد کنید." /> : <AnimatePresence mode="popLayout">{organizations.map((item, index) => {
          const isActive = item.organization.id === activeOrganizationId;
          const canManageMembers = item.membership.permissions.includes('members.manage');
          return <motion.div key={item.organization.id} initial="hidden" animate="show" variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }} transition={{ duration: 0.32, delay: index * 0.1, ease: 'easeOut' }} exit={{ opacity: 0, scale: 0.97, y: 10, transition: { duration: 0.2 } }} layout className={`org-card group relative ${isActive ? 'org-card-selected' : ''}`}>
            <div className={`org-card-surface relative overflow-hidden rounded-[1.75rem] border transition-all duration-300 ${isActive ? 'org-card-active border-slate-200 bg-white shadow-sm ring-1 ring-indigo-100/70 dark:border-slate-800 dark:bg-slate-900 dark:shadow-sm dark:ring-indigo-900/50' : 'border-slate-200 bg-white shadow-sm hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-xl hover:shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800'}`}>
              <div className="org-card-content flex flex-col gap-5 p-4 pr-14 sm:p-5 sm:pr-16 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-6 lg:p-6 lg:pr-20">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-lg font-bold tracking-tight text-slate-900 dark:text-white">{item.organization.name}</h2>{isActive ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />فعال فعلی</span> : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">سازمان</span>}</div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">فضای کاری سازمانی برای مدیریت جلسات و همکاری تیمی</p>
                <div className="mt-4 flex flex-wrap items-center gap-2"><span className="org-member-avatars inline-flex items-center" title={`${item.memberCount} عضو`}>
                  {(item.memberPreviews || []).slice(0, 4).map((member, memberIndex) => member.avatar ? <img key={member.id} src={member.avatar} alt={member.name} className="org-member-avatar h-7 w-7 rounded-full border-2 border-white object-cover dark:border-slate-900" style={{ marginInlineStart: memberIndex ? '-0.45rem' : 0 }} /> : <span key={member.id} className="org-member-avatar flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-indigo-100 text-[9px] font-bold text-indigo-700 dark:border-slate-900 dark:bg-indigo-950 dark:text-indigo-200" style={{ marginInlineStart: memberIndex ? '-0.45rem' : 0 }}>{member.name.slice(0, 1)}</span>)}
                  {item.memberCount > 4 && <span className="org-member-avatar flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[9px] font-bold text-slate-600 dark:border-slate-900 dark:bg-slate-800 dark:text-slate-300" style={{ marginInlineStart: '-0.45rem' }}>+{item.memberCount - 4}</span>}
                  <span className="sr-only">{item.memberCount} عضو</span>
                </span><span className="org-card-badges"><span className="org-role-badge inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300" title={`نقش شما: ${organizationRoleLabel(item.membership.role)}`} aria-label={`نقش شما: ${organizationRoleLabel(item.membership.role)}`}><ShieldCheck className="h-3.5 w-3.5 text-slate-400" /><span className="sr-only">نقش شما: {organizationRoleLabel(item.membership.role)}</span></span>{canManageMembers && <span className="org-manage-members inline-flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1.5 text-[10px] font-semibold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300" title="مدیریت اعضا" aria-label="مدیریت اعضا"><Users className="h-3.5 w-3.5" /><span>مدیریت اعضا</span></span>}</span></div>
              </div>
              <div className="flex w-full flex-col gap-2 lg:w-40">
                {isActive ? <div className="org-card-action org-active-status flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[11px] font-semibold"><Check className="h-4 w-4" />فضای فعال شما</div> : <button disabled={isBusy} onClick={() => void switchOrganization(item.organization.id)} className="org-card-action org-activate-button flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold disabled:opacity-60"><span>فعال‌سازی</span><ArrowLeft className="h-4 w-4" /></button>}
              </div>
            </div>
            </div>
             <div className="org-card-identity"><div className={`org-card-icon flex h-14 w-14 shrink-0 items-center justify-center rounded-full ring-4 ring-white/80 ${isActive ? 'bg-transparent text-indigo-600 shadow-none dark:text-indigo-300 dark:ring-slate-900/80' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-900/80'}`}><Building2 className="h-7 w-7" /></div></div>
          </motion.div>;
        })}</AnimatePresence>}
      </motion.div>}
      {invitations.length > 0 && <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5"><h2 className="mb-3 font-bold text-amber-900">دعوت‌نامه‌های دریافتی</h2><motion.div className="space-y-2" initial="hidden" animate="show" variants={staggerContainerVariants}>{invitations.map((inv) => <motion.div key={inv.id} variants={staggerItemVariants} className="flex items-center justify-between rounded-xl bg-white p-3"><div><p className="text-sm font-semibold text-slate-800">دعوت به عضویت · {organizationRoleLabel(inv.role)}</p><p className="text-xs text-slate-500">{inv.email || inv.phoneNumber}</p></div><span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">لینک دعوت را از پیامک باز کنید</span></motion.div>)}</motion.div></section>}
      <CreateOrganizationModal open={isCreateModalOpen} name={name} isBusy={isBusy} onNameChange={setName} onClose={() => setIsCreateModalOpen(false)} onSubmit={createOrganization} />
    </div>
  );
};
