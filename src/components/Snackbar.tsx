import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from 'lucide-react';

export type SnackbarType = 'success' | 'error' | 'warning' | 'info' | 'loading';
export type SnackbarPosition = 'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left' | 'bottom-center';

export interface SnackbarOptions {
  message: string;
  type?: SnackbarType;
  title?: string;
  duration?: number;
  position?: SnackbarPosition;
}

interface SnackbarItem extends Required<Pick<SnackbarOptions, 'message' | 'type' | 'position'>> {
  id: string;
  title?: string;
  duration: number;
}

interface SnackbarContextValue {
  showSnackbar: (options: SnackbarOptions) => string;
  closeSnackbar: (id: string) => void;
  clearSnackbars: () => void;
}

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

const defaultDuration: Record<SnackbarType, number> = {
  success: 3200,
  info: 3600,
  warning: 4400,
  error: 5200,
  loading: 0,
};

const positionClasses: Record<SnackbarPosition, string> = {
  'top-right': 'right-4 top-4 sm:right-6 sm:top-6',
  'top-left': 'left-4 top-4 sm:left-6 sm:top-6',
  'top-center': 'left-1/2 top-4 -translate-x-1/2 sm:top-6',
  'bottom-right': 'bottom-4 right-4 sm:bottom-6 sm:right-6',
  'bottom-left': 'bottom-4 left-4 sm:bottom-6 sm:left-6',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 sm:bottom-6',
};

type SnackbarMotionPreset = {
  initial: { opacity: number; x: number; y: number; scale: number; filter: string };
  animate: { opacity: number; x: number; y: number; scale: number; filter: string };
  exit: { opacity: number; x: number; y: number; scale: number; filter: string };
  origin: string;
};

const motionPresets: Record<SnackbarPosition, SnackbarMotionPreset> = {
  'top-right': {
    initial: { opacity: 0, x: 76, y: -18, scale: 0.86, filter: 'blur(16px)' },
    animate: { opacity: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)' },
    exit: { opacity: 0, x: 76, y: -18, scale: 0.86, filter: 'blur(16px)' },
    origin: 'top right',
  },
  'top-left': {
    initial: { opacity: 0, x: -76, y: -18, scale: 0.86, filter: 'blur(16px)' },
    animate: { opacity: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)' },
    exit: { opacity: 0, x: -76, y: -18, scale: 0.86, filter: 'blur(16px)' },
    origin: 'top left',
  },
  'top-center': {
    initial: { opacity: 0, x: 0, y: -64, scale: 0.86, filter: 'blur(16px)' },
    animate: { opacity: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)' },
    exit: { opacity: 0, x: 0, y: -64, scale: 0.86, filter: 'blur(16px)' },
    origin: 'top center',
  },
  'bottom-right': {
    initial: { opacity: 0, x: 76, y: 18, scale: 0.86, filter: 'blur(16px)' },
    animate: { opacity: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)' },
    exit: { opacity: 0, x: 76, y: 18, scale: 0.86, filter: 'blur(16px)' },
    origin: 'bottom right',
  },
  'bottom-left': {
    initial: { opacity: 0, x: -76, y: 18, scale: 0.86, filter: 'blur(16px)' },
    animate: { opacity: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)' },
    exit: { opacity: 0, x: -76, y: 18, scale: 0.86, filter: 'blur(16px)' },
    origin: 'bottom left',
  },
  'bottom-center': {
    initial: { opacity: 0, x: 0, y: 64, scale: 0.86, filter: 'blur(16px)' },
    animate: { opacity: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)' },
    exit: { opacity: 0, x: 0, y: 64, scale: 0.86, filter: 'blur(16px)' },
    origin: 'bottom center',
  },
};

