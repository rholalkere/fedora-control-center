import React from 'react';
import { twMerge } from 'tailwind-merge';

export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-auto">
      <table ref={ref} className={twMerge("w-full text-sm border-collapse text-left", className)} {...props} />
    </div>
  )
);
Table.displayName = "Table";

export const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={twMerge("bg-slate-50 dark:bg-slate-900/60 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-800/80 sticky top-0 z-10", className)} {...props} />
  )
);
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={twMerge("divide-y divide-slate-100 dark:divide-slate-800/50", className)} {...props} />
  )
);
TableBody.displayName = "TableBody";

export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr ref={ref} className={twMerge("hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors", className)} {...props} />
  )
);
TableRow.displayName = "TableRow";

export const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th ref={ref} className={twMerge("p-4 font-semibold text-left", className)} {...props} />
  )
);
TableHead.displayName = "TableHead";

export const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={twMerge("p-4 align-middle text-slate-700 dark:text-slate-300", className)} {...props} />
  )
);
TableCell.displayName = "TableCell";
