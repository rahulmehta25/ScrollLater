'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      icon,
      iconPosition = 'left',
      children,
      ...props
    },
    ref
  ) => {
    const variants = {
      primary:
        'bg-ink text-paper-raised hover:bg-ink/90 active:bg-ink disabled:bg-paper-deep disabled:text-ink-faint',
      secondary:
        'bg-paper-muted text-ink hover:bg-paper-deep active:bg-paper-deep disabled:bg-paper-muted disabled:text-ink-faint',
      ghost:
        'bg-transparent text-ink-muted hover:bg-paper-muted hover:text-ink active:bg-paper-deep disabled:text-ink-faint',
      danger:
        'bg-red-700 text-white hover:bg-red-800 active:bg-red-900 disabled:bg-red-300',
      outline:
        'bg-paper-raised text-ink border border-paper-deep hover:border-ink-faint hover:bg-paper-soft active:bg-paper-muted disabled:text-ink-faint disabled:border-paper-deep',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
      md: 'h-9 px-4 text-sm gap-2 rounded-xl',
      lg: 'h-11 px-5 text-sm gap-2 rounded-xl',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-200 ease-calm focus:outline-none focus:ring-2 focus:ring-terracotta-500/20 focus:ring-offset-1 focus:ring-offset-paper disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <>
            {icon && iconPosition === 'left' && icon}
            {children}
            {icon && iconPosition === 'right' && icon}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
export type { ButtonProps };
