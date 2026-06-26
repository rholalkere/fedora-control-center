import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useNotificationStore } from '@/store/notifications';

export function ToastContainer() {
  const { toasts, removeToast } = useNotificationStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-start gap-3 p-4 bg-white dark:bg-card border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl animate-slide-in transition-all duration-300"
        >
          {/* Icons depending on toast type */}
          {toast.type === 'success' && <CheckCircle className="text-green-500 shrink-0" size={18} />}
          {toast.type === 'error' && <AlertCircle className="text-red-500 shrink-0" size={18} />}
          {toast.type === 'info' && <Info className="text-primary shrink-0" size={18} />}

          <div className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">
            {toast.message}
          </div>

          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors p-0.5"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
