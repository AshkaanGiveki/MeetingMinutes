import React, { useEffect, useState } from 'react';
import { Building2, Check, ChevronDown, MailPlus, Plus, RefreshCw, X } from 'lucide-react';

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

  const load = async () => {
    const [orgResponse, invitationResponse] = await Promise.all([fetch('/api/organizations'), fetch('/api/organizations/invitations')]);
    const orgData = await orgResponse.json();
    const invitationData = await invitationResponse.json();
    setOrganizations(orgData.organizations || []);
    setInvitations(invitationData.invitations || []);
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
      <div className="grid gap-4 md:grid-cols-2">
        {organizations.map((item) => <div key={item.organization.id} className={`rounded-2xl border p-5 ${item.organization.id === activeOrganizationId ? 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
          <div className="flex items-start justify-between"><div className="flex items-center gap-3"><div className="rounded-xl bg-indigo-100 p-2 text-indigo-600"><Building2 className="h-5 w-5" /></div><div><h2 className="font-bold text-slate-900 dark:text-white">{item.organization.name}</h2><p className="text-xs text-slate-500">{item.memberCount} عضو · {item.membership.role}</p></div></div>{item.organization.id === activeOrganizationId && <Check className="h-5 w-5 text-emerald-600" />}</div>
          {item.organization.id !== activeOrganizationId && <button onClick={() => void switchOrganization(item.organization.id)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 py-2 text-sm font-semibold text-indigo-700"><ChevronDown className="h-4 w-4" />فعال‌سازی این سازمان</button>}
          {item.organization.id === activeOrganizationId && item.membership.permissions.includes('members.manage') && <form onSubmit={(event) => void invite(event, item.organization.id)} className="mt-4 space-y-2 border-t border-slate-200 pt-4 dark:border-slate-700"><div className="flex gap-2"><input value={inviteTarget} onChange={(event) => setInviteTarget(event.target.value)} placeholder="شماره تلفن یا ایمیل" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800" /><select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs dark:border-slate-700 dark:bg-slate-800"><option>Participant</option><option>Viewer</option><option>Editor</option><option>Reviewer</option><option>Organizer</option></select></div><button className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2 text-xs font-semibold text-white dark:bg-slate-700"><MailPlus className="h-4 w-4" />دعوت عضو</button></form>}
        </div>)}
      </div>
      {invitations.length > 0 && <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5"><h2 className="mb-3 font-bold text-amber-900">دعوت‌نامه‌های دریافتی</h2><div className="space-y-2">{invitations.map((inv) => <div key={inv.token} className="flex items-center justify-between rounded-xl bg-white p-3"><div><p className="text-sm font-semibold text-slate-800">دعوت به عضویت · {inv.role}</p><p className="text-xs text-slate-500">{inv.email || inv.phoneNumber}</p></div><div className="flex gap-2"><button onClick={() => void respondToInvitation(inv.token, 'accept')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">پذیرش</button><button onClick={() => void respondToInvitation(inv.token, 'reject')} className="rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700"><X className="inline h-3 w-3" /> رد</button></div></div>)}</div></section>}
    </div>
  );
};
