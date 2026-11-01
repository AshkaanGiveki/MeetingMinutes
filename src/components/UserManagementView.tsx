import React, { useEffect, useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { ContactsView } from './ContactsView';
import { ProjectsView } from './ProjectsView';
import type { MockRoleId, UserManagementScope } from '../mockRoles';

type DemoMember = { id: string; name: string; phone: string; role: string };

const addableRoles: Partial<Record<MockRoleId, string[]>> = {
  SuperAdmin: ['Owner'],
  Owner: ['User'],
  Stakeholder: ['CustomerClerk'],
};
const labels: Record<string, string> = {
  Owner: 'مالک سازمان', User: 'کاربر سازمان', CustomerClerk: 'کاربر مشتری',
};
const sampleMembers: DemoMember[] = [
  { id: 'member-1', name: 'سارا احمدی', phone: '09120000001', role: 'Owner' },
  { id: 'member-2', name: 'مریم کریمی', phone: '09120000003', role: 'User' },
  { id: 'member-3', name: 'امیر صالحی', phone: '09120000006', role: 'CustomerClerk' },
];

interface UserManagementViewProps {
  scope: UserManagementScope;
  mockRoleId?: MockRoleId;
  organizationId?: string;
  organizationName?: string;
  platformRole?: 'SuperAdmin' | 'User';
}

export function UserManagementView({ scope, mockRoleId, organizationId, organizationName, platformRole }: UserManagementViewProps) {
  const [members, setMembers] = useState<DemoMember[]>(sampleMembers);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const choices = mockRoleId ? addableRoles[mockRoleId] || [] : [];
  const [role, setRole] = useState(choices[0] || '');
  const [message, setMessage] = useState('');
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerInviteUrl, setOwnerInviteUrl] = useState('');
  const [ownerSection, setOwnerSection] = useState<'organization' | 'projects'>('organization');

  useEffect(() => {
    if (mockRoleId || platformRole !== 'SuperAdmin') return;
    void fetch('/api/admin/organizations').then((response) => response.ok ? response.json() : Promise.reject()).then((data) => {
      const items = Array.isArray(data.organizations) ? data.organizations : [];
      setOrganizations(items);
      setSelectedOrganizationId((current) => current || items[0]?.id || '');
    }).catch(() => setMessage('فهرست سازمان‌ها دریافت نشد.'));
  }, [mockRoleId, platformRole]);

  const inviteOwner = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    setOwnerInviteUrl('');
    const response = await fetch(`/api/organizations/${selectedOrganizationId}/invitations/copy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phoneNumber: ownerPhone, role: 'Owner' }) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error || 'دعوت مالک سازمان ایجاد نشد.'); return; }
    setOwnerInviteUrl(data.invitationUrl || '');
    setMessage('دعوت مالک سازمان ایجاد شد. لینک را برای او ارسال کنید.');
    setOwnerPhone('');
  };

  if (!mockRoleId) {
    if (platformRole === 'SuperAdmin') return <div className="responsive-page mx-auto max-w-4xl space-y-5 p-6" dir="rtl"><header><h1 className="text-2xl font-black">تعیین مالک سازمان</h1><p className="mt-2 text-xs text-slate-500">ابتدا سازمان را ایجاد کنید، سپس مالک آن را با شماره موبایل دعوت کنید.</p></header><form onSubmit={inviteOwner} className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><label className="min-w-48 flex-1 text-xs font-semibold">سازمان<select required value={selectedOrganizationId} onChange={(event) => setSelectedOrganizationId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm dark:border-slate-700"><option value="">انتخاب سازمان</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></label><label className="min-w-48 flex-1 text-xs font-semibold">شماره موبایل مالک<input required type="tel" inputMode="numeric" value={ownerPhone} onChange={(event) => setOwnerPhone(event.target.value)} placeholder="09121234567" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm dark:border-slate-700" /></label><button disabled={!selectedOrganizationId || !ownerPhone} type="submit" className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">ایجاد دعوت مالک</button></form>{message && <p role="status" className="text-xs text-indigo-600">{message}</p>}{ownerInviteUrl && <a className="break-all text-xs text-indigo-600 underline" href={ownerInviteUrl}>{ownerInviteUrl}</a>}</div>;
    return scope === 'organization'
      ? <div className="mx-auto max-w-6xl" dir="rtl"><div className="flex gap-2 pt-5"><button type="button" aria-pressed={ownerSection === 'organization'} onClick={() => setOwnerSection('organization')} className={`rounded-xl px-4 py-2 text-xs font-bold ${ownerSection === 'organization' ? 'bg-indigo-600 text-white' : 'border border-slate-200'}`}>کاربران سازمان</button><button type="button" aria-pressed={ownerSection === 'projects'} onClick={() => setOwnerSection('projects')} className={`rounded-xl px-4 py-2 text-xs font-bold ${ownerSection === 'projects' ? 'bg-indigo-600 text-white' : 'border border-slate-200'}`}>اعضای پروژه‌ها</button></div>{ownerSection === 'organization' ? <ContactsView isAuthenticated organizationId={organizationId} canManageMembers platformRole={platformRole} /> : <ProjectsView isAuthenticated organizationId={organizationId} organizationName={organizationName} />}</div>
      : <div className="mx-auto max-w-6xl" dir="rtl"><header className="px-2 pt-6"><h1 className="text-xl font-black text-slate-900 dark:text-white">کاربران مشتری</h1><p className="mt-1 text-xs text-slate-500">به عنوان نماینده مشتری، برای پروژه خود کاربر مشتری دعوت کنید.</p></header><ProjectsView isAuthenticated organizationId={organizationId} organizationName={organizationName} /></div>;
  }

  const visibleMembers = members.filter((member) => choices.includes(member.role));
  const addMember = (event: React.FormEvent) => {
    event.preventDefault();
    if (!choices.includes(role) || !name.trim() || !/^09\d{9}$/.test(phone)) {
      setMessage('نام، شماره موبایل ۱۱ رقمی و نقش معتبر را وارد کنید.');
      return;
    }
    setMembers((current) => [{ id: `member-${Date.now()}`, name: name.trim(), phone, role }, ...current]);
    setName('');
    setPhone('');
    setMessage('کاربر نمونه اضافه شد. این تغییر فقط در پیش‌نمایش است.');
  };

  return <div className="responsive-page mx-auto max-w-5xl space-y-5 p-6" dir="rtl">
    <header><div className="flex items-center gap-2 text-indigo-600"><Users className="h-5 w-5" /><span className="text-xs font-bold">{scope === 'organization' ? 'سازمان نمونه' : 'پروژه نمونه'}</span></div><h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">مدیریت کاربران</h1><p className="mt-2 text-xs text-slate-500">نقش‌های قابل افزودن: {choices.map((choice) => labels[choice]).join('، ')}</p></header>
    <form onSubmit={addMember} className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <label className="min-w-40 flex-1 text-xs font-semibold">نام<input value={name} onChange={(event) => setName(event.target.value)} required className="mt-1.5 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm dark:border-slate-700" /></label>
      <label className="min-w-40 flex-1 text-xs font-semibold">شماره موبایل<input value={phone} onChange={(event) => setPhone(event.target.value)} required type="tel" inputMode="numeric" placeholder="09121234567" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm dark:border-slate-700" /></label>
      <label className="min-w-36 flex-1 text-xs font-semibold">نقش<select value={role} onChange={(event) => setRole(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm dark:border-slate-700">{choices.map((choice) => <option key={choice} value={choice}>{labels[choice]}</option>)}</select></label>
      <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white"><Plus className="h-4 w-4" />افزودن کاربر</button>
    </form>
    {message && <p role="status" className="text-xs text-indigo-600">{message}</p>}
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><h2 className="border-b border-slate-100 px-4 py-3 text-sm font-bold dark:border-slate-800">اعضا ({visibleMembers.length})</h2><div className="divide-y divide-slate-100 dark:divide-slate-800">{visibleMembers.map((member) => <div key={member.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs"><span className="font-bold">{member.name}</span><span dir="ltr" className="text-slate-500">{member.phone}</span><span className="rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-800">{labels[member.role]}</span></div>)}</div></section>
  </div>;
}
