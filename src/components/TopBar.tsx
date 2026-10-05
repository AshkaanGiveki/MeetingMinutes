import React, { useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { Search, Bell, Moon, Sun, Sparkles } from 'lucide-react';

interface TopBarProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenSearch: () => void;
  unreadCount?: number;
  onOpenNotifications?: () => void;
  onOpenRoughNotes?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  isDark,
  onToggleTheme,
  onOpenSearch,
  unreadCount = 0,
  onOpenNotifications,
  onOpenRoughNotes,
}) => {
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpenSearch();
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [onOpenSearch]);

  return (
  <header className="h-[4.5rem] rounded-[22px] border border-slate-200/80 bg-white/95 px-4 shadow-[0_8px_24px_-18px_rgba(15,23,42,0.3)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/95 dark:shadow-black/20 sm:px-5" dir="ltr">
    <div className="flex h-full items-center justify-between gap-4">
      <div className="flex items-center gap-2 pl-2" dir="ltr">
      {onOpenRoughNotes && (
        <button onClick={onOpenRoughNotes} className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2 text-[10px] font-semibold text-slate-500 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:border-emerald-900 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]" />
          <span>امروز · همکاری سازمانی فعال</span>
        </button>
      )}
      <button onClick={onOpenNotifications} className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-500 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/50" title="اعلان‌ها" aria-label="اعلان‌ها">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900">{unreadCount}</span>}
      </button>
      <ThemeToggleButton isDark={isDark} onToggleTheme={onToggleTheme} />
    </div>
    <div className="hidden">
      <button onClick={onOpenSearch} className="group [&>kbd:last-child]:hidden flex h-11 w-full items-center rounded-2xl border border-slate-200/80 bg-white/90 px-4 text-right shadow-sm shadow-slate-200/30 transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700/80 dark:bg-slate-800/90 dark:shadow-black/10 dark:hover:border-indigo-600" dir="ltr" aria-label="جستجو">
        <kbd className="ml-5 hidden min-w-[4.5rem] items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold tracking-tight text-slate-500 shadow-sm sm:inline-flex dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">Win + K</kbd>
        <div className="flex items-center gap-2.5 text-xs"><Search className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" /><span>جستجو در صورت‌جلسات، مصوبات و اعضا...</span></div>
        <kbd className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-600">⌘ K</kbd>
      </button>
    </div>
    <div className="flex items-center gap-3 text-right" dir="rtl">
      <div className="flex flex-col items-end leading-tight">
        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">فضای کاری متامیت</span>
        <span className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">مدیریت جلسات و اسناد</span>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 shadow-sm dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
        <Sparkles className="h-4 w-4" />
      </div>
    </div>
    </div>
  </header>
  );
};

interface ThemeToggleButtonProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({ isDark, onToggleTheme }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const transitionActiveRef = useRef(false);

  const handleClick = () => {
    if (transitionActiveRef.current) return;
    const nextTheme = isDark ? 'light' : 'dark';
    const viewTransitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => { finished: Promise<void> };
    };

    if (!viewTransitionDocument.startViewTransition || !buttonRef.current) {
      onToggleTheme();
      return;
    }

    const bounds = buttonRef.current.getBoundingClientRect();
    const x = bounds.left + bounds.width / 2;
    const y = bounds.top + bounds.height / 2;
    const radius = Math.max(
      Math.hypot(x, y),
      Math.hypot(window.innerWidth - x, y),
      Math.hypot(x, window.innerHeight - y),
      Math.hypot(window.innerWidth - x, window.innerHeight - y),
    );
    const root = document.documentElement;
    root.style.setProperty('--theme-transition-x', `${x}px`);
    root.style.setProperty('--theme-transition-y', `${y}px`);
    root.style.setProperty('--theme-transition-radius', `${radius}px`);
    root.classList.add(`theme-transition-to-${nextTheme}`);

    const cleanup = () => {
      transitionActiveRef.current = false;
      root.classList.remove('theme-transition-to-dark', 'theme-transition-to-light');
      root.style.removeProperty('--theme-transition-x');
      root.style.removeProperty('--theme-transition-y');
      root.style.removeProperty('--theme-transition-radius');
    };

    transitionActiveRef.current = true;
    try {
      const transition = viewTransitionDocument.startViewTransition(() => {
        // React must commit synchronously so the API captures a real new snapshot.
        flushSync(onToggleTheme);
      });
      transition.finished.then(cleanup, cleanup);
    } catch {
      cleanup();
      onToggleTheme();
    }
  };

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800 transition-colors cursor-pointer"
      title={isDark ? 'حالت روشن' : 'حالت تیره'}
      aria-label={isDark ? 'حالت روشن' : 'حالت تیره'}
    >
      {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
    </button>
  );
};
