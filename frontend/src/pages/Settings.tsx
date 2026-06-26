import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, ShieldAlert, RefreshCw, Sun, Moon, Power, RotateCcw } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { useSettingsStore } from '@/store/settings';
import { useNotificationStore } from '@/store/notifications';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table';
import { TableSkeleton } from '@/components/ui/Loading';

export function Settings() {
  const { role } = useAuthStore();
  const { theme, toggleTheme } = useSettingsStore();
  const { addToast } = useNotificationStore();
  
  const [logFilterAction, setLogFilterAction] = useState('');
  const [logFilterUser, setLogFilterUser] = useState('');
  const [skip] = useState(0);
  const [limit] = useState(30);
  
  const [powerAction, setPowerAction] = useState<'reboot' | 'shutdown' | null>(null);

  const isAdmin = role === 'admin';

  const handlePowerAction = async (action: 'reboot' | 'shutdown') => {
    if (!isAdmin) {
      addToast('Administrator role required to execute system power commands.', 'error');
      return;
    }
    
    try {
      if (action === 'reboot') {
        const res = await api.rebootSystem();
        addToast(res.message, 'success');
      } else {
        const res = await api.shutdownSystem();
        addToast(res.message, 'success');
      }
      setPowerAction(null);
    } catch (err: any) {
      addToast(`Command failed: ${err.message}`, 'error');
    }
  };

  // 1. Audit logs query - only enabled if user is admin!
  const { data: logs, isLoading: isLogsLoading, refetch, isFetching } = useQuery({
    queryKey: ['audit-logs', skip, limit, logFilterUser, logFilterAction],
    queryFn: () => api.getAuditLogs(skip, limit, logFilterUser || undefined, logFilterAction || undefined),
    enabled: isAdmin
  });

  return (
    <div className="space-y-6 overflow-y-auto h-full pb-10 pr-2">
      {/* General Settings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Appearance & Theme</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-slate-500">Toggle application styling between Light and Dark mode options.</p>
            <button
              onClick={() => {
                toggleTheme();
                addToast(`Theme toggled to ${theme === 'light' ? 'dark' : 'light'}!`, 'info');
              }}
              className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-colors border border-slate-200/50 dark:border-slate-800/40"
            >
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
              <span>Toggle: {theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
            </button>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>System Operations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-slate-500">Perform host node power operations. Admin authorization required.</p>
            {powerAction ? (
              <div className="p-3 bg-red-500/5 dark:bg-red-500/[0.02] border border-red-500/20 rounded-lg space-y-3">
                <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                  Confirm host {powerAction}?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePowerAction(powerAction)}
                    className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg transition-colors shadow-md"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setPowerAction(null)}
                    className="flex-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold rounded-lg transition-colors border border-slate-200 dark:border-slate-850"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setPowerAction('reboot')}
                  disabled={!isAdmin}
                  className={`flex items-center justify-center gap-2 w-full px-4 py-2 text-xs font-bold rounded-lg transition-colors border ${
                    isAdmin 
                      ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/20' 
                      : 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 border-slate-200/50 dark:border-slate-800/40 cursor-not-allowed'
                  }`}
                >
                  <RotateCcw size={14} />
                  <span>Reboot System</span>
                </button>
                <button
                  onClick={() => setPowerAction('shutdown')}
                  disabled={!isAdmin}
                  className={`flex items-center justify-center gap-2 w-full px-4 py-2 text-xs font-bold rounded-lg transition-colors border ${
                    isAdmin 
                      ? 'bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/20' 
                      : 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 border-slate-200/50 dark:border-slate-800/40 cursor-not-allowed'
                  }`}
                >
                  <Power size={14} />
                  <span>Shutdown System</span>
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/40 pb-2">
              <span className="text-slate-500">Application Name</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">Fedora Control Center</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/40 pb-2">
              <span className="text-slate-500">Database Driver</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">SQLAlchemy / SQLite (upgradeable to PostgreSQL)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">API Documentation</span>
              <a 
                href={`${window.location.protocol}//${window.location.hostname}:8000/docs`} 
                target="_blank" 
                rel="noreferrer"
                className="font-bold text-fedora-blue hover:underline"
              >
                Swagger OpenAPI (/docs)
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audit Logs Section */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList size={18} className="text-fedora-blue" />
            <span>Administrator Activity Audit Trail</span>
          </CardTitle>
          {isAdmin && (
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
              title="Refresh Audit Logs"
            >
              <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            </button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {!isAdmin ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
              <ShieldAlert size={32} className="text-amber-500" />
              <div className="text-center">
                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">Access Denied</h5>
                <p className="text-[10px] text-slate-500 mt-0.5">Administrator privileges are required to view system activity logs.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Audit Log Filters */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800/60 grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Filter by Username..."
                  value={logFilterUser}
                  onChange={(e) => setLogFilterUser(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-fedora-blue transition-all"
                />
                <input
                  type="text"
                  placeholder="Filter by Action (e.g. login, service)..."
                  value={logFilterAction}
                  onChange={(e) => setLogFilterAction(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-fedora-blue transition-all"
                />
              </div>

              {isLogsLoading ? (
                <TableSkeleton />
              ) : logs?.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-12">No audit log entries recorded.</p>
              ) : (
                <div className="overflow-x-auto w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs?.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()}</TableCell>
                          <TableCell className="font-semibold text-xs text-slate-800 dark:text-slate-200">{log.username || 'system'}</TableCell>
                          <TableCell>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {log.action}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">{log.ip_address || 'unknown'}</TableCell>
                          <TableCell className="text-xs text-slate-500 max-w-sm truncate" title={log.details}>{log.details || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
