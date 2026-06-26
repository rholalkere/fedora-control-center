import { useEffect, useState } from 'react';
import { 
  Cpu, 
  HardDrive, 
  Network, 
  Activity, 
  Server, 
  Compass, 
  Clock,
  Zap,
  Search,
  RefreshCw
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useTelemetry } from '@/hooks/useTelemetry';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/Loading';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useNotificationStore } from '@/store/notifications';
import { useAuthStore } from '@/store/auth';

// Helper to format bytes to human readable form
const formatBytes = (bytes: number, decimals = 2) => {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Helper to format seconds to human readable uptime
const formatUptime = (seconds: number) => {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
};

export function Dashboard() {
  const { metrics } = useTelemetry();
  const [history, setHistory] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [processSearch, setProcessSearch] = useState('');

  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();
  const { role } = useAuthStore();
  const isAdmin = role === 'admin';

  const { data: powerData, isLoading: loadingPower } = useQuery({
    queryKey: ['system', 'power-profile'],
    queryFn: api.getPowerProfile
  });

  const { data: processes = [], isLoading: loadingProcesses, refetch: refetchProcesses } = useQuery({
    queryKey: ['system', 'processes'],
    queryFn: api.getProcesses,
    refetchInterval: 10000
  });

  const setPowerProfileMutation = useMutation({
    mutationFn: (profile: string) => api.setPowerProfile(profile),
    onSuccess: (data) => {
      addToast(data.message || 'Power profile switched successfully.', 'success');
      queryClient.invalidateQueries({ queryKey: ['system', 'power-profile'] });
    },
    onError: (err: any) => {
      addToast(`Failed to set power profile: ${err.message}`, 'error');
    }
  });

  const killProcessMutation = useMutation({
    mutationFn: (pid: number) => api.killProcess(pid),
    onSuccess: (data) => {
      addToast(data.message || 'Process terminated.', 'success');
      queryClient.invalidateQueries({ queryKey: ['system', 'processes'] });
    },
    onError: (err: any) => {
      addToast(`Failed to kill process: ${err.message}`, 'error');
    }
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update scrolling history buffer
  useEffect(() => {
    if (metrics) {
      setHistory((prev) => {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const newPoint = {
          time: timestamp,
          cpu: metrics.cpu.usage_percent,
          ram: metrics.ram.percent
        };
        const nextHist = [...prev, newPoint];
        if (nextHist.length > 20) {
          nextHist.shift(); // keep last 20 points
        }
        return nextHist;
      });
    }
  }, [metrics]);

  if (!metrics) {
    return <PageLoader />;
  }

  const { host, cpu, ram, disks, network, gpu } = metrics;

  return (
    <div className="space-y-6 overflow-y-auto h-full pb-10 pr-2">
      {/* Top Metadata Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="flex items-center p-4 gap-4">
          <div className="p-3 rounded-lg bg-fedora-blue/10 text-fedora-blue">
            <Server size={20} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Hostname</p>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{host.hostname}</h4>
          </div>
        </Card>

        <Card className="flex items-center p-4 gap-4">
          <div className="p-3 rounded-lg bg-purple-500/10 text-purple-500">
            <Compass size={20} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">OS Version</p>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{host.os_name} {host.os_version}</h4>
          </div>
        </Card>

        <Card className="flex items-center p-4 gap-4">
          <div className="p-3 rounded-lg bg-teal-500/10 text-teal-500">
            <Activity size={20} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Kernel Version</p>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px]" title={host.kernel}>
              {host.kernel}
            </h4>
          </div>
        </Card>

        <Card className="flex items-center p-4 gap-4">
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-500">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Uptime</p>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{formatUptime(host.uptime)}</h4>
          </div>
        </Card>
      </div>

      {/* Main Graph & Metric Progress Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Graph */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
            <CardTitle className="flex items-center gap-2">
              <Activity size={18} className="text-fedora-blue" />
              <span>Real-time Utilization (%)</span>
            </CardTitle>
            <div className="flex gap-3 text-xs font-semibold bg-slate-100 dark:bg-slate-800/60 px-3 py-1 rounded-lg self-start sm:self-auto">
              <span className="flex items-center gap-1.5 text-fedora-blue">
                <span className="w-2 h-2 rounded-full bg-fedora-blue animate-pulse" />
                CPU: {cpu.usage_percent}%
              </span>
              <span className="flex items-center gap-1.5 text-purple-500">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                RAM: {ram.percent}%
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-[220px] md:min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={history}
                margin={{ 
                  top: 10, 
                  right: 5, 
                  left: isMobile ? -25 : -15, 
                  bottom: 0 
                }}
              >
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3c6eb4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3c6eb4" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="time" 
                  stroke="#64748b" 
                  fontSize={9} 
                  tickLine={false} 
                  interval={isMobile ? 5 : 'preserveEnd'} 
                />
                <YAxis 
                  domain={[0, 100]} 
                  stroke="#64748b" 
                  fontSize={9} 
                  tickLine={false} 
                  width={isMobile ? 22 : 30}
                  tickCount={isMobile ? 3 : 5}
                />
                <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#f1f5f9' }} />
                <Area type="monotone" dataKey="cpu" name="CPU Usage" stroke="#3c6eb4" strokeWidth={2} fillOpacity={1} fill="url(#colorCpu)" />
                <Area type="monotone" dataKey="ram" name="RAM Usage" stroke="#8884d8" strokeWidth={2} fillOpacity={1} fill="url(#colorRam)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quick Resource Meters */}
        <div className="space-y-4">
          {/* CPU Card */}
          <Card className="p-5">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Cpu size={18} className="text-fedora-blue" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">CPU Usage</span>
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{cpu.usage_percent}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-fedora-blue h-full rounded-full transition-all duration-500" 
                style={{ width: `${cpu.usage_percent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-medium">
              <span>{cpu.cores_physical} Cores ({cpu.cores_logical} Threads)</span>
              <span>Temp: {cpu.temperature_c?.toFixed(1) || '0'}°C</span>
            </div>
          </Card>

          {/* RAM Card */}
          <Card className="p-5">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-purple-500" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">RAM Usage</span>
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{ram.percent}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-purple-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${ram.percent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-medium">
              <span>Used: {formatBytes(ram.used)}</span>
              <span>Total: {formatBytes(ram.total)}</span>
            </div>
          </Card>

          {/* Disk Card */}
          <Card className="p-5">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <HardDrive size={18} className="text-teal-500" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Disk Usage (root)</span>
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {disks[0]?.percent ?? 0}%
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-teal-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${disks[0]?.percent ?? 0}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-medium">
              <span>Free: {formatBytes(disks[0]?.free ?? 0)}</span>
              <span>Total: {formatBytes(disks[0]?.total ?? 0)}</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Network & GPU Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network size={18} className="text-fedora-blue" />
              <span>Network Statistics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(network).map(([iface, net]: [string, any]) => (
              <div key={iface} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/40 pb-2 last:border-b-0">
                <div>
                  <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300">{iface}</h5>
                  <p className="text-[10px] text-slate-500 font-medium">Bytes Sent/Received</p>
                </div>
                <div className="text-right text-xs">
                  <p className="text-slate-800 dark:text-slate-200">Tx: {formatBytes(net.bytes_sent)}</p>
                  <p className="text-slate-800 dark:text-slate-200">Rx: {formatBytes(net.bytes_recv)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu size={18} className="text-amber-500" />
              <span>GPU Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {gpu.map((item: any, idx: number) => (
              <div key={idx} className="space-y-2 border-b border-slate-100 dark:border-slate-800/40 pb-3 last:border-b-0">
                <div className="flex justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300">{item.model}</h5>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold uppercase tracking-wider">{item.vendor}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Load: {item.load_percent}%</p>
                    <p className="text-[10px] text-slate-500 font-medium">Temp: {item.temperature_c ?? 0}°C</p>
                  </div>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${item.load_percent}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                  <span>VRAM: {formatBytes(item.memory_used)} / {formatBytes(item.memory_total)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Performance Tuning & Process Control */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Power Profile Card */}
        <Card className="xl:col-span-1 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/40 pb-3 mb-4">
              <Zap className="text-amber-500" size={18} />
              <h4 className="text-sm font-bold text-slate-850 dark:text-slate-200">System Power Profile</h4>
            </div>
            {loadingPower ? (
              <div className="flex items-center justify-center py-6">
                <RefreshCw className="animate-spin text-slate-500" size={18} />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-100 dark:border-slate-800/40">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Current Profile</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block mt-1 uppercase ${
                      powerData?.active_profile === 'performance' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      powerData?.active_profile === 'power-saver' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                      'bg-fedora-blue/10 text-fedora-blue border border-fedora-blue/20'
                    }`}>
                      {powerData?.active_profile}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Driver Daemon</span>
                    <span className="text-xs text-slate-400 font-mono">{powerData?.driver}</span>
                  </div>
                </div>

                {isAdmin && (
                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Change Active Profile</span>
                    <div className="grid grid-cols-3 gap-2">
                      {powerData?.profiles?.map((profile: string) => (
                        <button
                          key={profile}
                          onClick={() => setPowerProfileMutation.mutate(profile)}
                          disabled={setPowerProfileMutation.isPending || powerData?.active_profile === profile}
                          className={`px-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                            powerData?.active_profile === profile
                              ? 'bg-fedora-blue border-fedora-blue text-white'
                              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800/60 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/30'
                          }`}
                        >
                          {profile}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="text-[9px] text-slate-500 mt-4 leading-relaxed">
            Powered by Fedora's <code>power-profiles-daemon</code>. Profiles alter CPU/GPU scaling governor settings dynamically to conserve power or maximize frame-rates.
          </p>
        </Card>

        {/* Process Monitor Card */}
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
            <CardTitle className="flex items-center gap-2">
              <Activity size={18} className="text-red-500" />
              <span>Host Processes</span>
            </CardTitle>
            <div className="flex w-full sm:w-auto items-center gap-2">
              <div className="relative flex-1 sm:w-48">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search processes..."
                  value={processSearch}
                  onChange={(e) => setProcessSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 pl-8 pr-3 py-2 rounded-lg focus:outline-none focus:border-fedora-blue transition-all"
                />
              </div>
              <button
                onClick={() => refetchProcesses()}
                className="p-2 bg-slate-950 border border-slate-800 hover:bg-slate-800/30 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
                title="Refresh processes list"
              >
                <RefreshCw size={12} className={loadingProcesses ? 'animate-spin' : ''} />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingProcesses ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="animate-spin text-slate-500" size={24} />
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[280px] overflow-y-auto border border-slate-800 rounded-lg bg-slate-950/40">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider z-10">
                    <tr>
                      <th className="p-3">PID</th>
                      <th className="p-3">Process Name</th>
                      <th className="p-3">User</th>
                      <th className="p-3 text-right">CPU %</th>
                      <th className="p-3 text-right">RAM %</th>
                      {isAdmin && <th className="p-3 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-300 font-mono text-[11px]">
                    {processes
                      .filter((p: any) => p.name.toLowerCase().includes(processSearch.toLowerCase()))
                      .slice(0, 50)
                      .map((proc: any) => (
                        <tr key={proc.pid} className="hover:bg-slate-800/10">
                          <td className="p-3 text-slate-500">{proc.pid}</td>
                          <td className="p-3 font-semibold text-white truncate max-w-[150px]" title={proc.cmdline || proc.name}>
                            {proc.name}
                          </td>
                          <td className="p-3 text-slate-400 truncate max-w-[80px]" title={proc.username}>
                            {proc.username}
                          </td>
                          <td className={`p-3 text-right font-bold ${proc.cpu_percent > 30 ? 'text-orange-400' : 'text-slate-300'}`}>
                            {proc.cpu_percent}%
                          </td>
                          <td className={`p-3 text-right font-bold ${proc.memory_percent > 5 ? 'text-purple-400' : 'text-slate-300'}`}>
                            {proc.memory_percent}%
                          </td>
                          {isAdmin && (
                            <td className="p-3 text-right">
                              <button
                                onClick={() => killProcessMutation.mutate(proc.pid)}
                                disabled={killProcessMutation.isPending}
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                              >
                                Kill
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
