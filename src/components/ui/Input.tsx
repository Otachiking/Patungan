import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, prefix, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

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

// ─── Select ───────────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className = '', id, ...props }: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-tinta">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`
          w-full border rounded-xl px-3 py-2.5 text-tinta bg-white
          border-tinta/20
          focus:outline-none focus:ring-2 focus:ring-stamp/30 focus:border-stamp
          transition-all duration-150 cursor-pointer
          ${error ? 'border-red-500' : ''}
          ${className}
        `}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
