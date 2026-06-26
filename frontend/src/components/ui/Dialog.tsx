import React from 'react';
import { X } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ isOpen, onClose, title, children, className }: DialogProps) {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      
      {/* Modal Dialog Content */}
      <div 
        className={twMerge(
          "relative z-10 w-full max-w-lg p-6 bg-white dark:bg-card border border-slate-200 dark:border-slate-800/80 shadow-2xl rounded-xl max-h-[85vh] overflow-y-auto transform scale-100 opacity-100 transition-all",
          className
        )}
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800/50">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h2>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
