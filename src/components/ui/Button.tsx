import type { ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-stamp text-kertas hover:bg-stamp-dark active:scale-95 shadow-sm font-semibold',
  secondary:
    'bg-kertas border-2 border-tinta/20 text-tinta hover:border-stamp hover:text-stamp active:scale-95 font-medium',
  ghost:
    'bg-transparent text-tinta-pudar hover:text-tinta hover:bg-tinta/5 active:scale-95 font-medium',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:scale-95 font-semibold',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-5 py-2.5 text-base rounded-xl gap-2',
  lg: 'px-7 py-3.5 text-lg rounded-2xl gap-2.5',
};

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  loading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center
        transition-all duration-150 ease-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-stamp focus-visible:ring-offset-2
        disabled:opacity-50 disabled:pointer-events-none
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
