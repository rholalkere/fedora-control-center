import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Settings2, 
  Terminal, 
  RefreshCw, 
  Cpu, 
  Boxes, 
  ShieldAlert, 
  ShieldCheck, 
  Brain, 
  LogOut,
  FolderLock,
  Network
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/services', label: 'Services', icon: Settings2 },
  { path: '/logs', label: 'Journal Logs', icon: Terminal },
  { path: '/updates', label: 'DNF Updates', icon: RefreshCw },
  { path: '/hardware', label: 'Hardware', icon: Cpu },
  { path: '/containers', label: 'Containers', icon: Boxes },
  { path: '/firewall', label: 'Firewall', icon: ShieldAlert },
  { path: '/selinux', label: 'SELinux', icon: ShieldCheck },
  { path: '/ai', label: 'AI Module', icon: Brain },
  { path: '/network', label: 'Network', icon: Network },
  { path: '/settings', label: 'Settings', icon: FolderLock }
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const { username, role, logout } = useAuthStore();

  return (
    <>
      {/* Backdrop for Mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      <aside 
        className={`
          w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col h-full shrink-0
          fixed lg:static inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Title Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
          <img 
            src="/fedora-logo.png" 
            alt="Fedora Logo" 
            className="w-8 h-8 rounded-full shadow-md shadow-fedora-blue/20 hover:scale-110 transition-transform duration-300"
          />
          <div>
            <h1 className="font-bold text-white tracking-tight text-sm">Fedora Control Center</h1>
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">System Admin</span>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive 
                  ? 'bg-fedora-blue text-white shadow-md shadow-fedora-blue/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }
              `}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Info & Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white truncate max-w-[120px]">{username || 'Admin'}</span>
              <span className="text-[10px] text-slate-500 font-semibold uppercase">{role || 'viewer'}</span>
            </div>
            <button 
              onClick={logout}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800/60 rounded-lg transition-colors"
              title="Log Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
