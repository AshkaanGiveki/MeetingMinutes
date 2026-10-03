import React from 'react';
import { Home, FolderArchive, Layers, Users, Settings, Sparkles } from 'lucide-react';

interface RightSidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  isDark?: boolean;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  currentTab,
  onTabChange,
  isDark
}) => {
  const navItems = [
    { id: 'meetings', label: 'جلسات', icon: Home },
    { id: 'archive', label: 'آرشیو', icon: FolderArchive },
    { id: 'templates', label: 'قالب‌ها', icon: Layers },
    { id: 'contacts', label: 'مخاطبین', icon: Users },
    { id: 'settings', label: 'تنظیمات', icon: Settings },
  ];

  return (
    <aside
      className={`w-28 shrink-0 flex flex-col justify-between py-6 px-3 border-l z-20 transition-colors select-none ${
        isDark
          ? 'bg-slate-900/90 border-slate-800 text-slate-300'
          : 'bg-white/80 backdrop-blur-md border-slate-200/70 text-slate-600'
      }`}
    >
      {/* Top: Logo */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={() => onTabChange('meetings')}
          className="flex flex-col items-center gap-2 group cursor-pointer focus:outline-none"
        >
          <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-300">
            {/* Swirling logo motif */}
            <div className="w-6 h-6 rounded-full border-2 border-white/90 border-t-transparent animate-[spin_10s_linear_infinite]" />
            <div className="absolute w-2.5 h-2.5 bg-white rounded-full shadow-sm" />
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
            MetaMeet
          </span>
        </button>

        {/* Navigation list */}
        <nav className="w-full mt-6 flex flex-col items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full py-2.5 px-2 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer text-xs font-medium ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg transition-transform ${
                    isActive ? 'scale-110' : ''
                  }`}
                >
                  <Icon className="w-5 h-5 stroke-[1.8]" />
                </div>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom cosmic brand badge matching screenshot */}
      <div className="relative overflow-hidden rounded-2xl p-3 bg-gradient-to-b from-[#0e1329] via-[#090d20] to-[#04060f] text-center border border-indigo-950/80 shadow-lg text-white">
        <div className="absolute -top-6 -right-6 w-16 h-16 bg-indigo-500/20 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-16 h-16 bg-purple-500/20 rounded-full blur-xl pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-1">
          <div className="w-5 h-5 rounded-full bg-indigo-500/30 flex items-center justify-center mb-0.5">
            <Sparkles className="w-3 h-3 text-indigo-300" />
          </div>
          <span className="text-[11px] font-bold tracking-tight font-['Plus_Jakarta_Sans',sans-serif]">
            MetaMeet
          </span>
          <p className="text-[9px] text-slate-400 leading-tight">
            Better Meetings, Greater Decisions.
          </p>
        </div>
      </div>
    </aside>
  );
};
