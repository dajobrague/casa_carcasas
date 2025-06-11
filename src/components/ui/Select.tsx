import React, { forwardRef, SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, value, onChange, placeholder, className, disabled, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          className={cn(
            "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "appearance-none",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled={!value}>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none"
          aria-hidden="true"
        />
      </div>
    );
  }
);

Select.displayName = 'Select';

// Option component is just a simple wrapper for options
const Option: React.FC<{ value: string; label: string; disabled?: boolean }> = ({ value, label, disabled }) => (
  <option value={value} disabled={disabled}>{label}</option>
);

// Export components for compatibility with existing code
export {
  Select,
  Option,
  Select as SelectRoot,
  Select as SelectGroup,
  Select as SelectValue,
  Select as SelectTrigger,
  Select as SelectContent,
  Select as SelectLabel,
  Select as SelectItem,
  Select as SelectScrollUpButton,
  Select as SelectScrollDownButton,
  Select as SelectSeparator,
}