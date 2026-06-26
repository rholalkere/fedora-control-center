import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'glass' | 'borderless';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={twMerge(
          clsx(
            "rounded-xl transition-all duration-300",
            {
              "bg-white dark:bg-card border border-slate-200 dark:border-slate-800 shadow-sm": variant === 'default',
              "bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/40 shadow-lg": variant === 'glass',
              "bg-transparent shadow-none border-none": variant === 'borderless'
            }
          ),
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={twMerge("p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={twMerge("text-base font-semibold text-slate-800 dark:text-slate-200 tracking-tight", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={twMerge("p-5", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={twMerge("p-4 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800/50 rounded-b-xl flex items-center justify-end", className)} {...props}>
      {children}
    </div>
  );
}
