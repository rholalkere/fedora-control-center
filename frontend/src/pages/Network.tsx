import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Card, CardContent } from '@/components/ui/Card';
import { useNotificationStore } from '@/store/notifications';
import { useAuthStore } from '@/store/auth';
import { 
  Network as NetIcon, 
  Laptop, 
  Activity, 
  Wifi, 
  Route as RouteIcon, 
  Search, 
  RefreshCw,
  CheckCircle2,
  Ban,
  Unlock,
  BarChart3,
  Clock,
  ChevronLeft,
  ChevronRight,
  Shield,
  ArrowRightLeft
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

type TabType = 'interfaces' | 'devices' | 'analytics' | 'logs' | 'sockets' | 'routes' | 'wifi';

export function Network() {
  const [activeTab, setActiveTab] = useState<TabType>('interfaces');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Analytics and logs pagination/range states
  const [rangeDays, setRangeDays] = useState<number>(7);
  const [logPage, setLogPage] = useState<number>(0);
  const logsPerPage = 15;
  
  // Block Dialog state
  const [blockingDevice, setBlockingDevice] = useState<any | null>(null);
  const [blockReason, setBlockReason] = useState('');

  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();
  const { role } = useAuthStore();
  const isAdmin = role === 'admin';

  // --- Queries ---

  const { data: interfaces = [], isLoading: loadingInterfaces, refetch: refetchInterfaces } = useQuery({
    queryKey: ['network', 'interfaces'],
    queryFn: api.getNetworkInterfaces,
    refetchInterval: 15000
  });

  const { data: devices = [], isLoading: loadingDevices, refetch: refetchDevices } = useQuery({
    queryKey: ['network', 'devices'],
    queryFn: api.getConnectedDevices,
    refetchInterval: 30000
  });

  const { data: blockedDevices = [], refetch: refetchBlocked } = useQuery({
    queryKey: ['network', 'blocked-devices'],
    queryFn: api.getBlockedDevices
  });

  const { data: analyticsData = { history: [], ranking: [] }, isLoading: loadingAnalytics, refetch: refetchAnalytics } = useQuery({
    queryKey: ['network', 'analytics', rangeDays],
    queryFn: () => api.getNetworkUsageAnalytics(rangeDays),
    enabled: activeTab === 'analytics'
  });

  const { data: accessLogs = [], isLoading: loadingLogs, refetch: refetchLogs } = useQuery({
    queryKey: ['network', 'access-logs', logPage, searchQuery],
    queryFn: () => api.getNetworkAccessLogs(logPage * logsPerPage, logsPerPage, undefined, searchQuery),
    enabled: activeTab === 'logs'
  });

  const { data: sockets = [], isLoading: loadingSockets, refetch: refetchSockets } = useQuery({
    queryKey: ['network', 'sockets'],
    queryFn: api.getActiveSockets,
    refetchInterval: 20000
  });

  const { data: routes = [], isLoading: loadingRoutes, refetch: refetchRoutes } = useQuery({
    queryKey: ['network', 'routes'],
    queryFn: api.getNetworkRoutes
  });

  const { data: wifiNetworks = [], isLoading: loadingWifi, refetch: refetchWifi } = useQuery({
    queryKey: ['network', 'wifi'],
    queryFn: api.getWifiNetworks
  });

  // --- Mutations ---

  const blockMutation = useMutation({
    mutationFn: (variables: { mac: string; ip?: string; hostname?: string; reason?: string }) => 
      api.blockDevice(variables.mac, variables.ip, variables.hostname, variables.reason),
    onSuccess: (data) => {
      addToast(data.message || 'Device blocked in firewall.', 'success');
      queryClient.invalidateQueries({ queryKey: ['network', 'blocked-devices'] });
      queryClient.invalidateQueries({ queryKey: ['network', 'devices'] });
      setBlockingDevice(null);
      setBlockReason('');
    },
    onError: (err: any) => {
      addToast(`Block failed: ${err.message}`, 'error');
    }
  });

  const unblockMutation = useMutation({
    mutationFn: (mac: string) => api.unblockDevice(mac),
    onSuccess: (data) => {
      addToast(data.message || 'Device unblocked successfully.', 'success');
      queryClient.invalidateQueries({ queryKey: ['network', 'blocked-devices'] });
      queryClient.invalidateQueries({ queryKey: ['network', 'devices'] });
    },
    onError: (err: any) => {
      addToast(`Unblock failed: ${err.message}`, 'error');
    }
  });

  // --- Helpers ---

  const handleRefresh = () => {
    if (activeTab === 'interfaces') refetchInterfaces();
    else if (activeTab === 'devices') { refetchDevices(); refetchBlocked(); }
    else if (activeTab === 'analytics') refetchAnalytics();
    else if (activeTab === 'logs') refetchLogs();
    else if (activeTab === 'sockets') refetchSockets();
    else if (activeTab === 'routes') refetchRoutes();
    else if (activeTab === 'wifi') refetchWifi();
  };

  const getFormatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };



  const isDeviceBlocked = (mac: string) => {
    return blockedDevices.some((d: any) => d.mac.toLowerCase() === mac.toLowerCase());
  };

  const getBlockedDetails = (mac: string) => {
    return blockedDevices.find((d: any) => d.mac.toLowerCase() === mac.toLowerCase());
  };

  const handleBlockClick = (device: any) => {
    if (!isAdmin) {
      addToast('Administrator role required to block devices.', 'error');
      return;
    }
    setBlockingDevice(device);
  };

  const submitBlock = () => {
    if (!blockingDevice) return;
    blockMutation.mutate({
      mac: blockingDevice.mac,
      ip: blockingDevice.ip,
      hostname: blockingDevice.hostname || undefined,
      reason: blockReason || undefined
    });
  };

  const handleUnblockClick = (mac: string) => {
    if (!isAdmin) {
      addToast('Administrator role required to unblock devices.', 'error');
      return;
    }
    unblockMutation.mutate(mac);
  };

  // Format Recharts data
  const chartData = analyticsData.history.map((pt: any) => {
    return {
      date: new Date(pt.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      Sent: pt.bytes_sent,
      Received: pt.bytes_recv,
      Total: pt.bytes_sent + pt.bytes_recv
    };
  });

  // Styles
  const getInterfaceTypeBadge = (type: string) => {
    const types: Record<string, string> = {
      wifi: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      ethernet: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      bridge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      loopback: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
      virtual: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    };
    return `px-2 py-0.5 text-[10px] font-semibold border rounded-full uppercase tracking-wider ${types[type.toLowerCase()] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`;
  };

  const getStatusBadge = (state: string) => {
    const isConnected = state.toLowerCase().includes('connected') || state.toLowerCase() === 'up' || state.toLowerCase() === 'reachable';
    if (isConnected) {
      return 'bg-green-500/10 text-green-400 border-green-500/20';
    }
    return 'bg-red-500/10 text-red-400 border-red-500/20';
  };

  const getVendorBadgeColor = (vendor: string) => {
    const v = vendor.toLowerCase();
    if (v.includes('apple')) return 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-700';
    if (v.includes('google')) return 'bg-red-500/10 text-red-400 border-red-500/20';
    if (v.includes('samsung')) return 'bg-blue-600/10 text-blue-400 border-blue-600/20';
    if (v.includes('tp-link')) return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    if (v.includes('intel')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (v.includes('docker')) return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  };

  return (
    <div className="space-y-6 overflow-y-auto h-full pb-10 pr-2">
      
      {/* Overview Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-slate-900 border-slate-800/80 shadow-md">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Interfaces</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {interfaces.filter((i: any) => i.is_up).length} <span className="text-xs font-normal text-slate-500">/ {interfaces.length} UP</span>
              </h3>
            </div>
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
              <NetIcon size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-slate-900 border-slate-800/80 shadow-md">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Devices Blocked</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {blockedDevices.length} <span className="text-xs font-normal text-slate-500">Firewall Rules</span>
              </h3>
            </div>
            <div className="p-2.5 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20">
              <Ban size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-slate-900 border-slate-800/80 shadow-md">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Sockets</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {sockets.filter((s: any) => s.state === 'ESTABLISHED').length} <span className="text-xs font-normal text-slate-500">ESTAB</span>
              </h3>
            </div>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <Activity size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-slate-900 border-slate-800/80 shadow-md">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Routes</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {routes.length} <span className="text-xs font-normal text-slate-500">Active</span>
              </h3>
            </div>
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
              <RouteIcon size={20} />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs Menu Navigation Bar */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-slate-900 border border-slate-800/80 p-2 rounded-xl">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => { setActiveTab('interfaces'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${activeTab === 'interfaces' ? 'bg-fedora-blue text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
          >
            <NetIcon size={13} /> Interfaces
          </button>
          <button
            onClick={() => { setActiveTab('devices'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${activeTab === 'devices' ? 'bg-fedora-blue text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
          >
            <Laptop size={13} /> Neighbors
          </button>
          <button
            onClick={() => { setActiveTab('analytics'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${activeTab === 'analytics' ? 'bg-fedora-blue text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
          >
            <BarChart3 size={13} /> Usage Analytics
          </button>
          <button
            onClick={() => { setActiveTab('logs'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${activeTab === 'logs' ? 'bg-fedora-blue text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
          >
            <Clock size={13} /> Access Logs
          </button>
          <button
            onClick={() => { setActiveTab('sockets'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${activeTab === 'sockets' ? 'bg-fedora-blue text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
          >
            <Activity size={13} /> Sockets
          </button>
          <button
            onClick={() => { setActiveTab('routes'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${activeTab === 'routes' ? 'bg-fedora-blue text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
          >
            <RouteIcon size={13} /> Routes
          </button>
          <button
            onClick={() => { setActiveTab('wifi'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${activeTab === 'wifi' ? 'bg-fedora-blue text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
          >
            <Wifi size={13} /> Wi-Fi Scan
          </button>
        </div>

        {/* Toolbar Controls */}
        <div className="flex w-full xl:w-auto items-center justify-end gap-2">
          {activeTab === 'analytics' && (
            <div className="flex bg-slate-950 border border-slate-800/80 p-0.5 rounded-lg">
              <button onClick={() => setRangeDays(7)} className={`px-2.5 py-1 text-[10px] font-bold rounded-md ${rangeDays === 7 ? 'bg-fedora-blue text-white' : 'text-slate-500'}`}>7D</button>
              <button onClick={() => setRangeDays(15)} className={`px-2.5 py-1 text-[10px] font-bold rounded-md ${rangeDays === 15 ? 'bg-fedora-blue text-white' : 'text-slate-500'}`}>15D</button>
              <button onClick={() => setRangeDays(30)} className={`px-2.5 py-1 text-[10px] font-bold rounded-md ${rangeDays === 30 ? 'bg-fedora-blue text-white' : 'text-slate-500'}`}>30D</button>
            </div>
          )}

          {activeTab !== 'analytics' && activeTab !== 'routes' && (
            <div className="relative flex-1 xl:flex-none">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder={activeTab === 'logs' ? "Search domain/IP..." : "Search..."}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setLogPage(0);
                }}
                className="w-full xl:w-56 bg-slate-950 border border-slate-800/80 rounded-lg px-3 py-1.5 pl-9 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-fedora-blue"
              />
            </div>
          )}

          <button
            onClick={handleRefresh}
            className="p-2 bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700/50 transition-colors"
            title="Refresh current data"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Main Tab content */}
      <Card className="bg-slate-900 border-slate-800/80 shadow-md">
        <CardContent className="p-0">
          
          {/* TAB 1: INTERFACES */}
          {activeTab === 'interfaces' && (
            <div className="overflow-x-auto">
              {loadingInterfaces ? (
                <div className="flex flex-col items-center justify-center p-20 space-y-4">
                  <RefreshCw className="animate-spin text-fedora-blue" size={32} />
                  <p className="text-sm text-slate-500">Querying system interfaces...</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="p-4">Interface</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">State</th>
                      <th className="p-4">IPv4</th>
                      <th className="p-4">IPv6</th>
                      <th className="p-4">MAC Address</th>
                      <th className="p-4">Speed / MTU</th>
                      <th className="p-4 text-right">Traffic</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {interfaces
                      .filter((i: any) => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((iface: any) => (
                        <tr key={iface.name} className="hover:bg-slate-800/20 text-slate-300">
                          <td className="p-4 font-bold text-white">{iface.name}</td>
                          <td className="p-4"><span className={getInterfaceTypeBadge(iface.type)}>{iface.type}</span></td>
                          <td className="p-4"><span className={`px-2 py-0.5 text-[10px] font-semibold border rounded-full ${getStatusBadge(iface.state)}`}>{iface.state}</span></td>
                          <td className="p-4 font-mono text-slate-400">{iface.ip_ipv4 || '--'}</td>
                          <td className="p-4 font-mono text-slate-500 text-[10px] max-w-[150px] truncate" title={iface.ip_ipv6}>{iface.ip_ipv6 || '--'}</td>
                          <td className="p-4 font-mono text-slate-400">{iface.mac || '--'}</td>
                          <td className="p-4">
                            {iface.speed ? `${iface.speed} Mbps` : '--'}
                            <span className="text-slate-500 block text-[10px]">MTU: {iface.mtu}</span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-3 text-[10px] font-mono">
                              <div><span className="text-blue-400">TX:</span> {getFormatBytes(iface.bytes_sent)}</div>
                              <div><span className="text-emerald-400">RX:</span> {getFormatBytes(iface.bytes_recv)}</div>
                            </div>
                          </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 2: CONNECTED DEVICES (NEIGHBORS) */}
          {activeTab === 'devices' && (
            <div className="overflow-x-auto">
              {loadingDevices ? (
                <div className="flex flex-col items-center justify-center p-20 space-y-4">
                  <RefreshCw className="animate-spin text-fedora-blue" size={32} />
                  <p className="text-sm text-slate-500">Scanning connected neighbor devices...</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="p-4">Device IP</th>
                      <th className="p-4">Hostname</th>
                      <th className="p-4">Vendor</th>
                      <th className="p-4">MAC Address</th>
                      <th className="p-4">Interface</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Firewall Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {devices
                      .filter((d: any) => 
                        d.ip.includes(searchQuery) || 
                        d.mac.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (d.hostname && d.hostname.toLowerCase().includes(searchQuery.toLowerCase())) || 
                        (d.vendor && d.vendor.toLowerCase().includes(searchQuery.toLowerCase()))
                      )
                      .map((device: any, idx: number) => {
                        const blocked = isDeviceBlocked(device.mac);
                        const blockDetails = getBlockedDetails(device.mac);
                        return (
                          <tr key={`${device.ip}_${idx}`} className="hover:bg-slate-800/20 text-slate-300">
                            <td className="p-4 font-mono font-semibold text-white">{device.ip}</td>
                            <td className="p-4">{device.hostname || <span className="text-slate-600 italic">Unresolved</span>}</td>
                            <td className="p-4">
                              <span className={`px-2.5 py-0.5 text-[10px] font-bold border rounded-lg uppercase ${getVendorBadgeColor(device.vendor)}`}>
                                {device.vendor || 'Unknown'}
                              </span>
                            </td>
                            <td className="p-4 font-mono text-slate-400">{device.mac}</td>
                            <td className="p-4 font-semibold text-slate-500">{device.interface}</td>
                            <td className="p-4">
                              {blocked ? (
                                <span className="flex items-center gap-1 w-fit text-[10px] font-bold text-red-500 border border-red-500/20 bg-red-500/10 px-2 py-0.5 rounded-full uppercase" title={blockDetails?.reason}>
                                  <Shield size={10} /> Blocked
                                </span>
                              ) : (
                                <span className={`px-2 py-0.5 text-[10px] font-semibold border rounded-full ${getStatusBadge(device.status)}`}>
                                  {device.status}
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              {blocked ? (
                                <button
                                  onClick={() => handleUnblockClick(device.mac)}
                                  disabled={unblockMutation.isPending}
                                  className="flex items-center gap-1.5 mx-auto bg-green-500 hover:bg-green-600 text-white font-bold text-[10px] px-2.5 py-1 rounded transition-colors uppercase tracking-wider"
                                >
                                  <Unlock size={11} /> Unblock
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleBlockClick(device)}
                                  className="flex items-center gap-1.5 mx-auto bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 font-bold text-[10px] px-2.5 py-1 rounded transition-all uppercase tracking-wider"
                                >
                                  <Ban size={11} /> Block Access
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 3: USAGE ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="p-6 space-y-6">
              {loadingAnalytics ? (
                <div className="flex flex-col items-center justify-center p-10 space-y-4">
                  <RefreshCw className="animate-spin text-fedora-blue" size={32} />
                  <p className="text-sm text-slate-500">Querying data usage history tables...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Traffic Graph */}
                  <div className="lg:col-span-2 space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Activity size={14} className="text-fedora-blue" />
                      Bandwidth Usage History ({rangeDays} Days)
                    </h4>
                    <div className="h-64 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                      {chartData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-xs text-slate-500">No data stored yet. Logging daemon active.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                            <defs>
                              <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorRecv" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="date" stroke="#475569" fontSize={9} tickLine={false} />
                            <YAxis 
                              stroke="#475569" 
                              fontSize={9} 
                              tickLine={false}
                              tickFormatter={(v) => getFormatBytes(v).split(' ')[0]} 
                            />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                              labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }}
                              itemStyle={{ fontSize: '11px' }}
                              formatter={(v: any) => [getFormatBytes(v), undefined]}
                            />
                            <Area type="monotone" dataKey="Sent" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSent)" strokeWidth={2} />
                            <Area type="monotone" dataKey="Received" stroke="#10b981" fillOpacity={1} fill="url(#colorRecv)" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  {/* Traffic Ranking */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Laptop size={14} className="text-fedora-blue" />
                      Top Bandwidth Consumers
                    </h4>
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 h-64 overflow-y-auto divide-y divide-slate-800/40">
                      {analyticsData.ranking.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-xs text-slate-500">No traffic logs.</div>
                      ) : (
                        analyticsData.ranking.map((device: any, index: number) => (
                          <div key={device.mac} className="flex justify-between items-center py-2 text-xs first:pt-0 last:pb-0">
                            <div className="truncate max-w-[150px]">
                              <span className="font-mono text-slate-500 block text-[9px]">#{index+1} - {device.mac}</span>
                              <span className="font-bold text-slate-200">{device.hostname || device.ip}</span>
                            </div>
                            <div className="text-right font-mono text-[10px]">
                              <span className="font-bold text-white block">{getFormatBytes(device.total_bytes)}</span>
                              <span className="text-slate-500 text-[9px]">TX: {getFormatBytes(device.bytes_sent)} | RX: {getFormatBytes(device.bytes_recv)}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* TAB 4: ACCESS LOGS */}
          {activeTab === 'logs' && (
            <div>
              <div className="overflow-x-auto">
                {loadingLogs ? (
                  <div className="flex flex-col items-center justify-center p-20 space-y-4">
                    <RefreshCw className="animate-spin text-fedora-blue" size={32} />
                    <p className="text-sm text-slate-500">Loading network connections history...</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="p-4">Time</th>
                        <th className="p-4">Source Device</th>
                        <th className="p-4"></th>
                        <th className="p-4">Destination IP</th>
                        <th className="p-4">Resolved Domain</th>
                        <th className="p-4">Port</th>
                        <th className="p-4 text-right">Data Exchanged</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                      {accessLogs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-10 text-center text-slate-500 italic">No network connection logs found.</td>
                        </tr>
                      ) : (
                        accessLogs.map((log: any) => (
                          <tr key={log.id} className="hover:bg-slate-800/20">
                            <td className="p-4 text-slate-500 text-[10px]" title={log.timestamp}>
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              <span className="block text-[8px]">{new Date(log.timestamp).toLocaleDateString()}</span>
                            </td>
                            <td className="p-4 text-slate-200 font-semibold">
                              {log.source_ip}
                              {log.source_hostname && <span className="text-slate-500 block text-[9px] font-normal font-sans">{log.source_hostname}</span>}
                            </td>
                            <td className="p-4 text-slate-600"><ArrowRightLeft size={12} /></td>
                            <td className="p-4 text-slate-400">{log.destination_ip}</td>
                            <td className="p-4 text-blue-400 font-sans font-semibold">{log.destination_domain || <span className="text-slate-600 font-mono italic">unresolved</span>}</td>
                            <td className="p-4 font-bold text-white">{log.destination_port}</td>
                            <td className="p-4 text-right text-[10px]">
                              <div>Sent: {getFormatBytes(log.bytes_sent)}</div>
                              <div className="text-slate-500">Recv: {getFormatBytes(log.bytes_recv)}</div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination Controls */}
              <div className="flex justify-between items-center p-4 border-t border-slate-800 bg-slate-950/20">
                <button
                  disabled={logPage === 0 || loadingLogs}
                  onClick={() => setLogPage(prev => Math.max(0, prev - 1))}
                  className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs px-3 py-1.5 rounded transition-colors"
                >
                  <ChevronLeft size={14} /> Newer Logs
                </button>
                <span className="text-xs text-slate-500 font-medium">Page {logPage + 1}</span>
                <button
                  disabled={accessLogs.length < logsPerPage || loadingLogs}
                  onClick={() => setLogPage(prev => prev + 1)}
                  className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs px-3 py-1.5 rounded transition-colors"
                >
                  Older Logs <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: ACTIVE SOCKETS */}
          {activeTab === 'sockets' && (
            <div className="overflow-x-auto">
              {loadingSockets ? (
                <div className="flex flex-col items-center justify-center p-20 space-y-4">
                  <RefreshCw className="animate-spin text-fedora-blue" size={32} />
                  <p className="text-sm text-slate-500">Retrieving active connection sockets...</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="p-4">Protocol</th>
                      <th className="p-4">State</th>
                      <th className="p-4">Local Address</th>
                      <th className="p-4">Local Port</th>
                      <th className="p-4">Peer Address</th>
                      <th className="p-4">Peer Port</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                    {sockets
                      .filter((s: any) => 
                        s.proto.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        s.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.local_address.includes(searchQuery) ||
                        s.local_port.toString().includes(searchQuery) ||
                        s.peer_address.includes(searchQuery)
                      )
                      .map((socket: any, idx: number) => (
                        <tr key={`${socket.local_port}_${idx}`} className="hover:bg-slate-800/20">
                          <td className="p-4">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${socket.proto === 'tcp' ? 'bg-blue-500/15 text-blue-400' : 'bg-amber-500/15 text-amber-400'}`}>
                              {socket.proto}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`font-semibold ${socket.state === 'LISTEN' ? 'text-amber-500' : socket.state === 'ESTABLISHED' ? 'text-green-400' : 'text-slate-500'}`}>
                              {socket.state}
                            </span>
                          </td>
                          <td className="p-4 text-slate-300">{socket.local_address}</td>
                          <td className="p-4 font-bold text-white">{socket.local_port}</td>
                          <td className="p-4 text-slate-400">{socket.peer_address}</td>
                          <td className="p-4 text-slate-400">{socket.peer_port !== null ? socket.peer_port : '--'}</td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 6: ROUTING TABLE */}
          {activeTab === 'routes' && (
            <div className="overflow-x-auto">
              {loadingRoutes ? (
                <div className="flex flex-col items-center justify-center p-20 space-y-4">
                  <RefreshCw className="animate-spin text-fedora-blue" size={32} />
                  <p className="text-sm text-slate-500">Retrieving system routing table...</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse font-mono text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="p-4">Destination</th>
                      <th className="p-4">Gateway</th>
                      <th className="p-4">Interface</th>
                      <th className="p-4">Source IP</th>
                      <th className="p-4">Metric</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {routes.map((route: any, idx: number) => (
                      <tr key={`${route.destination}_${idx}`} className="hover:bg-slate-800/20">
                        <td className="p-4 font-bold text-white">{route.destination}</td>
                        <td className="p-4">{route.gateway || <span className="text-slate-600 italic">None (Direct Link)</span>}</td>
                        <td className="p-4 text-slate-400">{route.interface}</td>
                        <td className="p-4 text-slate-400">{route.source || '--'}</td>
                        <td className="p-4 text-slate-500">{route.metric !== null ? route.metric : '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 7: WI-FI SCAN */}
          {activeTab === 'wifi' && (
            <div className="overflow-x-auto">
              {loadingWifi ? (
                <div className="flex flex-col items-center justify-center p-20 space-y-4">
                  <RefreshCw className="animate-spin text-fedora-blue" size={32} />
                  <p className="text-sm text-slate-500">Scanning local Wi-Fi frequencies...</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="p-4">SSID (Network Name)</th>
                      <th className="p-4">BSSID (MAC)</th>
                      <th className="p-4">Channel</th>
                      <th className="p-4">Max Bitrate</th>
                      <th className="p-4">Signal (dBm/%)</th>
                      <th className="p-4">Bars</th>
                      <th className="p-4">Security Mode</th>
                      <th className="p-4">Connection</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {wifiNetworks
                      .filter((w: any) => w.ssid.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((net: any) => (
                        <tr key={net.bssid} className="hover:bg-slate-800/20">
                          <td className="p-4 font-semibold text-white flex items-center gap-2">
                            <Wifi size={14} className={net.is_connected ? 'text-green-400' : 'text-slate-500'} />
                            {net.ssid}
                          </td>
                          <td className="p-4 font-mono text-xs text-slate-400">{net.bssid}</td>
                          <td className="p-4 font-mono text-slate-400">{net.channel}</td>
                          <td className="p-4 text-slate-400">{net.rate}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-300">{net.signal}%</span>
                              <div className="w-16 bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                                <div 
                                  className={`h-full rounded-full ${net.signal > 75 ? 'bg-green-500' : net.signal > 45 ? 'bg-amber-500' : 'bg-red-500'}`}
                                  style={{ width: `${net.signal}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-4 font-mono text-slate-400">{net.bars}</td>
                          <td className="p-4 text-slate-400">{net.security}</td>
                          <td className="p-4">
                            {net.is_connected ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 border border-green-500/20 bg-green-500/10 px-2 py-0.5 rounded-full w-fit uppercase">
                                <CheckCircle2 size={10} /> Connected
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 border border-slate-800 bg-slate-950 px-2 py-0.5 rounded-full w-fit uppercase">
                                Available
                              </span>
                            )}
                          </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

        </CardContent>
      </Card>

      {/* MODAL: BLOCK DEVICE */}
      {blockingDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-500 border-b border-slate-800 pb-3">
              <Ban size={22} />
              <div>
                <h3 className="font-bold text-white text-base">Block Device Network Access</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Firewall Dropping Configuration</p>
              </div>
            </div>
            
            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1 font-mono text-slate-400">
                <div><span className="text-slate-600">IP Address:</span> {blockingDevice.ip}</div>
                <div><span className="text-slate-600">MAC Address:</span> {blockingDevice.mac}</div>
                <div><span className="text-slate-600">Hostname:</span> {blockingDevice.hostname || 'Unresolved'}</div>
                <div><span className="text-slate-600">Vendor:</span> {blockingDevice.vendor || 'Unknown'}</div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Blocking Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Unauthorized access, parental lock..."
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/40 transition-all placeholder:text-slate-700"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setBlockingDevice(null); setBlockReason(''); }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitBlock}
                disabled={blockMutation.isPending}
                className="bg-red-600 hover:bg-red-700 disabled:bg-slate-800 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
              >
                {blockMutation.isPending ? 'Blocking...' : 'Confirm Block'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
