import React, { useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { Calendar, ChevronLeft, FileText, FolderArchive, Home, Layers, Search, Settings, Sparkles, Users, Building2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import moonIcon from '../assets/icons/moon.png';
import notificationIcon from '../assets/icons/notification.png';
import sunIcon from '../assets/icons/sun.png';

interface TopBarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  meetingDetail?: { id: string; title?: string };
  onOpenMeeting?: (meetingId: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenSearch: () => void;
  unreadCount?: number;
  onOpenNotifications?: () => void;
  onOpenRoughNotes?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentTab,
  onTabChange,
  meetingDetail,
  onOpenMeeting,
  isDark,
  onToggleTheme,
  onOpenSearch,
  unreadCount = 0,
  onOpenNotifications,
  onOpenRoughNotes,
}) => {
  const breadcrumbItems = [
    { id: 'meetings', label: 'جلسات جاری', icon: Calendar },
    { id: 'archive', label: 'آرشیو اسناد پلمپ', icon: FolderArchive },
    { id: 'templates', label: 'قالب‌های صورت‌جلسه', icon: Layers },
    { id: 'contacts', label: 'اعضا و امضاکنندگان', icon: Users },
    { id: 'settings', label: 'تنظیمات و امنیت', icon: Settings },
    { id: 'organizations', label: 'سازمان‌های من', icon: Building2 },
  ];
  const currentBreadcrumb = breadcrumbItems.find((item) => item.id === currentTab) || breadcrumbItems[0];
  const CurrentBreadcrumbIcon = currentBreadcrumb.icon;
  const isMeetingDetail = Boolean(meetingDetail);
  const detailLabel = meetingDetail?.title?.trim() || meetingDetail?.id || 'صورت‌جلسه';
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
        <button onClick={onOpenRoughNotes} className="ai-notes-button group hidden items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-bold shadow-sm sm:flex" title="تبدیل یادداشت‌های خام به صورت‌جلسه با هوش مصنوعی">
          <span className="ai-notes-icon flex h-5 w-5 items-center justify-center transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span>دستیار هوشمند صورت‌جلسه</span>
        </button>
      )}
      <button onClick={onOpenNotifications} className="notification-button relative flex h-9 w-9 items-center justify-center p-1" title="اعلان‌ها" aria-label="اعلان‌ها">
        <img src={notificationIcon} alt="" className="notification-icon" />
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
    <div className="flex min-w-0 items-center gap-2 text-right" dir="rtl">
      <Home className="h-4 w-4 shrink-0 text-indigo-500 dark:text-indigo-300" />
      <button type="button" onClick={() => onTabChange('meetings')} className="text-[11px] font-bold text-slate-400 transition-colors hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-300">فضای کاری</button>
      <ChevronLeft className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600" />
      {isMeetingDetail && (
        <>
          <button type="button" onClick={() => onTabChange('meetings')} className="truncate text-[11px] font-bold text-slate-400 transition-colors hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-300">جلسات جاری</button>
          <ChevronLeft className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600" />
        </>
      )}
      <AnimatePresence initial={false} mode="wait">
        <motion.button
          type="button"
          onClick={() => isMeetingDetail ? onOpenMeeting?.(meetingDetail!.id) : onTabChange(currentBreadcrumb.id)}
          aria-current="page"
          key={isMeetingDetail ? `meeting-${meetingDetail!.id}` : currentBreadcrumb.id}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="flex min-w-0 items-center gap-1.5 text-right transition-colors hover:text-indigo-600 dark:hover:text-indigo-300"
        >
          {isMeetingDetail ? <FileText className="h-4 w-4 shrink-0 text-indigo-500 dark:text-indigo-300" /> : <CurrentBreadcrumbIcon className="h-4 w-4 shrink-0 text-indigo-500 dark:text-indigo-300" />}
          <span className="truncate text-xs font-extrabold tracking-tight text-slate-900 dark:text-white">{isMeetingDetail ? detailLabel : currentBreadcrumb.label}</span>
        </motion.button>
      </AnimatePresence>
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
  const buttonRef = useRef<HTMLLabelElement>(null);
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
    <label
      ref={buttonRef}
      className="theme-switch-button"
      htmlFor="theme-switch"
      title={isDark ? 'حالت روشن' : 'حالت تیره'}
      aria-label={isDark ? 'حالت روشن' : 'حالت تیره'}
    >
      <span className="switch-outer">
        <input id="theme-switch" type="checkbox" checked={isDark} onChange={handleClick} aria-label={isDark ? 'حالت روشن' : 'حالت تیره'} />
        <span className="switch-button-track" aria-hidden="true">
          <span className="button-toggle" />
          <AnimatePresence initial={false} mode="wait">
            <motion.img
              key={isDark ? 'moon' : 'sun'}
              src={isDark ? moonIcon : sunIcon}
              alt=""
              className={`button-indicator ${isDark ? 'button-indicator-left' : 'button-indicator-right'}`}
              initial={{ opacity: 0, scale: 0.5, x: isDark ? -10 : 10, y: '-50%', rotate: isDark ? -55 : 55 }}
              animate={{ opacity: 1, scale: 1, x: 0, y: '-50%', rotate: 0 }}
              exit={{ opacity: 0, scale: 0.5, x: isDark ? 10 : -10, y: '-50%', rotate: isDark ? 55 : -55 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            />
          </AnimatePresence>
        </span>
      </span>
    </label>
  );
};
