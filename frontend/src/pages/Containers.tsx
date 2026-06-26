import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Square, RotateCw, Terminal, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '@/services/api';
import { useNotificationStore } from '@/store/notifications';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table';
import { TableSkeleton } from '@/components/ui/Loading';
import { Dialog } from '@/components/ui/Dialog';

export function Containers() {
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();
  const { role } = useAuthStore();
  
  const [logContainer, setLogContainer] = useState<{ id: string; name: string; engine: 'docker' | 'podman' } | null>(null);
  const [logsText, setLogsText] = useState('Loading logs...');

  const isAdmin = role === 'admin';

  // 1. Get container list
  const { data: containers, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['containers'],
    queryFn: api.getContainers,
    refetchInterval: 12000,
  });

  // 2. Control container state mutation
  const controlMutation = useMutation({
    mutationFn: ({ id, engine, action }: { id: string; engine: 'docker' | 'podman'; action: 'start' | 'stop' | 'restart' }) =>
      api.controlContainer(id, engine, action),
    onSuccess: (_, variables) => {
      addToast(`Container ${variables.id} ${variables.action}ed successfully.`, 'success');
      queryClient.invalidateQueries({ queryKey: ['containers'] });
    },
    onError: (err: any) => {
      addToast(`Container action failed: ${err.message}`, 'error');
    }
  });

  const handleControl = (id: string, engine: 'docker' | 'podman', action: 'start' | 'stop' | 'restart') => {
    if (!isAdmin) {
      addToast('Administrator role required to control containers.', 'error');
      return;
    }
    controlMutation.mutate({ id, engine, action });
  };

  const handleOpenLogs = async (id: string, name: string, engine: 'docker' | 'podman') => {
    setLogContainer({ id, name, engine });
    setLogsText('Fetching container logs...');
    try {
      const res = await api.getContainerLogs(id, engine);
      setLogsText(res.logs);
    } catch (err: any) {
      setLogsText(`Failed to load logs: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 overflow-y-auto h-full pb-10 pr-2">
      {/* Top Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Container Management</h3>
          <p className="text-xs text-slate-500">View and manage Podman and Docker system engines</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200/50 dark:border-slate-800/40"
          title="Refresh Containers"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Containers List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton />
          ) : containers?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-500">
              <AlertCircle size={28} />
              <span>No Docker or Podman containers found on host.</span>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Container ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead>Engine</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ports</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {containers?.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs font-semibold">{c.id}</TableCell>
                      <TableCell className="font-semibold text-xs text-slate-800 dark:text-slate-200">{c.name}</TableCell>
                      <TableCell className="text-xs text-slate-500 max-w-[150px] truncate" title={c.image}>{c.image}</TableCell>
                      <TableCell>
                        <span 
                          className={`
                            text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider
                            ${c.engine === 'podman' 
                              ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' 
                              : 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20'
                            }
                          `}
                        >
                          {c.engine}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span 
                          className={`
                            text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider
                            ${c.state === 'running' 
                              ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }
                          `}
                        >
                          {c.state}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{c.status}</TableCell>
                      <TableCell className="text-xs text-slate-500 max-w-[120px] truncate" title={c.ports}>{c.ports}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {c.state !== 'running' ? (
                            <button
                              onClick={() => handleControl(c.id, c.engine as any, 'start')}
                              disabled={controlMutation.isPending}
                              className="p-1.5 text-green-500 hover:bg-green-500/10 rounded transition-colors"
                              title="Start Container"
                            >
                              <Play size={13} fill="currentColor" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleControl(c.id, c.engine as any, 'stop')}
                              disabled={controlMutation.isPending}
                              className="p-1.5 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                              title="Stop Container"
                            >
                              <Square size={13} fill="currentColor" />
                            </button>
                          )}
                          <button
                            onClick={() => handleControl(c.id, c.engine as any, 'restart')}
                            disabled={controlMutation.isPending}
                            className="p-1.5 text-amber-500 hover:bg-amber-500/10 rounded transition-colors"
                            title="Restart Container"
                          >
                            <RotateCw size={13} />
                          </button>
                          <button
                            onClick={() => handleOpenLogs(c.id, c.name, c.engine as any)}
                            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                            title="View Logs"
                          >
                            <Terminal size={13} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs Dialog */}
      <Dialog
        isOpen={!!logContainer}
        onClose={() => setLogContainer(null)}
        title={`Container Logs: ${logContainer?.name || ''}`}
        className="max-w-2xl"
      >
        <div className="bg-slate-950 text-slate-200 font-mono text-xs p-4 rounded-lg h-96 overflow-y-auto whitespace-pre-wrap">
          {logsText}
        </div>
      </Dialog>
    </div>
  );
}
