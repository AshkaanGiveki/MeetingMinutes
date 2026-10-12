import React, { useState } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import { AnimatedModal } from './AnimatedModal';

interface SigningRejectionModalProps { isOpen: boolean; onClose: () => void; onSubmit: (reason: string) => Promise<void>; }

export const SigningRejectionModal: React.FC<SigningRejectionModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (reason.trim().length < 5) return; setIsSubmitting(true); try { await onSubmit(reason.trim()); setReason(''); onClose(); } finally { setIsSubmitting(false); } };

  return <AnimatedModal isOpen={isOpen} onClose={onClose} zIndexClassName="z-[90]" contentClassName="w-full max-w-md"><form onSubmit={submit} dir="rtl" className="w-full rounded-3xl border border-white/70 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"><div className="mb-5 flex items-start justify-between gap-3"><div><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300"><AlertTriangle className="h-5 w-5" /></div><h2 className="text-lg font-bold text-slate-900 dark:text-white">دلیل عدم امضا</h2><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">دلیل را شفاف بنویسید تا ویرایشگر تصمیم درستی بگیرد.</p></div><button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button></div><textarea autoFocus required minLength={5} rows={5} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="برای امضا نکردن اشکالی وجود دارد…" className="w-full resize-none rounded-2xl border border-rose-200 bg-rose-50/50 p-3 text-sm text-slate-800 outline-none focus:border-rose-500 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-slate-100" /><div className="mt-5 flex gap-2"><button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">انصراف</button><button disabled={isSubmitting || reason.trim().length < 5} type="submit" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Check className="h-4 w-4" />ثبت دلیل</button></div></form></AnimatedModal>;
};
