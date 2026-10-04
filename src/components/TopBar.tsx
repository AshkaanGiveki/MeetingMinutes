import React from 'react';
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
}) => (
  <header className="h-16 px-6 flex items-center justify-between z-10 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
    <div className="flex items-center gap-3">
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
      <button onClick={onToggleTheme} className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800 transition-colors cursor-pointer" title={isDark ? 'حالت روشن' : 'حالت تیره'} aria-label={isDark ? 'حالت روشن' : 'حالت تیره'}>
        {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
      </button>
    </div>
    <div className="w-full max-w-md mx-6">
      <button onClick={onOpenSearch} className="w-full h-10 px-4 rounded-xl bg-white/90 dark:bg-slate-800/80 backdrop-blur-xs border border-slate-200/80 dark:border-slate-700/60 shadow-xs flex items-center justify-between text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all cursor-pointer group">
        <div className="flex items-center gap-2.5 text-xs"><Search className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" /><span>جستجو در صورت‌جلسات، مصوبات و اعضا...</span></div>
        <kbd className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-600">⌘ K</kbd>
      </button>
    </div>
    <div className="w-16 hidden md:block" />
  </header>
);
