import React, { useEffect, useState } from 'react';
import { FolderKanban, LoaderCircle, Plus, RefreshCw, ShieldCheck, UserPlus, UserMinus, ArrowRightLeft } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { PageHeader } from './PageHeader';
import { useSnackbar } from './Snackbar';

type ProjectRole = 'ProjectManager' | 'ExecutionMember' | 'ReceivingLead' | 'ReceivingMember';
interface ProjectItem { project: { id: string; organizationId: string; name: string; managerUserId: string; createdAt: string; status: string }; role: ProjectRole; }
interface ProjectMember { id: string; projectId: string; userId: string; role: string; status: string; user?: { id: string; name?: string; phoneNumber?: string; email?: string }; }
interface ProjectDetails { project: ProjectItem['project']; role: ProjectRole | 'OrganizationAdmin'; members: ProjectMember[]; manager?: { id: string; name?: string }; }
interface Candidate { id: string; name?: string; phoneNumber?: string; email?: string; }
interface ProjectInvitation { id: string; status: string; offeredRole?: string; expiresAt: number; deliveryStatus?: string; phoneNumber?: string; email?: string; }
type InvitationDistribution = 'sms' | 'copy';
interface ProjectContext { id: string; name: string; organizationId: string; role: ProjectRole | 'OrganizationAdmin'; organizationName?: string; }

const roleLabels: Record<string, string> = { ProjectManager: 'مدیر پروژه', ExecutionMember: 'عضو اجرایی', ReceivingLead: 'سرپرست دریافت', ReceivingMember: 'عضو دریافت', OrganizationAdmin: 'مدیر سازمان' };