const toneClasses: Record<SnackbarType, { card: string; icon: string; progress: string }> = {
  success: {
    card: 'border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-teal-50 text-emerald-950 shadow-emerald-900/10 dark:border-emerald-800/70 dark:from-emerald-950/90 dark:via-slate-900 dark:to-teal-950/80 dark:text-emerald-50',
    icon: 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300',
    progress: 'bg-gradient-to-r from-emerald-500 to-teal-400',
  },
  error: {
    card: 'border-rose-200/80 bg-gradient-to-br from-rose-50 via-white to-orange-50 text-rose-950 shadow-rose-900/10 dark:border-rose-800/70 dark:from-rose-950/90 dark:via-slate-900 dark:to-orange-950/70 dark:text-rose-50',
    icon: 'bg-rose-500/15 text-rose-600 dark:bg-rose-400/15 dark:text-rose-300',
    progress: 'bg-gradient-to-r from-rose-500 to-orange-400',
  },
  warning: {
    card: 'border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-yellow-50 text-amber-950 shadow-amber-900/10 dark:border-amber-800/70 dark:from-amber-950/90 dark:via-slate-900 dark:to-yellow-950/70 dark:text-amber-50',
    icon: 'bg-amber-500/15 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300',
    progress: 'bg-gradient-to-r from-amber-500 to-yellow-400',
  },
  info: {
    card: 'border-sky-200/80 bg-gradient-to-br from-sky-50 via-white to-indigo-50 text-sky-950 shadow-sky-900/10 dark:border-sky-800/70 dark:from-sky-950/90 dark:via-slate-900 dark:to-indigo-950/80 dark:text-sky-50',
    icon: 'bg-sky-500/15 text-sky-600 dark:bg-sky-400/15 dark:text-sky-300',
    progress: 'bg-gradient-to-r from-sky-500 to-indigo-400',
  },
  loading: {
    card: 'border-indigo-200/80 bg-gradient-to-br from-indigo-50 via-white to-violet-50 text-indigo-950 shadow-indigo-900/10 dark:border-indigo-800/70 dark:from-indigo-950/90 dark:via-slate-900 dark:to-violet-950/80 dark:text-indigo-50',
    icon: 'bg-indigo-500/15 text-indigo-600 dark:bg-indigo-400/15 dark:text-indigo-300',
    progress: 'bg-gradient-to-r from-indigo-500 to-violet-400',
  },
};

const icons: Record<SnackbarType, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  loading: Loader2,
};

const labels: Record<SnackbarType, string> = {
  success: 'موفق',
  error: 'خطا',
  warning: 'هشدار',
  info: 'اطلاع',
  loading: 'در حال انجام',
};

function SnackbarCard({ item, onClose }: { item: SnackbarItem; onClose: (id: string) => void }) {
  const Icon = icons[item.type];
  const tone = toneClasses[item.type];
  const motionPreset = motionPresets[item.position];

  return (
    <motion.div
      layout
      role={item.type === 'error' || item.type === 'warning' ? 'alert' : 'status'}
      initial={motionPreset.initial}
      animate={motionPreset.animate}
      exit={motionPreset.exit}
      transition={{ type: 'spring', stiffness: 360, damping: 27, mass: 0.82 }}
      style={{ transformOrigin: motionPreset.origin }}
      className={`pointer-events-auto relative w-[min(calc(100vw-2rem),27rem)] overflow-hidden rounded-2xl border p-3.5 shadow-xl backdrop-blur-xl ${tone.card}`}
      dir="rtl"
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone.icon}`}>
          <Icon className={`h-[18px] w-[18px] ${item.type === 'loading' ? 'animate-spin' : ''}`} />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] opacity-60">{item.title || labels[item.type]}</p>
          <p className="mt-1 text-sm font-semibold leading-6">{item.message}</p>
        </div>
        <button type="button" onClick={() => onClose(item.id)} className="rounded-lg p-1 text-current/50 transition hover:bg-black/5 hover:text-current dark:hover:bg-white/10" aria-label="بستن پیام">
          <X className="h-4 w-4" />
        </button>
      </div>
      {item.duration > 0 && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-black/5 dark:bg-white/10" aria-hidden="true">
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: item.duration / 1000, ease: 'linear' }}
            className={`h-full origin-right ${tone.progress}`}
          />
        </div>
      )}
    </motion.div>
  );
}

export const SnackbarProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [items, setItems] = useState<SnackbarItem[]>([]);
  const timers = useRef(new Map<string, number>());

  const closeSnackbar = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const showSnackbar = useCallback((options: SnackbarOptions) => {
    const type = options.type || 'info';
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const duration = options.duration ?? defaultDuration[type];
    const item: SnackbarItem = { id, message: options.message, title: options.title, type, duration, position: options.position || 'bottom-center' };
    setItems((current) => [...current.slice(-4), item]);
    if (duration > 0) timers.current.set(id, window.setTimeout(() => closeSnackbar(id), duration));
    return id;
  }, [closeSnackbar]);

  const clearSnackbars = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current.clear();
    setItems([]);
  }, []);

  useEffect(() => () => clearSnackbars(), [clearSnackbars]);

  const value = useMemo(() => ({ showSnackbar, closeSnackbar, clearSnackbars }), [showSnackbar, closeSnackbar, clearSnackbars]);
  const positions = Object.keys(positionClasses) as SnackbarPosition[];

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      {positions.map((position) => (
        <div key={position} className={`pointer-events-none fixed z-[100] flex max-h-[calc(100vh-2rem)] flex-col gap-3 ${positionClasses[position]}`}>
          <AnimatePresence initial={false} mode="popLayout">
            {items.filter((item) => item.position === position).map((item) => <SnackbarCard key={item.id} item={item} onClose={closeSnackbar} />)}
          </AnimatePresence>
        </div>
      ))}
    </SnackbarContext.Provider>
  );
};

export function useSnackbar() {
  const context = useContext(SnackbarContext);
  if (!context) throw new Error('useSnackbar must be used inside SnackbarProvider');
  return context;
}
