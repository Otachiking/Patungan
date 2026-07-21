interface PersonBadgeProps {
  name: string;
  index?: number;
  size?: 'sm' | 'md';
  className?: string;
}

// Deterministic color per person (cycles through palette)
const BADGE_COLORS = [
  'bg-stamp/10 text-stamp border-stamp/20',
  'bg-lunas/10 text-lunas border-lunas/20',
  'bg-utang/10 text-utang border-utang/20',
  'bg-tinta/10 text-tinta border-tinta/20',
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-blue-100 text-blue-700 border-blue-200',
];

export function PersonBadge({ name, index = 0, size = 'md', className = '' }: PersonBadgeProps) {
  const color = BADGE_COLORS[index % BADGE_COLORS.length];
  const initial = name.charAt(0).toUpperCase();

  const sizeStyle = size === 'sm'
    ? 'text-xs px-2 py-0.5 gap-1'
    : 'text-sm px-2.5 py-1 gap-1.5';

  return (
    <span
      className={`
        inline-flex items-center rounded-full border font-medium
        ${color} ${sizeStyle} ${className}
      `}
    >
      <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[10px] font-bold shrink-0">
        {initial}
      </span>
      {name}
    </span>
  );
}
