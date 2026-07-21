import { formatRupiahShort } from '@/i18n';

interface MoneyDisplayProps {
  amount: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'default' | 'positive' | 'negative' | 'muted';
  showSign?: boolean;
}

const sizeStyles = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-2xl',
};

const colorStyles = {
  default: 'text-tinta',
  positive: 'text-lunas',
  negative: 'text-utang',
  muted: 'text-tinta-pudar',
};

/**
 * Displays Rupiah amounts in IBM Plex Mono (mesin kasir style), always right-aligned.
 * Per §12: "Nominal selalu rata kanan dalam font monospace, seperti struk kasir asli."
 */
export function MoneyDisplay({
  amount,
  className = '',
  size = 'md',
  color = 'default',
  showSign = false,
}: MoneyDisplayProps) {
  const formatted = formatRupiahShort(Math.abs(amount));
  const sign = showSign ? (amount >= 0 ? '+' : '−') : '';

  return (
    <span
      className={`
        font-mono tabular-nums text-right
        ${sizeStyles[size]}
        ${colorStyles[color]}
        ${className}
      `}
    >
      {sign}{formatted}
    </span>
  );
}
