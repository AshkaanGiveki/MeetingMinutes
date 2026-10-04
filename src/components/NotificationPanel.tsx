import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  readAt?: string;
}

interface Props { isOpen: boolean; onClose: () => void; }

export const NotificationPanel: React.FC<Props> = ({ isOpen, onClose }) => {
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
      <button className="absolute inset-0 bg-slate-950/20" onClick={onClose} aria-label="Close notifications" />
      <section className="absolute top-16 left-6 w-[min(380px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <header className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2"><Bell className="h-4 w-4 text-indigo-500" /><h2 className="font-semibold">Notifications</h2></div>
          <div className="flex items-center gap-1"><button onClick={markAllRead} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Mark all read"><CheckCheck className="h-4 w-4" /></button><button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Close"><X className="h-4 w-4" /></button></div>
        </header>
        <div className="max-h-96 overflow-y-auto py-2">
          {loading && <p className="p-4 text-sm text-slate-500">Loading…</p>}
          {!loading && items.length === 0 && <p className="p-4 text-sm text-slate-500">No notifications.</p>}
          {items.map((item) => <button key={item.id} onClick={() => markRead(item.id)} className={`block w-full rounded-xl p-3 text-right hover:bg-slate-50 dark:hover:bg-slate-800 ${item.readAt ? 'opacity-60' : 'bg-indigo-50/60 dark:bg-indigo-950/20'}`}><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{item.message}</p><time className="mt-2 block text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleString()}</time></button>)}
        </div>
      </section>
    </div>
  );
};
