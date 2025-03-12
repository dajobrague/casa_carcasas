import React, { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface Option {
  value: string;
  label: string;
  color?: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: Option[];
  label?: string;
  error?: string;
  fullWidth?: boolean;
  estado?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ 
    className, 
    options, 
    label, 
    error, 
    fullWidth = false, 
    estado,
    value,
    ...props 
  }, ref) => {
    // Función para obtener clases según el estado
    const getEstadoClasses = (estado?: string) => {
      switch (estado?.toUpperCase()) {
        case 'TRABAJO': return 'bg-green-100 text-green-800 border-green-300';
        case 'VACACIONES': return 'bg-blue-100 text-blue-800 border-blue-300';
        case 'LIBRE': return 'bg-red-100 text-red-800 border-red-300';
        case 'BAJA MÉDICA': return 'bg-purple-100 text-purple-800 border-purple-300';
        case 'FORMACIÓN': return 'bg-orange-100 text-orange-800 border-orange-300';
        case 'LACTANCIA': return 'bg-pink-100 text-pink-800 border-pink-300';
        default: return 'bg-white border-gray-300';
      }
    };

    // Encontrar la opción seleccionada para mostrar su color
    const selectedOption = options.find(opt => opt.value === value);

    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <select
          ref={ref}
          value={value}
          className={cn(
            'block rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2 text-base font-medium appearance-none',
            selectedOption?.value ? getEstadoClasses(selectedOption.value) : getEstadoClasses(estado),
            error ? 'border-red-300' : 'border-gray-300',
            fullWidth ? 'w-full' : '',
            className
          )}
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")",
            backgroundPosition: "right 0.5rem center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "1.5em 1.5em",
            paddingRight: "2.5rem"
          }}
          {...props}
        >
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              className={option.value ? getEstadoClasses(option.value) : ''}
            >
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select }; 