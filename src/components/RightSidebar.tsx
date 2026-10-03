import React, { useState } from 'react';
import {
  FileText,
  FolderArchive,
  Layers,
  Users,
  Settings,
  Plus,
  LogOut,
  LogIn,
  ChevronLeft,
  ChevronRight,
  Shield,
  Sparkles,
  Calendar,
  CheckCircle2,
  Lock
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
  const [isCollapsed, setIsCollapsed] = useState(false);

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
      id: 'auth',
      label: 'ورود و احراز هویت',
      icon: Shield,
    },
  ];

  return (
    <aside
      className={`h-screen sticky top-0 flex flex-col justify-between border-l z-30 transition-all duration-300 select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      } ${
        isDark
          ? 'bg-[#0b0f1f]/95 border-slate-800/80 text-slate-300 shadow-2xl shadow-black/40'
          : 'bg-white/95 backdrop-blur-xl border-slate-200/80 text-slate-700 shadow-xl shadow-slate-200/30'
      }`}
    >
      {/* Top Header & Brand */}
      <div className="flex flex-col p-4 gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div
            onClick={() => onTabChange('meetings')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            {/* Spinning Neon Logo */}
            <div className="relative w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 shadow-md shadow-indigo-500/30 group-hover:scale-105 transition-transform duration-300 shrink-0">
              <div className="w-5 h-5 rounded-full border-2 border-white/90 border-t-transparent animate-[spin_8s_linear_infinite]" />
              <div className="absolute w-2 h-2 bg-white rounded-full shadow-xs" />
            </div>

            {!isCollapsed && (
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

          {/* Collapse / Expand Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title={isCollapsed ? 'باز کردن منو' : 'جمع کردن منو'}
          >
            {isCollapsed ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Quick Action: New Meeting */}
        {onOpenNewMeeting && (
          <button
            onClick={onOpenNewMeeting}
            className={`w-full py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 active:scale-98 transition-all cursor-pointer ${
              isCollapsed ? 'px-0' : 'px-4'
            }`}
            title="تعریف صورت‌جلسه جدید"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            {!isCollapsed && <span>صورت‌جلسه جدید</span>}
          </button>
        )}

        {/* Main Navigation List */}
        <nav className="flex flex-col gap-1.5 pt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`relative group flex items-center gap-3.5 py-2.5 rounded-2xl transition-all duration-200 cursor-pointer text-xs font-semibold text-right ${
                  isCollapsed ? 'justify-center px-0' : 'px-3.5'
                } ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                }`}
                title={item.label}
              >
                {/* Active Indicator Bar on visual right */}
                {isActive && (
                  <span className="absolute right-0 top-2 bottom-2 w-1 bg-indigo-600 dark:bg-indigo-500 rounded-l-full" />
                )}

                <Icon
                  className={`w-4 h-4 stroke-[2] shrink-0 transition-transform ${
                    isActive ? 'scale-110 text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                  }`}
                />

                {!isCollapsed && (
                  <div className="flex-1 flex items-center justify-between">
                    <span>{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom User Profile & Auth Section */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-2">
        {currentUser ? (
          <div
            className={`rounded-2xl p-2.5 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-center gap-3 ${
              isCollapsed ? 'justify-center' : 'justify-between'
            }`}
          >
            <div
              onClick={onOpenAuth}
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

              {!isCollapsed && (
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

            {!isCollapsed && onLogout && (
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
            className="w-full py-2.5 px-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <LogIn className="w-4 h-4" />
            {!isCollapsed && <span>ورود / ثبت‌نام</span>}
          </button>
        )}
      </div>
    </aside>
  );
};
