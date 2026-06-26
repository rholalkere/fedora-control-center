import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Search, ArrowUpCircle, History, PackageCheck, AlertCircle } from 'lucide-react';
import { api } from '@/services/api';
import { useNotificationStore } from '@/store/notifications';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table';
import { TableSkeleton } from '@/components/ui/Loading';

export function Updates() {
  const [activeTab, setActiveTab] = useState<'updates' | 'search' | 'history'>('updates');
  const [searchQuery, setSearchQuery] = useState('');
  const [pkgSearchName, setPkgSearchName] = useState('');
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();
  const { role } = useAuthStore();
  
  const isAdmin = role === 'admin';

  // 1. Available updates query
  const { data: updates, isLoading: isUpdatesLoading } = useQuery({
    queryKey: ['updates'],
    queryFn: api.getUpdates,
    enabled: activeTab === 'updates'
  });

  // 2. Transaction history query
  const { data: history, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['dnf-history'],
    queryFn: api.getPackageHistory,
    enabled: activeTab === 'history'
  });

  // 3. Search packages query
  const { data: searchResults, isLoading: isSearchLoading } = useQuery({
    queryKey: ['packages-search', pkgSearchName],
    queryFn: () => api.searchPackages(pkgSearchName),
    enabled: !!pkgSearchName && activeTab === 'search'
  });

  // 4. Install mutation
  const installMutation = useMutation({
    mutationFn: (packages: string[]) => api.installPackages(packages),
    onSuccess: (data) => {
      addToast(data.message, 'success');
      queryClient.invalidateQueries({ queryKey: ['updates'] });
      queryClient.invalidateQueries({ queryKey: ['dnf-history'] });
    },
    onError: (err: any) => {
      addToast(`Installation failed: ${err.message}`, 'error');
    }
  });

  const handleUpgradeAll = () => {
    if (!isAdmin) {
      addToast('Administrator role required to install updates.', 'error');
      return;
    }
    if (!updates || updates.length === 0) return;
    
    const pkgs = updates.map((p) => p.name);
    installMutation.mutate(pkgs);
  };

  const handleInstallSingle = (name: string) => {
    if (!isAdmin) {
      addToast('Administrator role required to install packages.', 'error');
      return;
    }
    installMutation.mutate([name]);
  };

  const triggerSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPkgSearchName(searchQuery);
  };

  return (
    <div className="space-y-6 overflow-y-auto h-full pb-10 pr-2">
      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('updates')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === 'updates' 
              ? 'border-fedora-blue text-fedora-blue' 
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <ArrowUpCircle size={15} />
          <span>Updates ({updates?.length ?? 0})</span>
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === 'search' 
              ? 'border-fedora-blue text-fedora-blue' 
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Search size={15} />
          <span>Search Packages</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === 'history' 
              ? 'border-fedora-blue text-fedora-blue' 
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <History size={15} />
          <span>Update History</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'updates' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-50 dark:bg-card p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/60">
            <div className="flex items-center gap-3">
              <RefreshCw className="text-fedora-blue animate-spin" size={18} />
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">System Updates</h4>
                <p className="text-xs text-slate-500">Checking for available Fedora updates via dnf database</p>
              </div>
            </div>
            {updates && updates.length > 0 && (
              <button
                onClick={handleUpgradeAll}
                disabled={installMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-fedora-blue hover:bg-fedora-blue/90 disabled:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm"
              >
                <ArrowUpCircle size={14} />
                <span>{installMutation.isPending ? 'Upgrading...' : 'Upgrade All Packages'}</span>
              </button>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              {isUpdatesLoading ? (
                <TableSkeleton />
              ) : updates?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-500">
                  <PackageCheck size={28} />
                  <span>System is up to date! No updates available.</span>
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Package Name</TableHead>
                        <TableHead>Target Version</TableHead>
                        <TableHead>Arch</TableHead>
                        <TableHead>Repository</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {updates?.map((pkg) => (
                        <TableRow key={pkg.name}>
                          <TableCell className="font-semibold text-xs text-slate-800 dark:text-slate-200">{pkg.name}</TableCell>
                          <TableCell className="text-xs text-slate-500 dark:text-slate-400">{pkg.version}-{pkg.release}</TableCell>
                          <TableCell className="text-xs text-slate-500 dark:text-slate-400">{pkg.architecture}</TableCell>
                          <TableCell className="text-xs text-slate-500 dark:text-slate-400 capitalize">{pkg.repository}</TableCell>
                          <TableCell className="text-right">
                            <button
                              onClick={() => handleInstallSingle(pkg.name)}
                              disabled={installMutation.isPending}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-fedora-blue/10 dark:bg-slate-800 dark:hover:bg-fedora-blue/20 text-slate-700 dark:text-slate-300 hover:text-fedora-blue dark:hover:text-fedora-blue text-xs font-bold rounded transition-colors"
                            >
                              Upgrade
                            </button>
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
      )}

      {activeTab === 'search' && (
        <div className="space-y-4">
          <form onSubmit={triggerSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Search Fedora repositories (e.g. htop, git, tmux)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-white dark:bg-card border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg focus:outline-none focus:border-fedora-blue transition-all"
            />
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-fedora-blue hover:bg-fedora-blue/90 text-white font-semibold text-sm rounded-lg transition-colors shadow-sm"
            >
              <Search size={16} />
              <span>Search</span>
            </button>
          </form>

          <Card>
            <CardContent className="p-0">
              {isSearchLoading ? (
                <TableSkeleton />
              ) : !pkgSearchName ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-500">
                  <Search size={28} />
                  <span>Enter a package name above to search Fedora repositories.</span>
                </div>
              ) : searchResults?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-500">
                  <AlertCircle size={28} />
                  <span>No packages found matching '{pkgSearchName}'.</span>
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Package Name</TableHead>
                        <TableHead>Summary</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead>Arch</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchResults?.map((pkg) => (
                        <TableRow key={pkg.name}>
                          <TableCell className="font-semibold text-xs text-slate-800 dark:text-slate-200">{pkg.name}</TableCell>
                          <TableCell className="text-xs text-slate-500 dark:text-slate-400 max-w-sm truncate" title={pkg.summary}>{pkg.summary || 'No summary'}</TableCell>
                          <TableCell className="text-xs text-slate-500 dark:text-slate-400">{pkg.version}</TableCell>
                          <TableCell className="text-xs text-slate-500 dark:text-slate-400">{pkg.architecture}</TableCell>
                          <TableCell className="text-right">
                            <button
                              onClick={() => handleInstallSingle(pkg.name)}
                              disabled={installMutation.isPending}
                              className="px-2.5 py-1 bg-fedora-blue text-white hover:bg-fedora-blue/90 text-xs font-bold rounded transition-colors shadow-sm"
                            >
                              Install
                            </button>
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
      )}

      {activeTab === 'history' && (
        <Card>
          <CardContent className="p-0">
            {isHistoryLoading ? (
              <TableSkeleton />
            ) : history?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-500">
                <History size={28} />
                <span>No package management transactions found.</span>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Command Line</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Date / Time</TableHead>
                      <TableHead>User</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history?.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-bold text-xs text-slate-800 dark:text-slate-200">#{entry.id}</TableCell>
                        <TableCell className="text-xs font-mono text-slate-500 dark:text-slate-400">{entry.command_line}</TableCell>
                        <TableCell>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {entry.action}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 dark:text-slate-400">{entry.date}</TableCell>
                        <TableCell className="text-xs font-semibold text-slate-700 dark:text-slate-300">{entry.user}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
