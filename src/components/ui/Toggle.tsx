'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'size'> {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
  size?: 'sm' | 'md';
}

const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ className, checked = false, onChange, label, description, size = 'md', disabled, id, ...props }, ref) => {
    const toggleId = id || label?.toLowerCase().replace(/\s+/g, '-');

    const sizes = {
      sm: {
        track: 'w-8 h-5',
        thumb: 'w-3.5 h-3.5',
        translate: 'translate-x-3.5',
      },
      md: {
        track: 'w-10 h-6',
        thumb: 'w-4 h-4',
        translate: 'translate-x-4.5',
      },
    };

    const sizeConfig = sizes[size];

    return (
      <label
        htmlFor={toggleId}
        className={cn(
          'flex items-start gap-3 cursor-pointer',
          disabled && 'cursor-not-allowed opacity-60',
          className
        )}
      >
        <div className="relative flex-shrink-0 mt-0.5">
          <input
            ref={ref}
            id={toggleId}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange?.(e.target.checked)}
            disabled={disabled}
            className="sr-only peer"
            {...props}
          />
          <div
            className={cn(
              'rounded-full transition-colors duration-200',
              sizeConfig.track,
              checked ? 'bg-gray-900' : 'bg-gray-200',
              disabled && 'bg-gray-100'
            )}
          />
          <div
            className={cn(
              'absolute top-1 left-1 bg-white rounded-full shadow-sm transition-transform duration-200',
              sizeConfig.thumb,
              checked && sizeConfig.translate
            )}
          />
        </div>
        {(label || description) && (
          <div className="flex-1 min-w-0">
            {label && (
              <span className="block text-sm font-medium text-gray-900">{label}</span>
            )}
            {description && (
              <span className="block text-xs text-gray-500 mt-0.5">{description}</span>
            )}
          </div>
        )}
      </label>
    );
  }
);

Toggle.displayName = 'Toggle';

export { Toggle };
export type { ToggleProps };
