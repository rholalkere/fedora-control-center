import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertCircle, 
  Search, 
  Shield, 
  Settings2, 
  Info,
  Play
} from 'lucide-react';
import { api } from '@/services/api';
import { useNotificationStore } from '@/store/notifications';
import { useAuthStore } from '@/store/auth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/Loading';

export function SELinux() {
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();
  const { role } = useAuthStore();
  const [boolSearch, setBoolSearch] = useState('');
  
  const isAdmin = role === 'admin';

  // 1. Fetch SELinux status
  const { data: status, isLoading: isStatusLoading } = useQuery({
    queryKey: ['selinux-status'],
    queryFn: api.getSELinuxStatus,
  });

  // 2. Fetch SELinux booleans
  const { data: booleans = [], isLoading: isBoolsLoading } = useQuery({
    queryKey: ['selinux-booleans'],
    queryFn: api.getSELinuxBooleans,
  });

  // 3. Fetch SELinux denials
  const { data: denials = [], isLoading: isDenialsLoading } = useQuery({
    queryKey: ['selinux-denials'],
    queryFn: api.getSELinuxDenials,
  });

  // 4. Update SELinux mode mutation
  const modeMutation = useMutation({
    mutationFn: (mode: 'enforcing' | 'permissive') => api.setSELinuxMode(mode),
    onSuccess: (data) => {
      addToast(data.message, 'success');
      queryClient.invalidateQueries({ queryKey: ['selinux-status'] });
    },
    onError: (err: any) => {
      addToast(`Failed to change SELinux mode: ${err.message}`, 'error');
    }
  });

  // 5. Toggle boolean mutation
  const toggleBoolMutation = useMutation({
    mutationFn: ({ name, value }: { name: string; value: boolean }) => api.toggleSELinuxBoolean(name, value),
    onSuccess: (data) => {
      addToast(data.message, 'success');
      queryClient.invalidateQueries({ queryKey: ['selinux-booleans'] });
    },
    onError: (err: any) => {
      addToast(`Failed to toggle boolean: ${err.message}`, 'error');
    }
  });

  const handleModeChange = (mode: 'enforcing' | 'permissive') => {
    if (!isAdmin) {
      addToast('Administrator role required to change SELinux settings.', 'error');
      return;
    }
    modeMutation.mutate(mode);
  };

  const handleBoolToggle = (name: string, currentValue: boolean) => {
    if (!isAdmin) {
      addToast('Administrator role required to toggle SELinux booleans.', 'error');
      return;
    }
    toggleBoolMutation.mutate({ name, value: !currentValue });
  };

  if (isStatusLoading || isBoolsLoading || isDenialsLoading) {
    return <PageLoader />;
  }

  const isEnforcing = status?.current_mode.toLowerCase() === 'enforcing';
  const isPermissive = status?.current_mode.toLowerCase() === 'permissive';

  // Filter booleans
  const filteredBools = booleans.filter(b => 
    b.name.toLowerCase().includes(boolSearch.toLowerCase()) || 
    (b.description && b.description.toLowerCase().includes(boolSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6 overflow-y-auto h-full pb-10 pr-2">
      {/* Active Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className={`p-6 border-l-4 ${
            isEnforcing 
              ? 'border-l-green-500 bg-green-500/5 dark:bg-green-500/[0.02]' 
              : 'border-l-amber-500 bg-amber-500/5 dark:bg-amber-500/[0.02]'
          }`}>
            <div className="flex gap-4 items-start">
              <div className={`p-3 rounded-lg ${
                isEnforcing ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              }`}>
                {isEnforcing ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  SELinux is active in <span className="underline decoration-wavy">{status?.current_mode}</span> mode.
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Security-Enhanced Linux (SELinux) is a Linux kernel security module that provides a mechanism for supporting access control security policies.
                </p>
              </div>
            </div>
          </Card>

          {/* Mode Selectors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 size={16} className="text-fedora-blue" />
                <span>Configure SELinux Runtime Mode</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Enforcing */}
                <div 
                  onClick={() => handleModeChange('enforcing')}
                  className={`
                    p-4 border rounded-xl cursor-pointer transition-all flex flex-col gap-2
                    ${isEnforcing 
                      ? 'border-fedora-blue bg-fedora-blue/5 dark:bg-fedora-blue/[0.03] ring-1 ring-fedora-blue/50' 
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-card'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Enforcing</span>
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isEnforcing ? 'border-fedora-blue bg-fedora-blue' : 'border-slate-400'}`}>
                      {isEnforcing && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    SELinux policy is enforced. Access is denied based on policy rules, and actions are logged. (Recommended)
                  </p>
                </div>

                {/* Permissive */}
                <div 
                  onClick={() => handleModeChange('permissive')}
                  className={`
                    p-4 border rounded-xl cursor-pointer transition-all flex flex-col gap-2
                    ${isPermissive 
                      ? 'border-amber-500 bg-amber-500/5 dark:bg-amber-500/[0.03] ring-1 ring-amber-500/50' 
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-card'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Permissive</span>
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isPermissive ? 'border-amber-500 bg-amber-500' : 'border-slate-400'}`}>
                      {isPermissive && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    SELinux policy is not enforced. Denial warnings are logged, but operations proceed. Helpful for debugging audits.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/60 rounded-lg text-xs font-semibold text-slate-500">
                <AlertCircle size={16} className="shrink-0 text-slate-400" />
                <span>
                  Note: Toggling this interface calls 'setenforce' to modify the runtime environment. Permanent modifications require editing the configuration file (/etc/selinux/config) on host.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info card */}
        <div>
          <Card className="h-full flex flex-col justify-between">
            <div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info size={16} className="text-fedora-blue" />
                  <span>SELinux System Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center text-xs border-b border-slate-100 dark:border-slate-800/40 pb-2">
                  <span className="text-slate-500 font-medium">SELinux Status</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${status?.enabled ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600'}`}>
                    {status?.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-slate-100 dark:border-slate-800/40 pb-2">
                  <span className="text-slate-500 font-medium">Configuration Mode</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">{status?.config_mode}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Loaded Policy Name</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{status?.policy_type}</span>
                </div>
              </CardContent>
            </div>
          </Card>
        </div>
      </div>

      {/* SELinux Booleans Panel */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
          <CardTitle className="flex items-center gap-2">
            <Shield size={18} className="text-fedora-blue" />
            <span>Policy Parameter Toggles (Booleans)</span>
          </CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search policy parameters..."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-fedora-blue"
              value={boolSearch}
              onChange={(e) => setBoolSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="max-h-[350px] overflow-y-auto pr-2 space-y-3">
          {filteredBools.length > 0 ? (
            filteredBools.map((b) => (
              <div 
                key={b.name}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-850 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 gap-4"
              >
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200">{b.name}</span>
                    {b.current_value !== b.default_value && (
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold uppercase tracking-wider">Modified</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal max-w-xl">{b.description || 'No description available.'}</p>
                </div>
                
                {/* Toggle Switch */}
                <button
                  onClick={() => handleBoolToggle(b.name, b.current_value)}
                  disabled={toggleBoolMutation.isPending}
                  className={`
                    relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none
                    ${b.current_value ? 'bg-fedora-blue' : 'bg-slate-200 dark:bg-slate-800'}
                    ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <span
                    className={`
                      pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                      ${b.current_value ? 'translate-x-4' : 'translate-x-0'}
                    `}
                  />
                </button>
              </div>
            ))
          ) : (
            <div className="text-center text-xs text-slate-500 italic py-6">
              No matching SELinux booleans found.
            </div>
          )}
        </CardContent>
      </Card>

      {/* SELinux AVC Denial Log Auditor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-amber-500" />
            <span>Audit AVC Denial Logs & Troubleshooting</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {denials.length > 0 ? (
            <div className="space-y-4">
              {denials.map((denial, idx) => (
                <div 
                  key={idx} 
                  className="p-4 rounded-xl border border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/10 flex flex-col gap-3"
                >
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 dark:border-slate-850/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">{denial.timestamp}</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                        Class: {denial.tclass}
                      </span>
                      <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 font-bold uppercase tracking-wider">
                        {denial.permission} denied
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] leading-relaxed">
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Process name (Comm)</span>
                      <p className="font-semibold text-slate-700 dark:text-slate-350">{denial.comm}</p>
                    </div>
                    {denial.path && (
                      <div className="space-y-0.5 md:col-span-2">
                        <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Accessed target path</span>
                        <p className="font-semibold text-slate-700 dark:text-slate-350 font-mono break-all">{denial.path}</p>
                      </div>
                    )}
                    <div className="space-y-0.5 md:col-span-3 border-t border-slate-100 dark:border-slate-850/60 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Source security context (scontext)</span>
                        <p className="font-mono text-[10px] text-slate-500 break-all">{denial.scontext}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Target security context (tcontext)</span>
                        <p className="font-mono text-[10px] text-slate-500 break-all">{denial.tcontext}</p>
                      </div>
                    </div>
                  </div>

                  {denial.resolution && (
                    <div className="mt-1 p-3 bg-amber-500/[0.03] border border-amber-500/20 rounded-lg text-xs leading-relaxed">
                      <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mb-1">
                        <Play size={12} /> Suggested Resolution
                      </span>
                      <p className="text-slate-600 dark:text-slate-400 font-semibold">{denial.resolution}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-xs text-slate-500 italic py-6">
              No recent AVC denials detected on this host. System sandbox is clear.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
