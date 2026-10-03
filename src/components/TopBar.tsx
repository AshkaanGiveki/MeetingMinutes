import React from 'react';
import { Search, Bell, Moon, Sun, ChevronDown } from 'lucide-react';
import { currentUser } from '../data/mockData';

interface TopBarProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenSearch: () => void;
  unreadCount?: number;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  isDark,
  onToggleTheme,
  onOpenSearch,
  unreadCount = 2,
  onOpenNotifications,
  onOpenProfile,
}) => {
  return (
    <header className="h-16 px-6 flex items-center justify-between z-10">
      {/* Left zone (in RTL, this appears on the visual left) */}
      <div className="flex items-center gap-4">
        {/* User profile block */}
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-full hover:bg-white/70 dark:hover:bg-slate-800/60 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700/60 cursor-pointer text-right"
        >
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            referrerPolicy="no-referrer"
            className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-500/20 shadow-xs"
          />
          <div className="flex flex-col text-right">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-tight">
              {currentUser.name}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {currentUser.role}
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-0.5" />
        </button>

        {/* Notification bell */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="اعلان‌ها"
          aria-label="اعلان‌ها"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Dark/Light mode toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={isDark ? 'حالت روشن' : 'حالت تیره'}
          aria-label={isDark ? 'حالت روشن' : 'حالت تیره'}
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-slate-600" />
          )}
        </button>
      </div>

      {/* Center/Search bar */}
      <div className="w-full max-w-md mx-6">
        <button
          onClick={onOpenSearch}
          className="w-full h-10 px-4 rounded-xl bg-white/90 dark:bg-slate-800/80 backdrop-blur-xs border border-slate-200/80 dark:border-slate-700/60 shadow-xs flex items-center justify-between text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2.5 text-xs">
            <Search className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
            <span className="text-slate-400 dark:text-slate-400">
              جستجو در جلسات، افراد، تگ‌ها و ...
            </span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
            ⌘ K
          </kbd>
        </button>
      </div>

      {/* Right spacer for symmetrical alignment with right sidebar */}
      <div className="w-24 hidden md:block" />
    </header>
  );
};
