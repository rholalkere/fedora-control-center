import { Loader2 } from 'lucide-react';

export function Spinner({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <Loader2 
      size={size} 
      className={`animate-spin text-primary ${className}`} 
    />
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded ${className}`} />
  );
}

export function CardSkeleton() {
  return (
    <div className="p-5 bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 shadow-sm">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-2/3" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full space-y-3 p-4">
      <div className="flex gap-4">
        <Skeleton className="h-6 flex-1" />
        <Skeleton className="h-6 flex-1" />
        <Skeleton className="h-6 flex-1" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 flex-1" />
        </div>
      ))}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
      <Spinner size={32} />
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading details...</p>
    </div>
  );
}
