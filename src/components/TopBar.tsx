import React, { useEffect, useRef } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { Calendar, ChevronLeft, FileText, FileSearch, FolderArchive, Home, Layers, Search, Settings, Sparkles, Users, Building2, FolderKanban, Menu, X, Palette, LogOut } from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import moonIcon from '../assets/icons/moon.png';
import notificationIcon from '../assets/icons/notification.png';
import sunIcon from '../assets/icons/sun.png';
import logoIcon from '../assets/icons/Logo.png';
import wordmarkIcon from '../assets/icons/typo.png';
import { organizationRoleLabel } from '../utils/organization';

interface TopBarProps {
  currentTab: string;
  canManageUsers?: boolean;
  onTabChange: (tab: string) => void;
  meetingDetail?: { id: string; title?: string };
  onOpenMeeting?: (meetingId: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenSearch: () => void;
  unreadCount?: number;
  onOpenNotifications?: () => void;
  onOpenRoughNotes?: () => void;
  onLogout?: () => void;
  contextLabel?: string;
  contextRole?: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentTab,
  canManageUsers = false,
  onTabChange,
  meetingDetail,
  onOpenMeeting,
  isDark,
  onToggleTheme,
  onOpenSearch,
  unreadCount = 0,
  onOpenNotifications,
  onOpenRoughNotes,
  onLogout,
  contextLabel,
  contextRole,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [showMobileWordmark, setShowMobileWordmark] = React.useState(false);
  const breadcrumbItems = [
    { id: 'meetings', label: 'جلسات جاری', icon: Calendar },
    { id: 'archive', label: 'آرشیو اسناد پلمپ', icon: FolderArchive },
    { id: 'templates', label: 'قالب‌های صورت‌جلسه', icon: Layers },
    { id: 'contacts', label: 'اعضا و امضاکنندگان', icon: Users },
    { id: 'user-management', label: 'مدیریت کاربران', icon: Users },
    { id: 'settings', label: 'تنظیمات و امنیت', icon: Settings },
    { id: 'organizations', label: 'سازمان‌های من', icon: Building2 },
    { id: 'projects', label: 'پروژه‌های من', icon: FolderKanban },
    { id: 'recovery', label: 'بررسی بازیابی شماره', icon: FileSearch },
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

  useEffect(() => {
    const logoInterval = window.setInterval(() => {
      setShowMobileWordmark((visible) => !visible);
    }, 5000);

    return () => window.clearInterval(logoInterval);
  }, []);

  const mobileMenuItems = [
    { id: 'meetings', label: 'جلسات جاری', icon: Calendar },
    { id: 'archive', label: 'آرشیو اسناد', icon: FolderArchive },
    { id: 'templates', label: 'قالب‌های صورت‌جلسه', icon: Layers },
    { id: 'contacts', label: 'اعضا و امضاکنندگان', icon: Users },
    ...(canManageUsers ? [{ id: 'user-management', label: 'مدیریت کاربران', icon: Users }] : []),
    { id: 'organizations', label: 'سازمان‌های من', icon: Building2 },
    { id: 'projects', label: 'پروژه‌های من', icon: FolderKanban },
    { id: 'settings', label: 'تنظیمات و امنیت', icon: Settings },
  ];

  const selectMobileTab = (tab: string) => {
    setIsMobileMenuOpen(false);
    onTabChange(tab);
  };

  const mobileMenuBackdrop = isMobileMenuOpen && typeof document !== 'undefined'
    ? createPortal(<motion.button className="mobile-menu-backdrop fixed inset-0 z-[90] bg-slate-950/35 backdrop-blur-[2px] lg:hidden" onClick={() => setIsMobileMenuOpen(false)} aria-label="بستن منو" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />, document.body)
    : null;

  return (
  <header className="relative z-[100] h-[4.5rem] rounded-[22px] border border-slate-200/80 bg-white/95 px-4 shadow-[0_8px_24px_-18px_rgba(15,23,42,0.3)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/95 dark:shadow-black/20 sm:px-5 lg:z-auto" dir="ltr">
    <div className="flex h-full items-center justify-between gap-4">
      <div className="hidden items-center gap-2 pl-2 lg:flex" dir="ltr">
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
        {unreadCount > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">{unreadCount}</span>}
      </button>
      <ThemeToggleButton isDark={isDark} onToggleTheme={onToggleTheme} />
    </div>
    <div className="pointer-events-none absolute inset-0 h-full lg:hidden" dir="rtl">
      <motion.button
        type="button"
        onClick={() => setIsMobileMenuOpen((open) => !open)}
        whileTap={{ scale: 0.88 }}
        animate={{ rotate: isMobileMenuOpen ? 90 : 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 22 }}
        className="mobile-header-action pointer-events-auto absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-2xl text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-300"
        aria-expanded={isMobileMenuOpen}
        aria-controls="mobile-header-menu"
        aria-label={isMobileMenuOpen ? 'بستن منو' : 'باز کردن منو'}
      >
        {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </motion.button>
      <div className="pointer-events-none absolute left-1/2 top-1/2 flex h-10 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-visible">
        <AnimatePresence initial={false} mode="wait">
          {!showMobileWordmark ? (
            <motion.img
              key="mobile-logo"
              src={logoIcon}
              alt="Accord"
              className="absolute h-10 w-10 object-contain"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, rotate: isMobileMenuOpen ? -8 : 0, scale: isMobileMenuOpen ? 1.05 : 1 }}
              exit={{ opacity: 0 }}
              transition={{ opacity: { duration: 0.35 }, rotate: { type: 'spring', stiffness: 380, damping: 24 }, scale: { type: 'spring', stiffness: 380, damping: 24 } }}
            />
          ) : (
            <motion.img
              key="mobile-wordmark"
              src={wordmarkIcon}
              alt="Accord"
              className="absolute h-7 w-auto max-w-24 object-contain"
              initial={{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }}
              animate={{ opacity: 1, clipPath: 'inset(0 0% 0 0)' }}
              exit={{ opacity: 0, clipPath: 'inset(0 0 0 100%)' }}
              transition={{ opacity: { duration: 0.25 }, clipPath: { duration: 0.85, ease: [0.22, 1, 0.36, 1] } }}
            />
          )}
        </AnimatePresence>
      </div>
      <button onClick={onOpenNotifications} className="notification-button pointer-events-auto absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-2xl p-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800" title="اعلان‌ها" aria-label="اعلان‌ها">
        <img src={notificationIcon} alt="" className="notification-icon" />
        {unreadCount > 0 && <span className="absolute left-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">{unreadCount}</span>}
      </button>
    </div>
    <AnimatePresence>
      {isMobileMenuOpen && <>
        <motion.button className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[2px] lg:hidden" onClick={() => setIsMobileMenuOpen(false)} aria-label="بستن منو" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
        <motion.div id="mobile-header-menu" className="mobile-header-menu absolute inset-x-2 top-[calc(100%+0.7rem)] z-50 overflow-hidden rounded-[1.7rem] border border-white/80 bg-white/95 p-3 text-right shadow-[0_24px_70px_-25px_rgba(15,23,42,0.6)] backdrop-blur-2xl dark:border-slate-700/80 dark:bg-slate-900/95 dark:shadow-black/50" dir="rtl" initial={{ opacity: 0, y: -12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }} transition={{ type: 'spring', stiffness: 380, damping: 28 }}>
          <div className="relative mb-2 flex items-center justify-between border-b border-slate-100 px-2 pb-3 dark:border-slate-800">
            <div><p className="text-sm font-extrabold text-slate-900 dark:text-white">منوی اکورد</p><p className="mt-0.5 text-[10px] text-slate-400">دسترسی سریع به همه بخش‌ها</p></div>
            <motion.button type="button" onClick={() => setIsMobileMenuOpen(false)} whileHover={{ rotate: 90, scale: 1.08 }} whileTap={{ scale: 0.9 }} transition={{ type: 'spring', stiffness: 420, damping: 22 }} className="mobile-menu-close absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 text-slate-400 shadow-sm transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:border-rose-900/70 dark:hover:bg-rose-950/40 dark:hover:text-rose-300" aria-label="بستن منو" title="بستن منو"><X className="h-4 w-4" /></motion.button>
          </div>
          <LayoutGroup id="mobile-header-menu-navigation">
            <div className="grid grid-cols-2 gap-2">
              {mobileMenuItems.map(({ id, label, icon: Icon }) => {
                const isActive = currentTab === id;
                return <motion.button key={id} type="button" onClick={() => selectMobileTab(id)} whileTap={{ scale: 0.96 }} className={`relative flex min-h-[3.7rem] items-center gap-2.5 overflow-hidden rounded-2xl border px-3 text-right transition-colors ${isActive ? 'border-indigo-200 text-indigo-700 dark:border-indigo-800 dark:text-indigo-300' : 'border-slate-100 text-slate-600 hover:border-indigo-100 hover:bg-indigo-50/60 dark:border-slate-800 dark:text-slate-300 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/40'}`}>
                  {isActive && <motion.span layoutId="mobile-menu-active-background" className="absolute inset-0 bg-indigo-50/80 dark:bg-indigo-950/55" transition={{ type: 'spring', stiffness: 420, damping: 30 }} />}
                  {isActive && <motion.span layoutId="mobile-menu-active-border" className="pointer-events-none absolute inset-0 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/80" transition={{ type: 'spring', stiffness: 420, damping: 30 }} />}
                  <span className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isActive ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/70 dark:text-indigo-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-400'}`}><Icon className="h-4 w-4" /></span>
                  <span className="relative z-10 text-[11px] font-bold leading-5">{label}</span>
                </motion.button>;
              })}
            </div>
          </LayoutGroup>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <button type="button" onClick={() => { setIsMobileMenuOpen(false); onOpenSearch(); }} className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] font-bold text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300"><Search className="h-4 w-4 shrink-0" />جست‌وجو</button>
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-2 py-1.5 dark:bg-slate-800/70"><Palette className="h-4 w-4 text-slate-400" /><ThemeToggleButton isDark={isDark} onToggleTheme={onToggleTheme} inputId="theme-switch-mobile" /></div>
          </div>
          {onOpenRoughNotes && <button type="button" onClick={() => { setIsMobileMenuOpen(false); onOpenRoughNotes(); }} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200/70 bg-indigo-50/70 px-3 py-2.5 text-[11px] font-bold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-950/70"><Sparkles className="h-4 w-4" />دستیار هوشمند صورت‌جلسه</button>}
          {onLogout && <button type="button" onClick={() => { setIsMobileMenuOpen(false); onLogout(); }} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200/80 bg-rose-50 px-3 py-2.5 text-[11px] font-bold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/70"><LogOut className="h-4 w-4" />خروج از حساب</button>}
        </motion.div>
      </>}
    </AnimatePresence>
    <div className="hidden">
      <button onClick={onOpenSearch} className="group [&>kbd:last-child]:hidden flex h-11 w-full items-center rounded-2xl border border-slate-200/80 bg-white/90 px-4 text-right shadow-sm shadow-slate-200/30 transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700/80 dark:bg-slate-800/90 dark:shadow-black/10 dark:hover:border-indigo-600" dir="ltr" aria-label="جستجو">
        <kbd className="ml-5 hidden min-w-[4.5rem] items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold tracking-tight text-slate-500 shadow-sm sm:inline-flex dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">Win + K</kbd>
        <div className="flex items-center gap-2.5 text-xs"><Search className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" /><span>جستجو در صورت‌جلسات، مصوبات و اعضا...</span></div>
        <kbd className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-600">⌘ K</kbd>
      </button>
    </div>
    <div className="hidden min-w-0 items-center gap-2 text-right lg:flex" dir="rtl">
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
      {contextLabel && <span className="mr-3 hidden max-w-48 truncate rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300 lg:inline-flex" title={contextLabel}>{contextLabel}{contextRole ? ` · ${organizationRoleLabel(contextRole)}` : ''}</span>}
    </div>
    </div>
  </header>
  );
};

interface ThemeToggleButtonProps {
  isDark: boolean;
  onToggleTheme: () => void;
  inputId?: string;
}

const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({ isDark, onToggleTheme, inputId = 'theme-switch' }) => {
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
      htmlFor={inputId}
      title={isDark ? 'حالت روشن' : 'حالت تیره'}
      aria-label={isDark ? 'حالت روشن' : 'حالت تیره'}
    >
      <span className="switch-outer">
        <input id={inputId} type="checkbox" checked={isDark} onChange={handleClick} aria-label={isDark ? 'حالت روشن' : 'حالت تیره'} />
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
