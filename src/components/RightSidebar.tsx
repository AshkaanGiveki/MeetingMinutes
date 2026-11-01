import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import {
  FolderArchive,
  Layers,
  Users,
  Settings,
  LogOut,
  Calendar,
  Shield
  ,Building2
  ,BookOpen
  ,ChevronUp
} from 'lucide-react';
import logoIcon from '../assets/icons/Logo.png';
import wordmarkIcon from '../assets/icons/typo.png';
import { OrganizationRole } from '../types';
import { UserAvatar } from './UserAvatar';
import { organizationRoleLabel } from '../utils/organization';

interface RightSidebarProps {
  currentTab: string;
  canManageUsers?: boolean;
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
  onLogout?: () => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  currentTab,
  canManageUsers = false,
  onTabChange,
  isDark,
  totalMeetingsCount = 3,
  sealedMeetingsCount = 1,
  onOpenNewMeeting,
  currentUser,
  onLogout,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showWordmark, setShowWordmark] = useState(false);
  const expandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const logoInterval = window.setInterval(() => {
      setShowWordmark((visible) => !visible);
    }, 5000);

    return () => window.clearInterval(logoInterval);
  }, []);

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
    ...(canManageUsers ? [{ id: 'user-management', label: 'مدیریت کاربران', icon: Users }] : []),
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
        layout
        onClick={() => onTabChange(item.id)}
        variants={{ hidden: { opacity: 0, y: 7 }, show: { opacity: 1, y: 0 } }}
        whileTap={{ scale: 0.98 }}
        className={`relative group flex min-h-11 items-center gap-3 rounded-xl border px-3.5 py-2.5 text-right text-xs font-semibold transition-all duration-200 cursor-pointer ${
          isActive
            ? 'text-indigo-700 shadow-[0_5px_14px_-10px_rgba(99,102,241,0.7)] dark:text-indigo-300'
            : 'border-transparent text-slate-500 hover:border-slate-200/80 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:border-slate-800 dark:hover:bg-slate-800/60 dark:hover:text-white'
        }`}
        title={item.label}
      >
        {isActive && <motion.div layout layoutId="sidebar-active-background" transition={{ layout: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }} className="absolute inset-0 z-0 rounded-xl bg-indigo-50/75 dark:bg-indigo-950/55" />}
        {isActive && <motion.div layout layoutId="sidebar-active-border" transition={{ layout: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }} className="pointer-events-none absolute inset-0 z-20 rounded-xl border border-indigo-200/80 dark:border-indigo-800/80" />}
        {isActive && <motion.div layout layoutId="sidebar-active-indicator" transition={{ layout: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }} className="absolute right-0 top-2 bottom-2 z-20 w-0.5 rounded-l-full bg-indigo-600 dark:bg-indigo-400" />}
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
              {item.badge !== undefined && item.badge > 0 && <span className={`rounded-full px-2 py-0.5 font-persian text-[10px] font-bold ${item.badgeColor}`}>{item.badge}</span>}
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
      className={`h-[calc(100vh-1.5rem)] sticky top-3 flex flex-col justify-between rounded-[22px] border z-10 select-none overflow-visible ${
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
          <div onClick={() => onTabChange('meetings')} className="flex min-w-0 cursor-pointer items-center gap-3 group">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center transition-transform duration-300 group-hover:scale-105">
              <AnimatePresence initial={false} mode="wait">
                <motion.img
                  key={showWordmark ? 'wordmark' : 'logo'}
                  src={showWordmark ? wordmarkIcon : logoIcon}
                  alt="Accord"
                  className="absolute h-10 w-10 object-contain"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: 'easeInOut' }}
                />
              </AnimatePresence>
            </div>
            {isContentVisible && (
              <div className="min-w-0 flex-1 overflow-hidden text-right">
                <AnimatePresence initial={false} mode="wait">
                  <motion.span
                    key={showWordmark ? 'digital-signatures' : 'smart-meetings'}
                    className="block truncate text-[11px] font-bold tracking-tight text-slate-700 dark:text-slate-200"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -14 }}
                    transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {showWordmark ? 'امضای دیجیتال سازمانی' : 'مدیریت هوشمند جلسات'}
                  </motion.span>
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Main Navigation List */}
        <LayoutGroup id="right-sidebar-navigation">
          <motion.nav className="flex flex-col gap-1 pt-1" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.055 } } }}>
            {visibleNavItems.slice(0, 2).map(renderNavItem)}
            {visibleNavItems.slice(2).map(renderNavItem)}
          </motion.nav>
        </LayoutGroup>
      </div>

      {/* Bottom User Profile & Auth Section */}
      <div className="relative border-t border-slate-100/80 px-3 py-4 dark:border-slate-800/80">
        {currentUser ? (
          <div
            role="button"
            tabIndex={0}
            aria-expanded={isProfileMenuOpen}
            onClick={() => setIsProfileMenuOpen((open) => !open)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setIsProfileMenuOpen((open) => !open);
              }
            }}
            className="group relative box-border flex h-[58px] min-w-0 w-full items-center justify-start gap-2.5 overflow-visible rounded-xl border border-slate-200/70 bg-slate-50/80 pl-[9px] pr-[8px] py-2.5 transition-colors hover:border-indigo-200 hover:bg-indigo-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/30"
            >
            <AnimatePresence initial={false}>
              {isProfileMenuOpen && isContentVisible && (
              <motion.div role="menu" aria-label="منوی حساب کاربری" initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }} transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.7 }} onClick={(event) => event.stopPropagation()} className="absolute bottom-[calc(100%+0.75rem)] right-0 left-0 z-50 overflow-hidden rounded-2xl border border-slate-200/90 bg-white text-right shadow-2xl shadow-slate-300/30 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40" dir="rtl">
                <div className="p-1.5">
                  <button role="menuitem" onClick={() => { setIsProfileMenuOpen(false); onTabChange('settings'); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                    <Settings className="h-4 w-4 shrink-0 text-slate-400" />
                    <span>تنظیمات حساب</span>
                  </button>
                  <button role="menuitem" onClick={() => setIsProfileMenuOpen(false)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                    <BookOpen className="h-4 w-4 shrink-0 text-slate-400" />
                    <span>مستندات</span>
                  </button>
                </div>
                {onLogout && (
                  <>
                    <div className="border-t border-slate-100 dark:border-slate-800" />
                    <div className="p-1.5">
                      <button role="menuitem" onClick={() => { setIsProfileMenuOpen(false); onLogout(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-rose-950/40 dark:hover:text-rose-300">
                        <LogOut className="h-4 w-4 shrink-0" />
                        <span>خروج از حساب</span>
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
              )}
            </AnimatePresence>
            <div className={`flex min-w-0 items-center gap-2.5 ${isContentVisible ? 'flex-1' : 'flex-none'}`} title="تغییر نقش کاربری یا تنظیمات حساب">
              <div className="relative shrink-0">
                <UserAvatar name={currentUser.name} avatar={currentUser.avatar} className="h-9 w-9 rounded-xl text-[10px] ring-2 ring-indigo-500/20" imageClassName="h-9 w-9 rounded-xl object-cover ring-2 ring-indigo-500/20" />
                <span className="absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
              </div>

              {isContentVisible && (
                <div className="flex flex-col text-right truncate">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                    {currentUser.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="px-1.5 py-0.2 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] font-medium font-sans">
                      {organizationRoleLabel(currentUser.role)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {isContentVisible && (
              <motion.span
                aria-hidden="true"
                animate={{ rotateZ: isProfileMenuOpen ? 180 : 0, scale: isProfileMenuOpen ? 1.08 : 1 }}
                transition={{ type: 'spring', stiffness: 440, damping: 24, mass: 0.55 }}
                className="flex shrink-0 text-slate-400 transition-colors group-hover:text-indigo-500"
              >
                <ChevronUp className="h-4 w-4" />
              </motion.span>
            )}
          </div>
        ) : null}
      </div>
    </motion.aside>
  );
};
