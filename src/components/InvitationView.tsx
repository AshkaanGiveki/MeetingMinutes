import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, LoaderCircle, ShieldCheck, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from './Snackbar';

interface InvitationViewProps {
  token: string;
  onAccepted: (user?: { organizationId?: string; role?: string }) => void;
}

export const InvitationView: React.FC<InvitationViewProps> = ({ token, onAccepted }) => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('در حال بررسی و پذیرش دعوت…');
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;
    fetch(`/api/organizations/invitations/${encodeURIComponent(token)}/accept`, { method: 'POST' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'پذیرش دعوت انجام نشد.');
        if (cancelled) return;
        setState('success');
        setMessage('دعوت با موفقیت پذیرفته شد و عضویت شما فعال گردید.');
        onAccepted(data.user);
        showSnackbar({ type: 'success', message: 'عضویت در سازمان با موفقیت انجام شد.' });
      })
      .catch((error) => {
        if (cancelled) return;
        setState('error');
        setMessage(error instanceof Error ? error.message : 'دعوت معتبر نیست یا منقضی شده است.');
      });
    return () => { cancelled = true; };
  }, [onAccepted, showSnackbar, token]);

  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[#f4f7fb] px-4 py-10 text-slate-800 dark:bg-[#0a0e1f] dark:text-slate-100">
      <section className="w-full max-w-md rounded-[2rem] border border-white/80 bg-white/90 p-8 text-center shadow-2xl shadow-slate-900/10 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl ${state === 'success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300' : state === 'error' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300'}`}>
          {state === 'loading' ? <LoaderCircle className="h-7 w-7 animate-spin" /> : state === 'success' ? <CheckCircle2 className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
        </div>
        <h1 className="mt-5 text-lg font-bold">{state === 'success' ? 'دعوت پذیرفته شد' : state === 'error' ? 'پذیرش دعوت ناموفق بود' : 'درخواست عضویت'}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">{message}</p>
        {state === 'success' && <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"><ShieldCheck className="h-4 w-4" />اکنون می‌توانید در جلسه به‌عنوان عضو سازمان مشارکت کنید.</div>}
        <button type="button" onClick={() => navigate(state === 'success' ? '/organizations' : '/meetings')} className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700">{state === 'success' ? 'رفتن به سازمان‌ها' : 'بازگشت به جلسات'}</button>
      </section>
    </main>
  );
};
