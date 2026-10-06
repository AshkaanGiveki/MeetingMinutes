import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  FolderArchive,
  Layers,
  Users,
  Settings,
  LogOut,
  LogIn,
  Calendar,
  Shield
  ,Building2
  ,UserRound
  ,BookOpen
  ,ChevronUp
} from 'lucide-react';
import { OrganizationRole } from '../types';

interface RightSidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  isDark?: boolean;
  totalMeetingsCount?: number;
  sealedMeetingsCount?: number;
  onOpenNewMeeting?: () => void;
  currentUser?: {
    name: string;
    email: string;
    role: OrganizationRole;
    avatar?: string;
  };
  onOpenAuth?: () => void;
  onLogout?: () => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  currentTab,
  onTabChange,
  isDark,
  totalMeetingsCount = 3,
  sealedMeetingsCount = 1,
  onOpenNewMeeting,
  currentUser,
  onOpenAuth,
  onLogout,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const expandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHoverTimers = () => {
    if (expandTimerRef.current) clearTimeout(expandTimerRef.current);
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    expandTimerRef.current = null;
    collapseTimerRef.current = null;
    closeTimerRef.current = null;
  };

  const handleSidebarEnter = () => {
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    if (isCollapsed) {
      expandTimerRef.current = setTimeout(() => {
        setIsCollapsed(false);
        setIsContentVisible(true);
      }, 200);
    } else {
      setIsContentVisible(true);
    }
  };

  const handleSidebarLeave = () => {
    if (expandTimerRef.current) clearTimeout(expandTimerRef.current);
    collapseTimerRef.current = setTimeout(() => {
      setIsContentVisible(false);
      setIsProfileMenuOpen(false);
      closeTimerRef.current = setTimeout(() => setIsCollapsed(true), 180);
    }, 200);
  };

  useEffect(() => clearHoverTimers, []);

  const navItems = [
    {
      id: 'meetings',
      label: 'جلسات جاری',
      icon: Calendar,
      badge: totalMeetingsCount,
      badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
    },
    {
      id: 'archive',
      label: 'آرشیو اسناد پلمپ',
      icon: FolderArchive,
      badge: sealedMeetingsCount,
      badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    },
    {
      id: 'templates',
      label: 'قالب‌های صورت‌جلسه',
      icon: Layers,
    },
    {
      id: 'contacts',
      label: 'اعضا و امضاکنندگان',
      icon: Users,
    },
    {
      id: 'settings',
      label: 'تنظیمات و امنیت',
      icon: Settings,
    },
    {
      id: 'organizations',
      label: 'سازمان‌های من',
      icon: Building2,
    },
    {
      id: 'auth',
      label: 'ورود و احراز هویت',
      icon: Shield,
    },
  ];

  const visibleNavItems = navItems.filter((item) => item.id !== 'auth');

  const renderNavItem = (item: (typeof navItems)[number]) => {
    const Icon = item.icon;
    const isActive = currentTab === item.id;
    return (
      <motion.button
        key={item.id}
        onClick={() => onTabChange(item.id)}
        variants={{ hidden: { opacity: 0, y: 7 }, show: { opacity: 1, y: 0 } }}
        whileTap={{ scale: 0.98 }}
        className={`relative group flex min-h-11 items-center gap-3 rounded-xl border px-3.5 py-2.5 text-right text-xs font-semibold transition-all duration-200 cursor-pointer overflow-hidden ${
          isActive
            ? 'border-indigo-200/80 text-indigo-700 shadow-[0_5px_14px_-10px_rgba(99,102,241,0.7)] dark:border-indigo-800/80 dark:text-indigo-300'
            : 'border-transparent text-slate-500 hover:border-slate-200/80 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:border-slate-800 dark:hover:bg-slate-800/60 dark:hover:text-white'
        }`}
        title={item.label}
      >
        {isActive && <motion.span layoutId="sidebar-active-background" transition={{ type: 'spring', stiffness: 520, damping: 36 }} className="absolute inset-0 rounded-xl bg-indigo-50/75 dark:bg-indigo-950/55" />}
        {isActive && <motion.span layoutId="sidebar-active-indicator" transition={{ type: 'spring', stiffness: 520, damping: 36 }} className="absolute right-0 top-2 bottom-2 z-20 w-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-l-full" />}
        <motion.span
          key={`${item.id}-${isActive ? 'active' : 'idle'}`}
          initial={isActive ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
          animate={{ scale: isActive ? 1.05 : 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 24 }}
          className={`relative z-10 flex shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}
        >
          <Icon className="h-[17px] w-[17px] stroke-[1.8]" />
        </motion.span>
        <AnimatePresence initial={false}>
          {isContentVisible && (
            <motion.div initial={{ opacity: 0, x: 10, width: 0 }} animate={{ opacity: 1, x: 0, width: 'auto' }} exit={{ opacity: 0, x: 10, width: 0 }} transition={{ duration: 0.18, ease: 'easeOut' }} className="relative z-10 flex flex-1 items-center justify-between overflow-hidden whitespace-nowrap">
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${item.badgeColor}`}>{item.badge}</span>}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    );
  };

  return (
    <motion.aside
      onMouseEnter={handleSidebarEnter}
      onMouseLeave={handleSidebarLeave}
      onFocus={handleSidebarEnter}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) handleSidebarLeave();
      }}
      initial={false}
      animate={{ width: isCollapsed ? 80 : 288 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.7 }}
      className={`h-[calc(100vh-1.5rem)] sticky top-3 flex flex-col justify-between rounded-[22px] border z-30 select-none overflow-visible ${
        isCollapsed ? 'shadow-lg' : 'shadow-2xl'
      } ${
        isDark
          ? 'bg-[#0b0f1f]/95 border-slate-800/80 text-slate-300 shadow-2xl shadow-black/40'
          : 'bg-white/95 backdrop-blur-xl border-slate-200/80 text-slate-700 shadow-xl shadow-slate-200/30'
      }`}
    >
      {/* Top Header & Brand */}
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between border-b border-slate-100/80 pb-4 dark:border-slate-800/80">
          <div
            onClick={() => onTabChange('meetings')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 transition-transform duration-300 group-hover:scale-105 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
              <Layers className="h-5 w-5" />
            </div>

            {isContentVisible && (
              <div className="flex flex-col text-right">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                    متا‌میت
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 font-mono text-[9px] font-bold">
                    PRO
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium truncate">
                  امضای الکترونیک صورت‌جلسات
                </span>
              </div>
            )}
          </div>

        </div>

        {/* Main Navigation List */}
        <motion.nav className="flex flex-col gap-1 pt-1" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.055 } } }}>
          {visibleNavItems.slice(0, 2).map(renderNavItem)}
          {visibleNavItems.slice(2).map(renderNavItem)}
        </motion.nav>
      </div>

      {/* Bottom User Profile & Auth Section */}
      <div className="relative border-t border-slate-100/80 p-4 dark:border-slate-800/80">
        {currentUser ? (
          <div
            className={`relative rounded-xl border border-slate-200/70 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-800/50 flex items-center gap-3 ${
              isContentVisible ? 'justify-between' : 'justify-center'
            }`}
          >
            {isProfileMenuOpen && isContentVisible && (
              <div role="menu" aria-label="منوی حساب کاربری" className="absolute bottom-[calc(100%+0.75rem)] right-0 left-0 z-50 overflow-hidden rounded-2xl border border-slate-200/90 bg-white text-right shadow-2xl shadow-slate-300/30 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40" dir="rtl">
                <div className="p-1.5">
                  <button role="menuitem" onClick={() => { setIsProfileMenuOpen(false); onOpenAuth?.(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                    <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
                    <span>مشاهده پروفایل</span>
                    <span className="mr-auto text-[10px] text-slate-400">⌘↵</span>
                  </button>
                  <button role="menuitem" onClick={() => { setIsProfileMenuOpen(false); onTabChange('settings'); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                    <Settings className="h-4 w-4 shrink-0 text-slate-400" />
                    <span>تنظیمات حساب</span>
                    <span className="mr-auto text-[10px] text-slate-400">⌘S</span>
                  </button>
                  <button role="menuitem" onClick={() => setIsProfileMenuOpen(false)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                    <BookOpen className="h-4 w-4 shrink-0 text-slate-400" />
                    <span>مستندات</span>
                  </button>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800" />
                <div className="p-3">
                  <p className="mb-2 text-[10px] font-bold text-slate-400">تغییر حساب</p>
                  <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-2.5 py-2 dark:bg-slate-800/70">
                    <div className="relative shrink-0">
                      <img src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'} alt={currentUser.name} referrerPolicy="no-referrer" className="h-8 w-8 rounded-lg object-cover" />
                      <span className="absolute -bottom-0.5 -left-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-50 dark:ring-slate-800" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">{currentUser.name}</p>
                      <p className="truncate text-[10px] text-slate-400">{currentUser.email}</p>
                    </div>
                    <span className="h-2.5 w-2.5 rounded-full border border-slate-300 dark:border-slate-600" />
                  </div>
                  {onLogout && (
                    <button role="menuitem" onClick={() => { setIsProfileMenuOpen(false); onLogout(); }} className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-rose-950/40 dark:hover:text-rose-300">
                      <LogOut className="h-4 w-4 shrink-0" />
                      <span>خروج از حساب</span>
                      <span className="mr-auto text-[10px] text-slate-400">⌥⇧Q</span>
                    </button>
                  )}
                </div>
              </div>
            )}
            <div
              onClick={() => setIsProfileMenuOpen((open) => !open)}
              className="flex items-center gap-2.5 cursor-pointer min-w-0"
              title="تغییر نقش کاربری یا تنظیمات حساب"
            >
              <div className="relative shrink-0">
                <img
                  src={
                    currentUser.avatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                  }
                  alt={currentUser.name}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-xl object-cover ring-2 ring-indigo-500/20"
                />
                <span className="absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
              </div>

              {isContentVisible && (
                <div className="flex flex-col text-right truncate">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                    {currentUser.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="px-1.5 py-0.2 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] font-medium font-sans">
                      {currentUser.role}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {isContentVisible && <ChevronUp className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />}

            {isContentVisible && onLogout && (
              <button
                onClick={onLogout}
                className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                title="خروج از حساب کاربری"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="hidden"
          >
            <LogIn className="w-4 h-4" />
            {isContentVisible && <span>ورود / ثبت‌نام</span>}
          </button>
        )}
      </div>
    </motion.aside>
  );
};
