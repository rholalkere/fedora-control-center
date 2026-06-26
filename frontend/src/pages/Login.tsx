import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, User, Lock, AlertCircle } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { useNotificationStore } from '@/store/notifications';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { login } = useAuthStore();
  const { addToast } = useNotificationStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // 1. Authenticate with backend
      const res = await api.login(username, password);
      
      // 2. Fetch User Profile for roles
      const profile = await api.getProfile(res.access_token);
      
      // 3. Save to auth store
      login(res.access_token, profile.username, profile.role);
      
      addToast('Welcome to Fedora Control Center!', 'success');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
      addToast('Login failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
      {/* Background Fedora blue glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-fedora-blue/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fedora-darkblue/40 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md bg-slate-900 border-slate-800/80 shadow-2xl relative z-10">
        <CardHeader className="flex flex-col items-center gap-2 border-b-0 pt-8">
          <img 
            src="/fedora-logo.png" 
            alt="Fedora Logo" 
            className="w-14 h-14 rounded-full shadow-lg shadow-fedora-blue/30 hover:scale-110 hover:shadow-fedora-blue/50 transition-all duration-300"
          />
          <CardTitle className="text-xl font-bold text-white tracking-tight text-center">
            Fedora Control Center
          </CardTitle>
          <p className="text-xs text-slate-500 font-medium tracking-wide">
            AUTHENTICATE TO ACCESS SYSTEM MANAGEMENT
          </p>
        </CardHeader>
        <CardContent className="px-8 pb-8 pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-400">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="text"
                  required
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 pl-10 pr-4 py-2.5 rounded-lg focus:outline-none focus:border-fedora-blue focus:ring-1 focus:ring-fedora-blue/40 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 pl-10 pr-4 py-2.5 rounded-lg focus:outline-none focus:border-fedora-blue focus:ring-1 focus:ring-fedora-blue/40 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-fedora-blue hover:bg-fedora-blue/90 disabled:bg-slate-800 text-white font-semibold text-sm py-2.5 rounded-lg transition-all shadow-lg shadow-fedora-blue/20"
            >
              <KeyRound size={16} />
              <span>{isLoading ? 'Verifying...' : 'Sign In'}</span>
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
