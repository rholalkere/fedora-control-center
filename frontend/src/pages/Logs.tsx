import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Download, Terminal, AlertTriangle, RefreshCw } from 'lucide-react';
import { api } from '@/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/Loading';

const PRIORITIES = [
  { value: '', label: 'All Priorities' },
  { value: '3', label: 'Error & Higher' },
  { value: '4', label: 'Warning' },
  { value: '5', label: 'Notice' },
  { value: '6', label: 'Info' },
  { value: '7', label: 'Debug' },
];

const SINCE_RANGES = [
  { value: '-1h', label: 'Last 1 Hour' },
  { value: '-4h', label: 'Last 4 Hours' },
  { value: '-1d', label: 'Last 24 Hours' },
  { value: '-3d', label: 'Last 3 Days' },
];

export function Logs() {
  const [service, setService] = useState('');
  const [priority, setPriority] = useState('');
  const [since, setSince] = useState('-1h');
  const [search, setSearch] = useState('');
  const [limit] = useState(100);

  // Fetch logs via query
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['logs', service, priority, since, search],
    queryFn: () => api.getLogs({
      service: service || undefined,
      priority: priority ? parseInt(priority) : undefined,
      since: since || undefined,
      search: search || undefined,
      limit
    }),
  });

  const handleExport = () => {
    const params = new URLSearchParams();
    if (service) params.append('service', service);
    if (priority) params.append('priority', priority);
    if (since) params.append('since', since);
    if (search) params.append('search', search);
    params.append('limit', '500'); // Export larger chunk

    // Trigger browser download
    window.open(`/api/v1/logs/export?${params.toString()}`);
  };

  const getPriorityStyle = (lvl: number) => {
    if (lvl <= 3) return 'text-red-500 font-semibold';
    if (lvl === 4) return 'text-amber-500 font-semibold';
    return 'text-slate-400 dark:text-slate-500';
  };

  return (
    <div className="space-y-6 overflow-y-auto h-full pb-10 pr-2">
      {/* Filtering Options Card */}
      <Card className="p-4 bg-slate-50 dark:bg-card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Service Search */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Service Unit</label>
            <input
              type="text"
              placeholder="e.g. sshd"
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-fedora-blue transition-all"
            />
          </div>

          {/* Priority Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Min Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-fedora-blue transition-all"
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Time range Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Time Range</label>
            <select
              value={since}
              onChange={(e) => setSince(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-fedora-blue transition-all"
            >
              {SINCE_RANGES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Search Term */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Grep Pattern</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input
                type="text"
                placeholder="Filter logs text..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-200 pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-fedora-blue transition-all"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Log Console Viewer */}
      <Card className="flex flex-col">
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Terminal size={18} className="text-fedora-blue" />
            <span>Journalctl Output Console ({data?.count ?? 0} lines)</span>
          </CardTitle>
          <div className="flex gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
              title="Refresh Logs"
            >
              <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-fedora-blue hover:bg-fedora-blue/90 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm"
            >
              <Download size={13} />
              <span>Export</span>
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <PageLoader />
          ) : (
            <div className="bg-slate-950 text-slate-200 font-mono text-xs p-4 rounded-b-xl max-h-[550px] overflow-y-auto space-y-1.5">
              {data?.lines.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-500">
                  <AlertTriangle size={24} />
                  <span>No matching journal entries found in specified range.</span>
                </div>
              ) : (
                data?.lines.map((line: any, idx: number) => (
                  <div key={idx} className="flex hover:bg-slate-900/50 py-0.5 px-1 rounded transition-colors">
                    <span className="text-slate-600 select-none shrink-0 pr-3">
                      {new Date(line.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`${getPriorityStyle(line.priority)} select-none shrink-0 pr-3`}>
                      [{line.process.split('/').pop()?.split('.')[0] || 'sys'}]
                    </span>
                    <span className="text-slate-300 break-all select-text">
                      {line.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
