import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from './EmptyState';
import { Bell, CalendarDays, CheckCheck, FileSignature, Info, X } from 'lucide-react';
import { Skeleton } from './LoadingState';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type?: 'system' | 'signature' | 'review' | 'meeting';
  createdAt: string;
  readAt?: string;
  meetingId?: string;
}

const hasLatinText = (value: string) => /[A-Za-z]/.test(value);

const getLocalizedNotification = (item: NotificationItem) => {
  if (item.type === 'meeting' && (hasLatinText(item.title) || hasLatinText(item.message))) {
    const titleMatch = item.message.match(/^Meeting "(.+)" was created as a draft\.$/i);
    return {
      ...item,
      title: 'جلسه جدید ایجاد شد',
      message: titleMatch ? `جلسه «${titleMatch[1]}» به‌صورت پیش‌نویس ایجاد شد.` : 'یک جلسه جدید برای شما ایجاد شده است.',
    };
  }

  if (item.type === 'signature' && hasLatinText(item.title + item.message)) {
    return { ...item, title: 'نیاز به امضای شما', message: 'یک صورت‌جلسه در انتظار امضای شماست.' };
  }

  if (hasLatinText(item.title + item.message)) {
    return { ...item, title: 'اعلان جدید', message: 'یک رویداد جدید برای شما ثبت شده است.' };
  }

  return item;
};

interface Props { isOpen: boolean; onClose: () => void; }

export const NotificationPanel: React.FC<Props> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    setItems([]);
    setLoading(true);
    fetch('/api/notifications', { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Unable to load notifications')))
      .then((data) => setItems(data.notifications || []))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setItems([]);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [isOpen]);

  const markAllRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' });
    setItems((current) => current.map((item) => ({ ...item, readAt: new Date().toISOString() })));
  };
  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    setItems((current) => current.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item));
  };

  return (
    <AnimatePresence>
      {isOpen && <motion.div className="fixed inset-0 z-50" role="dialog" aria-label="اعلان‌ها" dir="rtl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
      <motion.button className="absolute inset-0 bg-slate-950/30 backdrop-blur-[2px]" onClick={onClose} aria-label="Close notifications" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.section layout className="absolute left-5 top-24 w-[min(400px,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-white/80 bg-white/95 p-4 shadow-2xl shadow-slate-900/15 backdrop-blur-2xl dark:border-slate-700/80 dark:bg-slate-900/95 dark:shadow-black/30" initial={{ opacity: 0, x: -18, y: -8, scale: 0.96 }} animate={{ opacity: 1, x: 0, y: 0, scale: 1 }} exit={{ opacity: 0, x: -12, y: -5, scale: 0.97 }} transition={{ type: 'spring', stiffness: 360, damping: 28, mass: 0.7, layout: { type: 'spring', stiffness: 300, damping: 30 } }}>
        <header className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2.5"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm dark:bg-indigo-950/60 dark:text-indigo-300"><Bell className="h-4 w-4" /></span><div><h2 className="text-sm font-bold text-slate-900 dark:text-white">اعلان‌ها</h2><p className="mt-0.5 text-[10px] text-slate-400">آخرین رویدادهای سازمان</p></div></div>
          <div className="flex items-center gap-1"><button onClick={markAllRead} className="rounded-xl p-2 text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-800" title="خواندن همه اعلان‌ها" aria-label="خواندن همه اعلان‌ها"><CheckCheck className="h-4 w-4" /></button><button onClick={onClose} className="rounded-xl p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-slate-800" title="بستن" aria-label="بستن"><X className="h-4 w-4" /></button></div>
        </header>
        <div className="max-h-96 overflow-y-auto py-2">
          {loading && <div className="space-y-2 p-1" aria-label="در حال بارگذاری اعلان‌ها">{Array.from({ length: 4 }, (_, index) => <div key={index} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/30"><Skeleton className="h-9 w-9 shrink-0 rounded-xl" /><div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-3 w-2/3" /><Skeleton className="h-3 w-full" /><Skeleton className="h-2 w-1/3" /></div></div>)}</div>}
          {!loading && items.length === 0 && <EmptyState compact title="اعلان جدیدی وجود ندارد" description="وقتی رویداد مهمی برای شما ثبت شود، اینجا نمایش داده می‌شود." />}
          {!loading && <AnimatePresence initial={false} mode="popLayout">
            {items.map((rawItem, index) => { const item = getLocalizedNotification(rawItem); const Icon = item.type === 'meeting' ? CalendarDays : item.type === 'signature' ? FileSignature : Info; return <motion.button layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 18, transition: { duration: 0.2 } }} transition={{ delay: index * 0.045 }} key={item.id} onClick={() => { void markRead(item.id); if (item.meetingId) { navigate(`/meetings/${item.meetingId}`); onClose(); } }} className={`notification-item mb-2 block w-full rounded-2xl border p-3 text-right transition-all ${item.readAt ? 'notification-item-read border-slate-100 bg-white/70 dark:border-slate-800 dark:bg-slate-900/40' : 'notification-item-unread border-indigo-100 bg-indigo-50/60 shadow-sm shadow-indigo-500/5 dark:border-indigo-900/60 dark:bg-indigo-950/20'}`}><div className="flex items-start gap-3"><span className={`notification-item-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.readAt ? 'bg-slate-100 text-slate-400 dark:bg-slate-800' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-300'}`}><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-3"><p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{item.title}</p>{!item.readAt && <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-500" aria-label="خوانده نشده" />}</span><p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{item.message}</p><time className="mt-2 block text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleString('fa-IR')}</time></span></div></motion.button>; })}
          </AnimatePresence>}
        </div>
      </motion.section>
      </motion.div>}
    </AnimatePresence>
  );
};
