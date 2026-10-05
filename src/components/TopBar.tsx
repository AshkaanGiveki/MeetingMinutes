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
  <header className="h-[4.5rem] px-0" dir="ltr">
    <div className="grid h-full grid-cols-[1fr_minmax(220px,520px)_1fr] items-center gap-3">
      <div className="flex items-center justify-start gap-2 pl-[30px]" dir="rtl">
      {onOpenRoughNotes && (
        <button onClick={onOpenRoughNotes} className="hidden sm:flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60 text-xs font-semibold cursor-pointer shadow-xs transition-all">
          <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          <span>تبدیل یادداشت خام با هوش مصنوعی</span>
        </button>
      )}
      <button onClick={onOpenNotifications} className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800 transition-colors cursor-pointer" title="اعلان‌ها" aria-label="اعلان‌ها">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900">{unreadCount}</span>}
      </button>
      <ThemeToggleButton isDark={isDark} onToggleTheme={onToggleTheme} />
    </div>
    <div className="w-full max-w-xl justify-self-center">
      <button onClick={onOpenSearch} className="group [&>kbd:last-child]:hidden flex h-11 w-full items-center rounded-2xl border border-slate-200/80 bg-white/90 px-4 text-right shadow-sm shadow-slate-200/30 transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700/80 dark:bg-slate-800/90 dark:shadow-black/10 dark:hover:border-indigo-600" dir="ltr" aria-label="جستجو">
        <kbd className="ml-5 hidden min-w-[4.5rem] items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold tracking-tight text-slate-500 shadow-sm sm:inline-flex dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">Win + K</kbd>
        <div className="flex items-center gap-2.5 text-xs"><Search className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" /><span>جستجو در صورت‌جلسات، مصوبات و اعضا...</span></div>
        <kbd className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-600">⌘ K</kbd>
      </button>
    </div>
    <div className="w-16 justify-self-end" />
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
