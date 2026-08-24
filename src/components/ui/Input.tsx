import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: React.ReactNode;
  error?: string;
  hint?: string;
  prefix?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, prefix, className = '', id, ...props }, ref) => {
    const inputId = id ?? (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : 'input');

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-tinta">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-3 text-tinta-pudar font-mono text-sm select-none">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full border rounded-xl px-3 py-2.5 text-tinta bg-white
              placeholder:text-tinta-pudar/60
              border-tinta/20
              focus:outline-none focus:ring-2 focus:ring-stamp/30 focus:border-stamp
              transition-all duration-150
              ${prefix ? 'pl-8' : ''}
              ${error ? 'border-red-500 focus:ring-red-200' : ''}
              ${props.type === 'date' ? '[&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:transition-opacity' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {hint && !error && (
          <p className="text-xs text-tinta-pudar">{hint}</p>
        )}
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

import { useState, useRef, useEffect } from 'react';

// ─── Select ───────────────────────────────────────────────────────────────────

interface SelectProps {
  label?: React.ReactNode;
  error?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  id?: string;
  className?: string;
}

export function Select({ label, error, options, value, onChange, className = '', id }: SelectProps) {
  const selectId = id ?? (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : 'select');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col gap-1" ref={containerRef}>
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-tinta">
          {label}
        </label>
      )}
      <div className="relative">
        <div
          id={selectId}
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-full border rounded-xl pl-3 pr-10 py-2.5 text-tinta bg-white
            border-tinta/20 cursor-pointer select-none flex items-center justify-between
            transition-all duration-150
            ${isOpen ? 'ring-2 ring-stamp/30 border-stamp' : 'hover:border-tinta/30'}
            ${error ? 'border-red-500' : ''}
            ${className}
          `}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsOpen(!isOpen);
            }
          }}
        >
          <span className="truncate">{selectedOption?.label}</span>
          <div className="text-tinta-pudar shrink-0">
            <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-tinta/10 rounded-xl shadow-lg py-1 max-h-60 overflow-auto animate-fade-up" style={{ animationDuration: '150ms' }}>
            {options.map((opt) => (
              <div
                key={opt.value}
                onClick={() => {
                  onChange({ target: { value: opt.value } });
                  setIsOpen(false);
                }}
                className={`
                  px-4 py-2 cursor-pointer transition-colors text-sm
                  ${opt.value === value ? 'bg-stamp/10 text-stamp font-medium' : 'text-tinta hover:bg-tinta/5'}
                `}
              >
                {opt.label}
              </div>
            ))}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
