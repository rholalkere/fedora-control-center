import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Play, Square, RotateCw } from 'lucide-react';
import { api } from '@/services/api';
import { useNotificationStore } from '@/store/notifications';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table';
import { TableSkeleton } from '@/components/ui/Loading';

export function Services() {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();
  const { role } = useAuthStore();
  
  const isAdmin = role === 'admin';

  // Query service list
  const { data: services, isLoading } = useQuery({
    queryKey: ['services', search],
    queryFn: () => api.getServices(search),
    refetchInterval: 10000, // auto refetch every 10s
  });

  // Action mutation
  const controlMutation = useMutation({
    mutationFn: ({ name, action }: { name: string; action: 'start' | 'stop' | 'restart' }) => 
      api.controlService(name, action),
    onSuccess: (_, variables) => {
      addToast(`Service '${variables.name}' ${variables.action}ed successfully.`, 'success');
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
    onError: (err: any) => {
      addToast(`Action failed: ${err.message}`, 'error');
    }
  });

  const handleControl = (name: string, action: 'start' | 'stop' | 'restart') => {
    if (!isAdmin) {
      addToast('Administrator role required to control services.', 'error');
      return;
    }
    controlMutation.mutate({ name, action });
  };

  return (
    <div className="space-y-6 overflow-y-auto h-full pb-10 pr-2">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Search systemd services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-card border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-200 pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-fedora-blue transition-all"
          />
        </div>
        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800/60 px-3 py-1 rounded-md">
          Total Services: {services?.length ?? 0}
        </div>
      </div>

      {/* Services Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton />
          ) : (
            <div className="overflow-x-auto w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Active State</TableHead>
                    <TableHead>Enabled State</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services?.map((svc) => (
                    <TableRow key={svc.name}>
                      <TableCell className="font-semibold text-xs text-slate-900 dark:text-slate-200 max-w-[200px] truncate" title={svc.name}>
                        {svc.name}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 dark:text-slate-400 max-w-[250px] truncate" title={svc.description}>
                        {svc.description || '-'}
                      </TableCell>
                      <TableCell>
                        <span 
                          className={`
                            text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider
                            ${svc.active_state === 'active' 
                              ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
                              : 'bg-red-500/10 text-red-600 dark:text-red-400'
                            }
                          `}
                        >
                          {svc.active_state} ({svc.sub_state})
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 capitalize">
                          {svc.enabled_state}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {svc.active_state !== 'active' ? (
                            <button
                              onClick={() => handleControl(svc.name, 'start')}
                              disabled={controlMutation.isPending}
                              className="p-1.5 text-green-500 hover:bg-green-500/10 rounded transition-colors"
                              title="Start Service"
                            >
                              <Play size={14} fill="currentColor" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleControl(svc.name, 'stop')}
                              disabled={controlMutation.isPending}
                              className="p-1.5 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                              title="Stop Service"
                            >
                              <Square size={14} fill="currentColor" />
                            </button>
                          )}
                          <button
                            onClick={() => handleControl(svc.name, 'restart')}
                            disabled={controlMutation.isPending}
                            className="p-1.5 text-amber-500 hover:bg-amber-500/10 rounded transition-colors"
                            title="Restart Service"
                          >
                            <RotateCw size={14} />
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
    </div>
  );
}
