import { useAuthStore } from '@/store/auth';

const BASE_URL = '/api/v1';

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const { token, logout } = useAuthStore.getState();
  
  const headers = new Headers(options.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if ((response.status === 401 || response.status === 403) && endpoint !== '/auth/login') {
    logout();
    throw new Error('Authentication expired');
  }

  if (!response.ok) {
    let errorDetail = 'API call failed';
    try {
      const err = await response.json();
      errorDetail = err.detail || err.message || errorDetail;
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  // Handle stream response (e.g. export logs file)
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/plain')) {
    return response as unknown as T;
  }

  try {
    return await response.json();
  } catch {
    return {} as T;
  }
}

export const api = {
  // Auth
  login: async (username: string, password: string): Promise<{ access_token: string; token_type: string }> => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    return apiFetch('/auth/login', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  },
  
  getProfile: async (overrideToken?: string): Promise<{ id: number; username: string; role: string; is_active: boolean; created_at: string }> => {
    return apiFetch('/auth/me', {
      headers: overrideToken ? { 'Authorization': `Bearer ${overrideToken}` } : {}
    });
  },

  // System metrics
  getMetrics: async (): Promise<any> => {
    return apiFetch('/system/metrics');
  },
  
  rebootSystem: async (): Promise<any> => {
    return apiFetch('/system/reboot', { method: 'POST' });
  },
  
  shutdownSystem: async (): Promise<any> => {
    return apiFetch('/system/shutdown', { method: 'POST' });
  },

  // Systemd Services
  getServices: async (search?: string): Promise<any[]> => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiFetch(`/services/${query}`);
  },
  
  controlService: async (name: string, action: 'start' | 'stop' | 'restart'): Promise<any> => {
    return apiFetch('/services/control', {
      method: 'POST',
      body: JSON.stringify({ name, action }),
    });
  },

  // Journal Logs
  getLogs: async (filters: { service?: string; priority?: number; since?: string; search?: string; limit?: number }): Promise<any> => {
    return apiFetch('/logs/query', {
      method: 'POST',
      body: JSON.stringify(filters),
    });
  },

  // Packages
  getInstalledPackages: async (): Promise<any[]> => {
    return apiFetch('/packages/installed');
  },
  
  getUpdates: async (): Promise<any[]> => {
    return apiFetch('/packages/updates');
  },
  
  searchPackages: async (q: string): Promise<any[]> => {
    return apiFetch(`/packages/search?q=${encodeURIComponent(q)}`);
  },
  
  installPackages: async (packages: string[]): Promise<any> => {
    return apiFetch('/packages/install', {
      method: 'POST',
      body: JSON.stringify({ packages }),
    });
  },
  
  getPackageHistory: async (): Promise<any[]> => {
    return apiFetch('/packages/history');
  },

  // Containers
  getContainers: async (): Promise<any[]> => {
    return apiFetch('/containers/');
  },
  
  controlContainer: async (id: string, engine: 'docker' | 'podman', action: 'start' | 'stop' | 'restart'): Promise<any> => {
    return apiFetch('/containers/control', {
      method: 'POST',
      body: JSON.stringify({ id, engine, action }),
    });
  },
  
  getContainerLogs: async (id: string, engine: 'docker' | 'podman', tail = 100): Promise<any> => {
    return apiFetch(`/containers/logs/${engine}/${id}?tail=${tail}`);
  },

  // Firewall
  getFirewallZones: async (): Promise<any[]> => {
    return apiFetch('/firewall/zones');
  },
  
  manageFirewallPort: async (zone: string, port: string, protocol: 'tcp' | 'udp', action: 'add' | 'remove'): Promise<any> => {
    return apiFetch(`/firewall/ports?zone=${encodeURIComponent(zone)}&action=${action}`, {
      method: 'POST',
      body: JSON.stringify({ port, protocol }),
    });
  },
  
  manageFirewallService: async (zone: string, service: string, action: 'add' | 'remove'): Promise<any> => {
    return apiFetch(`/firewall/services?zone=${encodeURIComponent(zone)}&action=${action}`, {
      method: 'POST',
      body: JSON.stringify({ service }),
    });
  },

  // SELinux
  getSELinuxStatus: async (): Promise<any> => {
    return apiFetch('/selinux/status');
  },
  
  setSELinuxMode: async (mode: 'enforcing' | 'permissive'): Promise<any> => {
    return apiFetch('/selinux/mode', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
  },

  getSELinuxBooleans: async (): Promise<any[]> => {
    return apiFetch('/selinux/booleans');
  },
  
  toggleSELinuxBoolean: async (name: string, value: boolean): Promise<any> => {
    return apiFetch('/selinux/booleans/toggle', {
      method: 'POST',
      body: JSON.stringify({ name, value }),
    });
  },

  getSELinuxDenials: async (): Promise<any[]> => {
    return apiFetch('/selinux/denials');
  },

  // AI Ollama
  getAIModels: async (): Promise<any> => {
    return apiFetch('/ai/models');
  },
  
  pullAIModel: async (name: string): Promise<any> => {
    return apiFetch('/ai/pull', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },
  
  deleteAIModel: async (name: string): Promise<any> => {
    return apiFetch(`/ai/models/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
  },
  
  generateAIResponse: async (model: string, prompt: string, system?: string): Promise<any> => {
    return apiFetch('/ai/generate', {
      method: 'POST',
      body: JSON.stringify({ model, prompt, system }),
    });
  },

  // Audit Logs
  getAuditLogs: async (skip = 0, limit = 50, username?: string, action?: string): Promise<any[]> => {
    const params = new URLSearchParams();
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());
    if (username) params.append('username', username);
    if (action) params.append('action', action);
    return apiFetch(`/audit-logs/?${params.toString()}`);
  },

  // Network
  getNetworkInterfaces: async (): Promise<any[]> => {
    return apiFetch('/network/interfaces');
  },
  
  getConnectedDevices: async (): Promise<any[]> => {
    return apiFetch('/network/devices');
  },
  
  getActiveSockets: async (): Promise<any[]> => {
    return apiFetch('/network/sockets');
  },
  
  getNetworkRoutes: async (): Promise<any[]> => {
    return apiFetch('/network/routes');
  },
  
  getWifiNetworks: async (): Promise<any[]> => {
    return apiFetch('/network/wifi');
  },
  
  blockDevice: async (mac: string, ip?: string, hostname?: string, reason?: string): Promise<any> => {
    return apiFetch('/network/devices/block', {
      method: 'POST',
      body: JSON.stringify({ mac, ip, hostname, reason })
    });
  },
  
  unblockDevice: async (mac: string): Promise<any> => {
    return apiFetch('/network/devices/unblock', {
      method: 'POST',
      body: JSON.stringify({ mac })
    });
  },
  
  getBlockedDevices: async (): Promise<any[]> => {
    return apiFetch('/network/devices/blocked');
  },
  
  getNetworkUsageAnalytics: async (rangeDays = 7): Promise<any> => {
    return apiFetch(`/network/analytics/usage?range_days=${rangeDays}`);
  },
  
    getNetworkAccessLogs: async (skip = 0, limit = 50, sourceIp?: string, search?: string): Promise<any[]> => {
      const params = new URLSearchParams();
      params.append('skip', skip.toString());
      params.append('limit', limit.toString());
      if (sourceIp) params.append('source_ip', sourceIp);
      if (search) params.append('search', search);
      return apiFetch(`/network/analytics/access-logs?${params.toString()}`);
    },

    // Power Profiles & Processes
    getPowerProfile: async (): Promise<any> => {
      return apiFetch('/system/power-profile');
    },

    setPowerProfile: async (profile: string): Promise<any> => {
      return apiFetch('/system/power-profile', {
        method: 'POST',
        body: JSON.stringify({ profile }),
      });
    },

    getProcesses: async (): Promise<any[]> => {
      return apiFetch('/system/processes');
    },

    killProcess: async (pid: number): Promise<any> => {
      return apiFetch('/system/processes/kill', {
        method: 'POST',
        body: JSON.stringify({ pid }),
      });
    },

    // DNS Blocklist
    getBlockedDomains: async (): Promise<any[]> => {
      return apiFetch('/network/dns-blocklist');
    },

    blockDomain: async (domain: string, reason?: string): Promise<any> => {
      return apiFetch('/network/dns-blocklist/block', {
        method: 'POST',
        body: JSON.stringify({ domain, reason }),
      });
    },

    unblockDomain: async (domain: string): Promise<any> => {
      return apiFetch('/network/dns-blocklist/unblock', {
        method: 'POST',
        body: JSON.stringify({ domain }),
      });
    }
  };

