import React from 'react';
import { LayoutGroup, motion } from 'motion/react';
import { Archive, Building2, CalendarDays, Settings, Users } from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'meetings', label: 'جلسات', icon: CalendarDays },
  { id: 'archive', label: 'آرشیو', icon: Archive },
  { id: 'organizations', label: 'سازمان‌ها', icon: Building2 },
  { id: 'contacts', label: 'اعضا', icon: Users },
  { id: 'settings', label: 'تنظیمات', icon: Settings },
] as const;

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ currentTab, onTabChange }) => (
  <nav className="mobile-bottom-nav no-print fixed inset-x-3 bottom-3 z-40 lg:hidden" aria-label="ناوبری اصلی">
    <LayoutGroup id="mobile-bottom-navigation">
      <div className="mobile-bottom-nav-inner mx-auto flex max-w-xl items-center justify-around gap-1 rounded-[1.6rem] border border-white/80 bg-white/90 p-2 shadow-[0_18px_45px_-20px_rgba(15,23,42,0.55)] backdrop-blur-2xl dark:border-slate-700/80 dark:bg-slate-900/90 dark:shadow-black/40">
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = currentTab === id || (id === 'meetings' && currentTab === 'auth');
          return (
            <motion.button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              whileTap={{ scale: 0.9 }}
              className={`mobile-bottom-nav-item relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-semibold transition-colors duration-200 ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200'}`}
              aria-current={isActive ? 'page' : undefined}
              aria-label={label}
            >
              {isActive && <motion.span layoutId="mobile-bottom-active-background" className="absolute inset-0 rounded-2xl bg-indigo-50 dark:bg-indigo-950/65" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
              {isActive && <motion.span layoutId="mobile-bottom-active-border" className="pointer-events-none absolute inset-0 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/80" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
              <motion.span
                className="relative z-10"
                animate={{ y: isActive ? -1 : 0, scale: isActive ? 1.08 : 1 }}
                transition={{ type: 'spring', stiffness: 520, damping: 24 }}
              >
                <Icon className="h-[18px] w-[18px] stroke-[1.8]" />
              </motion.span>
              <span className="relative z-10 truncate">{label}</span>
            </motion.button>
          );
        })}
      </div>
    </LayoutGroup>
  </nav>
);