export const ProjectsView: React.FC<{ isAuthenticated?: boolean; organizationId?: string; organizationName?: string; onProjectContextChange?: (context: ProjectContext | null) => void }> = ({ isAuthenticated = true, organizationId, organizationName, onProjectContextChange }) => {
  const { showSnackbar } = useSnackbar();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedId, setSelectedId] = useState(() => localStorage.getItem('accord:selected-project') || '');
  const [details, setDetails] = useState<ProjectDetails | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [name, setName] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState<'ReceivingLead' | 'ReceivingMember'>('ReceivingMember');
  const [inviteDistribution, setInviteDistribution] = useState<InvitationDistribution>('sms');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const hasUnsavedProjectInput = Boolean(name.trim() || invitePhone.trim());

  useEffect(() => {
    if (!details) {
      onProjectContextChange?.(null);
      return;
    }
    onProjectContextChange?.({ id: details.project.id, name: details.project.name, organizationId: details.project.organizationId, role: details.role, organizationName });
  }, [details, organizationName, onProjectContextChange]);

  const selectProject = (projectId: string) => {
    if (projectId === selectedId) return;
    if (hasUnsavedProjectInput && !window.confirm('تغییر پروژه، تغییرات ذخیره‌نشده را از بین می‌برد. ادامه می‌دهید؟')) return;
    setName('');
    setInvitePhone('');
    setSelectedId(projectId);
    localStorage.setItem('accord:selected-project', projectId);
  };

  const load = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'پروژه‌ها بارگذاری نشدند.');
      const nextProjects = data.projects || [];
      setProjects(nextProjects);
      setSelectedId((current) => nextProjects.some((item: ProjectItem) => item.project.id === current) ? current : nextProjects[0]?.project.id || '');
    } catch (error) { showSnackbar({ type: 'error', message: error instanceof Error ? error.message : 'پروژه‌ها بارگذاری نشدند.' }); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { if (isAuthenticated) void load(); }, [isAuthenticated, organizationId]);
  useEffect(() => {
    if (!isAuthenticated || !organizationId) { setCanCreate(false); return; }
    void fetch(`/api/projects/capabilities?organizationId=${encodeURIComponent(organizationId)}`).then((response) => response.json()).then((data) => setCanCreate(Boolean(data.canCreate))).catch(() => setCanCreate(false));
  }, [isAuthenticated, organizationId]);
  useEffect(() => {
    if (!selectedId) { setDetails(null); setCandidates([]); return; }
    void fetch(`/api/projects/${selectedId}`).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setDetails(data); }).catch(() => setDetails(null));
  }, [selectedId]);
  useEffect(() => {
    if (!selectedId) { setInvitations([]); return; }
    void fetch(`/api/projects/${selectedId}/invitations/managed`).then((response) => response.json()).then((data) => setInvitations(data.invitations || [])).catch(() => setInvitations([]));
  }, [selectedId, details?.members.length]);
  useEffect(() => {
    if (!selectedId || details?.role !== 'ProjectManager') { setCandidates([]); return; }
    void fetch(`/api/projects/${selectedId}/internal-candidates`).then((response) => response.json()).then((data) => setCandidates(data.candidates || [])).catch(() => setCandidates([]));
  }, [selectedId, details?.role]);

  const mutate = async (url: string, method: string, body?: unknown) => {
    setIsBusy(true);
    try {
      const response = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'عملیات انجام نشد.');
      await load();
      if (selectedId) { const refreshed = await fetch(`/api/projects/${selectedId}`); if (refreshed.ok) setDetails(await refreshed.json()); }
      showSnackbar({ type: 'success', message: 'عملیات با موفقیت انجام شد.' });
    } catch (error) { showSnackbar({ type: 'error', message: error instanceof Error ? error.message : 'عملیات انجام نشد.' }); }
    finally { setIsBusy(false); }
  };

  const createProject = async (event: React.FormEvent) => { event.preventDefault(); if (!name.trim() || !organizationId) return; await mutate('/api/projects', 'POST', { organizationId, name: name.trim() }); setName(''); };
  const inviteProjectRole = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId || !invitePhone.trim()) return;
    const role = details?.role === 'ReceivingLead' ? 'ReceivingMember' : inviteRole;
    setIsBusy(true);
    try {
      const response = await fetch(`/api/projects/${selectedId}/invitations${inviteDistribution === 'copy' ? '/copy' : ''}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phoneNumber: invitePhone.trim(), role }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'دعوت پروژه ایجاد نشد.');
      if (inviteDistribution === 'copy') {
        if (!data.invitationUrl) throw new Error('لینک دعوت ایجاد نشد.');
        await navigator.clipboard.writeText(data.invitationUrl);
      }
      setInvitePhone('');
      showSnackbar({ type: 'success', message: inviteDistribution === 'copy' ? 'لینک دعوت پروژه کپی شد.' : 'دعوت پروژه برای ارسال پیامک ثبت شد.' });
      const refreshed = await fetch(`/api/projects/${selectedId}/invitations/managed`);
      if (refreshed.ok) setInvitations((await refreshed.json()).invitations || []);
    } catch (error) {
      showSnackbar({ type: 'error', message: error instanceof Error ? error.message : 'دعوت پروژه ایجاد نشد.' });
    } finally {
      setIsBusy(false);
    }
  };
  const addExecution = () => { if (selectedId && selectedUserId) void mutate(`/api/projects/${selectedId}/execution-members`, 'POST', { userId: selectedUserId }); };
  const transferManager = () => { if (selectedId && selectedUserId) void mutate(`/api/projects/${selectedId}/manager`, 'POST', { userId: selectedUserId }); };

  return <div className="responsive-page mx-auto max-w-6xl space-y-5 py-6" dir="rtl">
    <PageHeader icon={FolderKanban} title="پروژه‌های من" description="همه پروژه‌هایی که در آن‌ها دسترسی صریح دارید، همراه با نقش فعال شما." action={<button type="button" onClick={() => void load()} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"><RefreshCw className="h-4 w-4" />تازه‌سازی</button>} />
    {canCreate && <form onSubmit={createProject} className="rounded-3xl border border-indigo-100 bg-indigo-50/60 p-5 dark:border-indigo-900/50 dark:bg-indigo-950/20"><div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white"><Plus className="h-4 w-4 text-indigo-600" />ایجاد پروژه در سازمان فعال</div><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="نام پروژه" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900" /><button disabled={isBusy || !name.trim()} className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white disabled:opacity-50">{isBusy && <LoaderCircle className="h-4 w-4 animate-spin" />}ایجاد پروژه</button></div></form>}
    {isLoading ? <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white p-12 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900"><LoaderCircle className="ml-2 h-5 w-5 animate-spin" />در حال بارگذاری پروژه‌ها…</div> : projects.length === 0 ? <EmptyState icon={FolderKanban} title="پروژه‌ای برای نمایش وجود ندارد" description="پس از تخصیص پروژه یا اعطای صلاحیت مدیریت پروژه، پروژه‌های مجاز اینجا نمایش داده می‌شوند." /> : <>
      <div className="grid gap-4 md:grid-cols-2">{projects.map((item) => <button type="button" key={item.project.id} onClick={() => selectProject(item.project.id)} className={`rounded-3xl border p-5 text-right shadow-sm transition ${selectedId === item.project.id ? 'border-indigo-400 bg-indigo-50/70 dark:border-indigo-700 dark:bg-indigo-950/30' : 'border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900'}`}><div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-black text-slate-900 dark:text-white">{item.project.name}</h2><p className="mt-1 text-[11px] text-slate-500">سازمان میزبان: {item.project.organizationId}</p></div><span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"><ShieldCheck className="h-3.5 w-3.5" />{roleLabels[item.role]}</span></div></button>)}</div>
      {details && <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-bold text-indigo-600">زمینه فعال پروژه</p><h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">{details.project.name}</h2><p className="mt-1 text-xs text-slate-500">سازمان میزبان: {details.project.organizationId} · نقش شما: {roleLabels[details.role]}</p></div>{details.manager && <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">مدیر پروژه: {details.manager.name || details.manager.id}</p>}</div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">{details.members.map((member) => <div key={`${member.projectId}-${member.userId}-${member.role}`} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3 text-xs dark:bg-slate-800/70"><span>{member.user?.name || member.userId}</span><span className="font-bold text-indigo-600">{roleLabels[member.role] || member.role}</span>{details.role === 'ReceivingLead' && member.role === 'ReceivingMember' && <button type="button" onClick={() => void mutate(`/api/projects/${selectedId}/receiving-members/${member.userId}`, 'DELETE')} className="text-rose-600" aria-label="حذف عضو دریافت"><UserMinus className="h-4 w-4" /></button>}{details.role === 'ProjectManager' && member.role === 'ExecutionMember' && <button type="button" onClick={() => void mutate(`/api/projects/${selectedId}/execution-members/${member.userId}`, 'DELETE')} className="text-rose-600" aria-label="حذف عضو اجرایی"><UserMinus className="h-4 w-4" /></button>}</div>)}</div>
        {(details.role === 'ProjectManager' || details.role === 'ReceivingLead') && <form onSubmit={inviteProjectRole} className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-800"><p className="text-xs font-bold">دعوت عضو دریافت با شماره موبایل ثابت</p><div className="mt-2 flex flex-col gap-2 sm:flex-row"><input value={invitePhone} onChange={(event) => setInvitePhone(event.target.value)} placeholder="شماره موبایل" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs dark:border-slate-700 dark:bg-slate-900" /><select value={details.role === 'ReceivingLead' ? 'ReceivingMember' : inviteRole} disabled={details.role === 'ReceivingLead'} onChange={(event) => setInviteRole(event.target.value as typeof inviteRole)} className="rounded-xl border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900"><option value="ReceivingMember">عضو دریافت</option>{details.role === 'ProjectManager' && <option value="ReceivingLead">سرپرست دریافت</option>}</select><select value={inviteDistribution} onChange={(event) => setInviteDistribution(event.target.value as InvitationDistribution)} className="rounded-xl border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900"><option value="sms">SMS</option><option value="copy">Copy Link</option></select><button disabled={isBusy || !invitePhone.trim()} className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">دعوت</button></div></form>}
        {details.role === 'ProjectManager' && <div className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-800"><p className="text-xs font-bold">مدیریت اعضای داخلی و انتقال مدیر پروژه</p><div className="mt-2 flex flex-col gap-2 sm:flex-row"><select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-xs dark:border-slate-700 dark:bg-slate-900"><option value="">انتخاب عضو فعال سازمان</option>{candidates.filter((candidate) => candidate.id !== details.project.managerUserId).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name || candidate.id}</option>)}</select><button type="button" disabled={isBusy || !selectedUserId} onClick={addExecution} className="inline-flex items-center justify-center gap-1 rounded-xl border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-700"><UserPlus className="h-4 w-4" />افزودن اجرایی</button><button type="button" disabled={isBusy || !selectedUserId} onClick={transferManager} className="inline-flex items-center justify-center gap-1 rounded-xl border border-amber-200 px-3 py-2 text-xs font-bold text-amber-700"><ArrowRightLeft className="h-4 w-4" />انتقال مدیریت</button></div></div>}
        {(details.role === 'ProjectManager' || details.role === 'ReceivingLead') && invitations.length > 0 && <div className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-800"><p className="text-xs font-bold">Project invitations</p><div className="mt-2 space-y-2">{invitations.map((invitation) => <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[11px] dark:bg-slate-800/70"><span>{invitation.phoneNumber || invitation.email || invitation.id} · {roleLabels[invitation.offeredRole || ''] || invitation.offeredRole}</span><span className="text-slate-500">{invitation.status} · {invitation.deliveryStatus || 'Not sent'}</span><span className="flex gap-2">{invitation.status === 'pending' && <button type="button" onClick={() => void (async () => { const response = await fetch(`/api/projects/${selectedId}/invitations/by-id/${invitation.id}/copy-link`, { method: 'POST' }); const data = await response.json(); if (!response.ok) return showSnackbar({ type: 'error', message: data.error || 'کپی لینک انجام نشد.' }); try { await navigator.clipboard.writeText(data.invitationUrl); showSnackbar({ type: 'success', message: 'لینک دعوت کپی شد.' }); } catch { showSnackbar({ type: 'error', message: 'کپی لینک انجام نشد؛ دوباره تلاش کنید.' }); } })()} className="font-bold text-emerald-600">copy</button>}<button type="button" onClick={() => void mutate(`/api/projects/${selectedId}/invitations/by-id/${invitation.id}/reissue`, 'POST')} className="font-bold text-indigo-600">reissue</button>{invitation.status === 'pending' && <button type="button" onClick={() => void mutate(`/api/projects/${selectedId}/invitations/by-id/${invitation.id}`, 'DELETE')} className="font-bold text-rose-600">cancel</button>}</span></div>)}</div></div>}
      </section>}
    </>}
  </div>;
};
