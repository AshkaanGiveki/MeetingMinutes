import React, { useEffect, useState } from 'react';
import { Check, FileSearch, ShieldAlert, X } from 'lucide-react';
import { PageHeader } from './PageHeader';
import { useSnackbar } from './Snackbar';

type RecoveryDecision = 'approved' | 'rejected' | 'inconclusive' | 'expired';
interface RecoveryRequest { id: string; targetUserId: string; oldPhoneNumber: string; newPhoneNumber: string; newVerified: boolean; oldVerified: boolean; recoveryStatus: string; status: string; createdAt: string; }

export const RecoveryReviewView: React.FC = () => {
  const { showSnackbar } = useSnackbar();
  const [requests, setRequests] = useState<RecoveryRequest[]>([]);
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/mobile-change');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'درخواست‌های بازیابی دریافت نشدند.');
      setRequests((data.requests || []).filter((request: RecoveryRequest) => request.status === 'pending'));
    } catch (error) {
      showSnackbar({ type: 'error', message: error instanceof Error ? error.message : 'درخواست‌های بازیابی دریافت نشدند.' });
    } finally { setIsLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const review = async (id: string, decision: RecoveryDecision) => {
    const evidenceReference = evidence[id]?.trim() || '';
    const reason = reasons[id]?.trim() || '';
    if (!evidenceReference || !reason) {
      showSnackbar({ type: 'warning', message: 'مرجع مدرک و توضیح بررسی را وارد کنید.' });
      return;
    }
    const response = await fetch(`/api/mobile-change/${id}/recovery-review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision, evidenceReference, reason }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return showSnackbar({ type: 'error', message: data.error || 'ثبت نتیجه بررسی انجام نشد.' });
    showSnackbar({ type: 'success', message: 'نتیجه بررسی ثبت شد.' });
    await load();
  };

  return <div className="responsive-page mx-auto max-w-5xl space-y-5 py-6" dir="rtl">
    <PageHeader icon={FileSearch} title="بررسی بازیابی شماره موبایل" description="این بخش فقط برای بررسی مالکیت حساب‌های بدون دسترسی به شماره قبلی است." />
    {isLoading ? <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">در حال بارگذاری درخواست‌ها…</div> : requests.length === 0 ? <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">درخواست بازیابی در انتظاری وجود ندارد.</div> : <div className="space-y-4">{requests.map((request) => <section key={request.id} className="rounded-3xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900/50 dark:bg-amber-950/20"><div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /><div className="min-w-0 flex-1"><h2 className="font-bold text-slate-900 dark:text-white">حساب {request.targetUserId}</h2><p className="mt-2 text-xs text-slate-600 dark:text-slate-300">شماره قبلی: {request.oldPhoneNumber} · شماره جدید: {request.newPhoneNumber}</p><p className="mt-1 text-[11px] text-slate-500">تأیید شماره جدید: {request.newVerified ? 'بله' : 'خیر'} · تأیید شماره قبلی: {request.oldVerified ? 'بله' : 'خیر'}</p><div className="mt-4 grid gap-2 sm:grid-cols-2"><input value={evidence[request.id] || ''} onChange={(event) => setEvidence((current) => ({ ...current, [request.id]: event.target.value }))} placeholder="مرجع مدرک مالکیت" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900" /><input value={reasons[request.id] || ''} onChange={(event) => setReasons((current) => ({ ...current, [request.id]: event.target.value }))} placeholder="توضیح تصمیم بازبین" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900" /></div><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void review(request.id, 'approved')} className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white"><Check className="h-3.5 w-3.5" />تأیید</button><button type="button" onClick={() => void review(request.id, 'rejected')} className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600"><X className="h-3.5 w-3.5" />رد</button><button type="button" onClick={() => void review(request.id, 'inconclusive')} className="rounded-xl border border-amber-300 px-3 py-2 text-xs font-bold text-amber-700">شواهد ناکافی</button><button type="button" onClick={() => void review(request.id, 'expired')} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600">منقضی</button></div></div></div></section>)}</div>}
  </div>;
};
