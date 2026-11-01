import React, { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { ContactsView } from './ContactsView';
import { ProjectsView } from './ProjectsView';
import type { MockRoleId, UserManagementScope } from '../mockRoles';

type DemoMember = { id: string; name: string; phone: string; role: string };

const addableRoles: Partial<Record<MockRoleId, string[]>> = {
  SuperAdmin: ['OrganizationAdmin', 'InternalMember', 'ProjectManager'],
  Owner: ['InternalMember', 'ProjectManager'],
  Admin: ['InternalMember', 'ProjectManager'],
  ProjectManager: ['ExecutionMember', 'ReceivingLead', 'ReceivingMember'],
  ReceivingLead: ['ReceivingMember'],
};
const labels: Record<string, string> = {
  OrganizationAdmin: 'مدیر سازمان', InternalMember: 'عضو داخلی', ProjectManager: 'مدیر پروژه',
  ExecutionMember: 'عضو اجرایی', ReceivingLead: 'سرپرست دریافت', ReceivingMember: 'عضو دریافت',
};
const sampleMembers: DemoMember[] = [
  { id: 'member-1', name: 'سارا احمدی', phone: '09120000001', role: 'OrganizationAdmin' },
  { id: 'member-2', name: 'علی رضایی', phone: '09120000002', role: 'ProjectManager' },
  { id: 'member-3', name: 'مریم کریمی', phone: '09120000003', role: 'InternalMember' },
  { id: 'member-4', name: 'رضا محمدی', phone: '09120000004', role: 'ExecutionMember' },
  { id: 'member-5', name: 'نگار حسینی', phone: '09120000005', role: 'ReceivingLead' },
  { id: 'member-6', name: 'امیر صالحی', phone: '09120000006', role: 'ReceivingMember' },
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

  if (!mockRoleId) {
    return scope === 'organization'
      ? <ContactsView isAuthenticated organizationId={organizationId} canManageMembers canAppointOrganizationAdmin={platformRole === 'SuperAdmin'} platformRole={platformRole} />
      : <div className="mx-auto max-w-6xl" dir="rtl"><header className="px-2 pt-6"><h1 className="text-xl font-black text-slate-900 dark:text-white">مدیریت کاربران پروژه</h1><p className="mt-1 text-xs text-slate-500">از پروژه‌هایی که نقش مدیریت یا سرپرست دریافت دارید، عضو اضافه کنید.</p></header><ProjectsView isAuthenticated organizationId={organizationId} organizationName={organizationName} /></div>;
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
