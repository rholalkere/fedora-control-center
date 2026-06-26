import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Plus, Trash2, Globe, Server, Check } from 'lucide-react';
import { api } from '@/services/api';
import { useNotificationStore } from '@/store/notifications';
import { useAuthStore } from '@/store/auth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/Loading';
import { Dialog } from '@/components/ui/Dialog';

export function Firewall() {
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();
  const { role } = useAuthStore();
  
  const [selectedZone, setSelectedZone] = useState<string>('public');
  const [isPortModalOpen, setIsPortModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);

  // Forms inputs
  const [portNum, setPortNum] = useState('');
  const [portProtocol, setPortProtocol] = useState<'tcp' | 'udp'>('tcp');
  const [serviceName, setServiceName] = useState('');

  const isAdmin = role === 'admin';

  // 1. Fetch firewall zones query
  const { data: zones, isLoading } = useQuery({
    queryKey: ['firewall-zones'],
    queryFn: api.getFirewallZones,
  });

  // Active zone record
  const activeZoneData = zones?.find((z) => z.name === selectedZone);

  // 2. Manage port mutation
  const portMutation = useMutation({
    mutationFn: ({ zone, port, protocol, action }: { zone: string; port: string; protocol: 'tcp' | 'udp'; action: 'add' | 'remove' }) =>
      api.manageFirewallPort(zone, port, protocol, action),
    onSuccess: (data) => {
      addToast(data.message, 'success');
      queryClient.invalidateQueries({ queryKey: ['firewall-zones'] });
      setIsPortModalOpen(false);
      setPortNum('');
    },
    onError: (err: any) => {
      addToast(`Port modification failed: ${err.message}`, 'error');
    }
  });

  // 3. Manage service mutation
  const serviceMutation = useMutation({
    mutationFn: ({ zone, service, action }: { zone: string; service: string; action: 'add' | 'remove' }) =>
      api.manageFirewallService(zone, service, action),
    onSuccess: (data) => {
      addToast(data.message, 'success');
      queryClient.invalidateQueries({ queryKey: ['firewall-zones'] });
      setIsServiceModalOpen(false);
      setServiceName('');
    },
    onError: (err: any) => {
      addToast(`Service modification failed: ${err.message}`, 'error');
    }
  });

  const handleAddPortSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      addToast('Administrator role required to modify firewall rules.', 'error');
      return;
    }
    portMutation.mutate({ zone: selectedZone, port: portNum, protocol: portProtocol, action: 'add' });
  };

  const handleRemovePort = (portWithProto: string) => {
    if (!isAdmin) {
      addToast('Administrator role required to modify firewall rules.', 'error');
      return;
    }
    // format: 80/tcp
    const [port, proto] = portWithProto.split('/');
    portMutation.mutate({ zone: selectedZone, port, protocol: proto as any, action: 'remove' });
  };

  const handleAddServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      addToast('Administrator role required to modify firewall rules.', 'error');
      return;
    }
    serviceMutation.mutate({ zone: selectedZone, service: serviceName, action: 'add' });
  };

  const handleRemoveService = (service: string) => {
    if (!isAdmin) {
      addToast('Administrator role required to modify firewall rules.', 'error');
      return;
    }
    serviceMutation.mutate({ zone: selectedZone, service, action: 'remove' });
  };

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6 overflow-y-auto h-full pb-10 pr-2">
      {/* Top selection bar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Zones selection column */}
        <Card className="lg:col-span-1 p-4 flex flex-col gap-2 bg-slate-50 dark:bg-card">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-2 mb-2">FirewallD Zones</p>
          {zones?.map((zone) => (
            <button
              key={zone.name}
              onClick={() => setSelectedZone(zone.name)}
              className={`
                w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-left transition-all
                ${zone.name === selectedZone 
                  ? 'bg-fedora-blue text-white shadow-sm' 
                  : 'hover:bg-slate-200/50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <Shield size={14} />
                <span>{zone.name}</span>
              </div>
              {zone.active && (
                <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-white/20 text-white`}>
                  Active
                </span>
              )}
            </button>
          ))}
        </Card>

        {/* Zone Details Area */}
        <div className="lg:col-span-3 space-y-6">
          {activeZoneData && (
            <>
              {/* Zone Details summary */}
              <Card className="p-5 flex items-center justify-between bg-slate-50 dark:bg-card">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 capitalize">Zone: {activeZoneData.name}</h4>
                  <div className="flex gap-4 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Globe size={13} />
                      <span>Interfaces: {activeZoneData.interfaces.join(', ') || 'none'}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Server size={13} />
                      <span>Sources: {activeZoneData.sources.join(', ') || 'none'}</span>
                    </span>
                  </div>
                </div>
                {activeZoneData.active && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-500 border border-green-500/20 text-xs font-semibold">
                    <Check size={12} />
                    <span>Active Zone</span>
                  </span>
                )}
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Active Services */}
                <Card>
                  <CardHeader className="flex items-center justify-between">
                    <CardTitle className="text-xs uppercase tracking-wider text-slate-500 font-bold">Allowed Services</CardTitle>
                    <button
                      onClick={() => setIsServiceModalOpen(true)}
                      className="p-1 text-fedora-blue hover:bg-fedora-blue/10 rounded transition-colors"
                      title="Add Service Rule"
                    >
                      <Plus size={16} />
                    </button>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                    {activeZoneData.services.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-6">No allowed services in this zone.</p>
                    ) : (
                      activeZoneData.services.map((svc: string) => (
                        <div key={svc} className="flex justify-between items-center bg-slate-100 dark:bg-slate-900/50 px-3 py-1.5 rounded-lg text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{svc}</span>
                          <button
                            onClick={() => handleRemoveService(svc)}
                            disabled={serviceMutation.isPending}
                            className="text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded p-1 transition-colors"
                            title="Remove Service"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Open Ports */}
                <Card>
                  <CardHeader className="flex items-center justify-between">
                    <CardTitle className="text-xs uppercase tracking-wider text-slate-500 font-bold">Open Ports</CardTitle>
                    <button
                      onClick={() => setIsPortModalOpen(true)}
                      className="p-1 text-fedora-blue hover:bg-fedora-blue/10 rounded transition-colors"
                      title="Open Port"
                    >
                      <Plus size={16} />
                    </button>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                    {activeZoneData.ports.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-6">No open ports in this zone.</p>
                    ) : (
                      activeZoneData.ports.map((port: string) => (
                        <div key={port} className="flex justify-between items-center bg-slate-100 dark:bg-slate-900/50 px-3 py-1.5 rounded-lg text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{port}</span>
                          <button
                            onClick={() => handleRemovePort(port)}
                            disabled={portMutation.isPending}
                            className="text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded p-1 transition-colors"
                            title="Close Port"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Port Modal */}
      <Dialog
        isOpen={isPortModalOpen}
        onClose={() => setIsPortModalOpen(false)}
        title={`Open Port in Zone: ${selectedZone}`}
      >
        <form onSubmit={handleAddPortSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Port number / range</label>
            <input
              type="text"
              required
              placeholder="e.g. 80, 8000-8010"
              value={portNum}
              onChange={(e) => setPortNum(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-fedora-blue transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Protocol</label>
            <select
              value={portProtocol}
              onChange={(e) => setPortProtocol(e.target.value as any)}
              className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-fedora-blue transition-all"
            >
              <option value="tcp">TCP</option>
              <option value="udp">UDP</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={portMutation.isPending}
            className="w-full flex items-center justify-center bg-fedora-blue hover:bg-fedora-blue/90 disabled:bg-slate-800 text-white font-semibold text-sm py-2 rounded-lg transition-colors"
          >
            {portMutation.isPending ? 'Opening...' : 'Open Port'}
          </button>
        </form>
      </Dialog>

      {/* Service Modal */}
      <Dialog
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        title={`Allow Service in Zone: ${selectedZone}`}
      >
        <form onSubmit={handleAddServiceSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Service Name</label>
            <input
              type="text"
              required
              placeholder="e.g. http, ftp, dns"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-fedora-blue transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={serviceMutation.isPending}
            className="w-full flex items-center justify-center bg-fedora-blue hover:bg-fedora-blue/90 disabled:bg-slate-800 text-white font-semibold text-sm py-2 rounded-lg transition-colors"
          >
            {serviceMutation.isPending ? 'Allowing...' : 'Allow Service'}
          </button>
        </form>
      </Dialog>
    </div>
  );
}
