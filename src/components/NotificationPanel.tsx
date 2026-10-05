import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from './EmptyState';
import { Bell, CheckCheck, X } from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  readAt?: string;
  meetingId?: string;
}

interface Props { isOpen: boolean; onClose: () => void; }

export const NotificationPanel: React.FC<Props> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch('/api/notifications')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Unable to load notifications')))
      .then((data) => setItems(data.notifications || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;
  const markAllRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' });
    setItems((current) => current.map((item) => ({ ...item, readAt: new Date().toISOString() })));
  };
  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    setItems((current) => current.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item));
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-label="Notifications">
      <button className="absolute inset-0 bg-slate-950/30 backdrop-blur-[2px]" onClick={onClose} aria-label="Close notifications" />
      <section className="absolute left-5 top-24 w-[min(400px,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-white/80 bg-white/95 p-4 shadow-2xl shadow-slate-900/15 backdrop-blur-2xl dark:border-slate-700/80 dark:bg-slate-900/95 dark:shadow-black/30">
        <header className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300"><Bell className="h-4 w-4" /></span><div><h2 className="text-sm font-bold text-slate-900 dark:text-white">اعلان‌ها</h2><p className="mt-0.5 text-[10px] text-slate-400">آخرین رویدادهای سازمان</p></div></div>
          <div className="flex items-center gap-1"><button onClick={markAllRead} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Mark all read"><CheckCheck className="h-4 w-4" /></button><button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Close"><X className="h-4 w-4" /></button></div>
        </header>
        <div className="max-h-96 overflow-y-auto py-2">
          {loading && <p className="p-4 text-sm text-slate-500">Loading…</p>}
          {!loading && items.length === 0 && <EmptyState compact title="اعلان جدیدی وجود ندارد" description="وقتی رویداد مهمی برای شما ثبت شود، اینجا نمایش داده می‌شود." />}
          {items.map((item, index) => <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.045 }} key={item.id} onClick={() => { void markRead(item.id); if (item.meetingId) { navigate(`/meetings/${item.meetingId}`); onClose(); } }} className={`mb-1 block w-full rounded-2xl border p-3 text-right transition-all hover:-translate-y-0.5 hover:shadow-sm dark:hover:bg-slate-800 ${item.readAt ? 'border-transparent opacity-60' : 'border-indigo-100 bg-indigo-50/60 dark:border-indigo-900/60 dark:bg-indigo-950/20'}`}><div className="flex items-start gap-3"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.readAt ? 'bg-slate-300' : 'bg-indigo-500'}`} /><span className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.title}</p><p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{item.message}</p><time className="mt-2 block text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleString('fa-IR')}</time></span></div></motion.button>)}
        </div>
      </section>
    </div>
  );
};
