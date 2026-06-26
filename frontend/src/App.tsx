import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { useTelemetry } from '@/hooks/useTelemetry';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { ToastContainer } from '@/components/ui/Toast';

// Pages
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Services } from '@/pages/Services';
import { Logs } from '@/pages/Logs';
import { Updates } from '@/pages/Updates';
import { Hardware } from '@/pages/Hardware';
import { Containers } from '@/pages/Containers';
import { Firewall } from '@/pages/Firewall';
import { SELinux } from '@/pages/SELinux';
import { AI } from '@/pages/AI';
import { Settings } from '@/pages/Settings';
import { Network } from '@/pages/Network';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Guard route for authenticated users
function ProtectedLayout() {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  const { status: wsStatus } = useTelemetry();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Get active page name from path
  const pathName = location.pathname.substring(1) || 'dashboard';

  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden relative">
      {/* Sidebar navigation */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main console content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header 
          title={pathName} 
          wsStatus={wsStatus} 
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} 
        />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Public Auth page */}
          <Route path="/login" element={<Login />} />

          {/* Secure Admin Control Console */}
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/services" element={<Services />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/updates" element={<Updates />} />
            <Route path="/hardware" element={<Hardware />} />
            <Route path="/containers" element={<Containers />} />
            <Route path="/firewall" element={<Firewall />} />
            <Route path="/selinux" element={<SELinux />} />
            <Route path="/ai" element={<AI />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/network" element={<Network />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
      <ToastContainer />
    </QueryClientProvider>
  );
}
