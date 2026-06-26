import { useState } from 'react';
import { Sun, Moon, Wifi, WifiOff, Bell, ShieldCheck, RefreshCw, Layers, Menu } from 'lucide-react';
import { useSettingsStore } from '@/store/settings';

interface HeaderProps {
  title: string;
  wsStatus?: 'connecting' | 'connected' | 'disconnected';
  onMenuClick?: () => void;
}

export function Header({ title, wsStatus = 'disconnected', onMenuClick }: HeaderProps) {
  const { theme, toggleTheme } = useSettingsStore();
  const [showNotifications, setShowNotifications] = useState(false);

  const mockAlerts = [
    { type: 'warning', text: '3 package upgrades available via DNF', icon: RefreshCw },
    { type: 'info', text: 'SELinux active in enforcing mode', icon: ShieldCheck },
    { type: 'success', text: 'All virtualization container hosts running', icon: Layers }
  ];

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-4 md:px-6 shrink-0 z-20 relative">
      {/* Title with Mobile Menu Trigger */}
      <div className="flex items-center gap-2">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 lg:hidden focus:outline-none"
          title="Open Menu"
        >
          <Menu size={18} />
        </button>
        <h2 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight capitalize truncate max-w-[150px] md:max-w-none">
          {title}
        </h2>
      </div>

      {/* Utilities */}
      <div className="flex items-center gap-2.5 md:gap-4">
        {/* WebSocket Connection Status */}
        <div 
          className={`
            flex items-center gap-1.5 px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-semibold select-none border
            ${wsStatus === 'connected' 
              ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' 
              : wsStatus === 'connecting'
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 animate-pulse'
                : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
            }
          `}
          title={`WebSocket telemetry: ${wsStatus}`}
        >
          {wsStatus === 'connected' ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span className="capitalize hidden sm:inline">{wsStatus === 'connected' ? 'Live connected' : wsStatus}</span>
          <span className="capitalize sm:hidden">{wsStatus === 'connected' ? 'Live' : 'Offline'}</span>
        </div>

        {/* Notifications Tray */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200/50 dark:border-slate-800/40 relative"
            title="System Alerts"
          >
            <Bell size={15} />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
          </button>

          {showNotifications && (
            <>
              {/* Click backdrop overlay - transparent click catcher */}
              <div className="fixed inset-0 z-30" onClick={() => setShowNotifications(false)} />
              {/* Notifications panel with solid background */}
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl p-4 z-40 space-y-3">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active System Warnings</p>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {mockAlerts.map((alert, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start p-2 rounded-lg bg-slate-50 dark:bg-slate-950 text-xs">
                      <alert.icon size={14} className={`shrink-0 mt-0.5 ${
                        alert.type === 'warning' ? 'text-amber-500' : alert.type === 'success' ? 'text-green-500' : 'text-primary'
                      }`} />
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{alert.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200/50 dark:border-slate-800/40"
          title="Toggle Theme"
        >
          {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
        </button>
      </div>
    </header>
  );
}
