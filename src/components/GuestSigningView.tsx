import React, { useEffect, useState } from 'react';
import { CheckCircle2, FileSignature, Loader2, ShieldCheck } from 'lucide-react';
import { Meeting } from '../types';

interface GuestSigningViewProps {
  meetingId: string;
  token: string;
}

export const GuestSigningView: React.FC<GuestSigningViewProps> = ({ meetingId, token }) => {
  const [meeting, setMeeting] = useState<Pick<Meeting, 'id' | 'title' | 'persianDate' | 'timeRange' | 'location' | 'status' | 'statusLabel' | 'organizer' | 'agenda' | 'discussion' | 'decisions' | 'actionItems' | 'signatureCount' | 'totalSignaturesRequired'> | null>(null);
  const [guestEmail, setGuestEmail] = useState('');
  const [name, setName] = useState('');
  const [signature, setSignature] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch(`/api/guest/meetings/${encodeURIComponent(meetingId)}?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'لینک مهمان نامعتبر است.');
        setMeeting(data.meeting);
        setGuestEmail(data.guestEmail || '');
        setName(data.meeting?.organizer?.name === data.guestEmail ? '' : '');
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'بارگذاری جلسه انجام نشد.'))
      .finally(() => setLoading(false));
  }, [meetingId, token]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const response = await fetch('/api/guest/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, meetingId, signerName: name, signatureData: signature, signatureType: 'type' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'ثبت امضا انجام نشد.');
      setSuccess(data.message || 'امضا با موفقیت ثبت شد.');
      setSignature('');
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'ثبت امضا انجام نشد.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500" dir="rtl"><Loader2 className="ml-2 h-5 w-5 animate-spin" />در حال بارگذاری سند...</div>;
  if (!meeting) return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-center text-rose-700" dir="rtl">{error || 'جلسه در دسترس نیست.'}</div>;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900" dir="rtl">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="rounded-3xl bg-gradient-to-l from-indigo-700 to-purple-700 p-7 text-white shadow-xl">
          <div className="mb-4 flex items-center gap-3"><ShieldCheck className="h-8 w-8" /><span className="text-sm font-semibold">دسترسی مهمان به صورت‌جلسه</span></div>
          <h1 className="text-2xl font-black">{meeting.title}</h1>
          <p className="mt-2 text-sm text-indigo-100">{meeting.persianDate} · {meeting.timeRange} · {meeting.location}</p>
        </header>
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold">خلاصه سند</h2><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{meeting.signatureCount} از {meeting.totalSignaturesRequired} امضا</span></div>
          <p className="whitespace-pre-wrap text-sm leading-8 text-slate-600">{meeting.discussion}</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2"><div><h3 className="font-bold">دستور جلسه</h3><ul className="mt-2 space-y-1 text-sm text-slate-600">{meeting.agenda.map((item) => <li key={item.id}>• {item.text}</li>)}</ul></div><div><h3 className="font-bold">مصوبات</h3><ul className="mt-2 space-y-1 text-sm text-slate-600">{meeting.decisions.map((item) => <li key={item.id}>• {item.text}</li>)}</ul></div></div>
        </section>
        {success ? <section className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800"><CheckCircle2 className="h-6 w-6" />{success}</section> : meeting.status === 'SEALED' || meeting.status === 'ARCHIVED' ? <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800">این سند نهایی شده و دیگر امکان امضای مهمان ندارد.</section> : <form onSubmit={submit} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-2"><FileSignature className="h-5 w-5 text-indigo-600" /><h2 className="font-bold">ثبت امضای مهمان</h2></div><p className="text-xs text-slate-500">لینک امضا برای {guestEmail} صادر شده است و پس از ثبت، یک‌بار مصرف خواهد بود.</p><input required minLength={2} value={name} onChange={(event) => setName(event.target.value)} placeholder="نام و نام خانوادگی" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm" /><input required minLength={2} value={signature} onChange={(event) => setSignature(event.target.value)} placeholder="نام خود را به‌عنوان امضای الکترونیکی وارد کنید" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm" />{error && <p className="text-sm text-rose-600">{error}</p>}<button disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white disabled:opacity-50">{submitting && <Loader2 className="h-4 w-4 animate-spin" />}ثبت امضای رسمی</button></form>}
      </div>
    </main>
  );
};
