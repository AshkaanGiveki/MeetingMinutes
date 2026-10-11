import React, { useEffect, useState } from 'react';
import { Building2, Check, ChevronLeft, Inbox, Loader2, Plus, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useSnackbar } from './Snackbar';

interface Invitation {
  token: string;
  organizationId: string;
  organizationName?: string;
  role: string;
  expiresAt: number;
}

interface SessionUser {
  organizationId?: string;
  organizationName?: string;
  role?: string;
  permissions?: string[];
}

interface OrganizationOnboardingProps {
  name: string;
  onOrganizationReady: (user: SessionUser) => void;
}

export const OrganizationOnboarding: React.FC<OrganizationOnboardingProps> = ({ name, onOrganizationReady }) => {
  const { showSnackbar } = useSnackbar();
  const [organizationName, setOrganizationName] = useState('');
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadInvitations = async () => {
      try {
        const response = await fetch('/api/organizations/invitations');
        const data = await response.json();
        if (!cancelled && response.ok) setInvitations(data.invitations || []);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void loadInvitations();
    return () => { cancelled = true; };
  }, []);

  const createOrganization = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!organizationName.trim()) return;
    setIsBusy(true);
    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: organizationName.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'ایجاد سازمان انجام نشد.');
      showSnackbar({ type: 'success', message: 'سازمان شما ایجاد شد.', position: 'bottom-center' });
      onOrganizationReady(data.user);
    } catch (error) {
      showSnackbar({ type: 'error', message: error instanceof Error ? error.message : 'ایجاد سازمان انجام نشد.', position: 'bottom-center' });
    } finally {
      setIsBusy(false);
    }
  };

  const acceptInvitation = async (token: string) => {
    setIsBusy(true);
    try {
      const response = await fetch(`/api/organizations/invitations/${token}/accept`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'پذیرش دعوت‌نامه انجام نشد.');
      showSnackbar({ type: 'success', message: 'عضویت شما در سازمان پذیرفته شد.', position: 'bottom-center' });
      onOrganizationReady(data.user);
    } catch (error) {
      showSnackbar({ type: 'error', message: error instanceof Error ? error.message : 'پذیرش دعوت‌نامه انجام نشد.', position: 'bottom-center' });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center overflow-hidden bg-[#f4f7fb] px-4 py-8 text-slate-900 dark:bg-[#080d1d] dark:text-white">
      <div className="pointer-events-none fixed -right-32 -top-32 h-96 w-96 rounded-full bg-indigo-400/15 blur-3xl dark:bg-indigo-500/10" />
      <div className="pointer-events-none fixed -bottom-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-500/10" />
      <motion.section
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="relative w-full max-w-2xl rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/85 dark:shadow-black/30 sm:p-9"
      >
        <div className="mb-8 flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-600/25"><Sparkles className="h-7 w-7" /></div>
          <div>
            <p className="mb-1 text-xs font-bold text-indigo-600 dark:text-indigo-300">تقریباً آماده‌اید</p>
            <h1 className="text-2xl font-black tracking-tight">فضای کاری خود را انتخاب کنید</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{name || 'کاربر عزیز'}، برای شروع در یک سازمان عضو شوید یا سازمان خودتان را بسازید.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <form onSubmit={createOrganization} className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5 dark:border-indigo-900/60 dark:bg-indigo-950/25">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white"><Building2 className="h-5 w-5" /></div>
            <h2 className="font-bold">ایجاد سازمان جدید</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">یک فضای کاری برای تیم، جلسات و صورت‌جلسه‌های خود بسازید.</p>
            <input value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} placeholder="نام سازمان" className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-900/80" />
            <button disabled={isBusy || !organizationName.trim()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4" />ایجاد سازمان</button>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-800/40">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"><Inbox className="h-5 w-5" /></div>
            <h2 className="font-bold">دعوت‌نامه‌های شما</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">اگر به سازمانی دعوت شده‌اید، از اینجا عضویت خود را فعال کنید.</p>
            <div className="mt-4 space-y-2">
              {isLoading ? <div className="flex items-center gap-2 py-3 text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />در حال بررسی دعوت‌نامه‌ها…</div> : invitations.length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500 dark:border-slate-700">در حال حاضر دعوت‌نامه‌ای ندارید.</p> : invitations.map((invitation) => (
                <div key={invitation.token} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/70">
                  <div className="min-w-0"><p className="truncate text-sm font-bold">{invitation.organizationName || 'سازمان دعوت‌کننده'}</p><p className="mt-1 text-[11px] text-slate-500">نقش: {invitation.role}</p></div>
                  <button type="button" disabled={isBusy} onClick={() => void acceptInvitation(invitation.token)} className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"><Check className="h-3.5 w-3.5" />پذیرش</button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400"><ChevronLeft className="h-3.5 w-3.5" />هر زمان بخواهید می‌توانید سازمان‌های بیشتری اضافه کنید.</div>
      </motion.section>
    </main>
  );
};
