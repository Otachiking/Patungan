import { getInitials, getAvatarColor } from '@/lib/avatar';

interface PersonBadgeProps {
  name: string;
  index?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export function PersonBadge({ name, index = 0, size = 'md', className = '' }: PersonBadgeProps) {
  const color = getAvatarColor(index);
  const initial = getInitials(name);

  const sizeStyle = size === 'sm'
    ? 'text-xs px-2 py-0.5 gap-1'
    : 'text-sm px-2.5 py-1 gap-1.5';

  return (
    <span
      className={`
        inline-flex items-center rounded-full border font-medium
        text-white border-transparent shadow-sm ${sizeStyle} ${className}
      `}
      style={{ backgroundColor: color }}
    >
      <span className="shrink-0 flex items-center justify-center font-bold tracking-wide">
        {initial}
      </span>
      {name}
    </span>
  );
}
