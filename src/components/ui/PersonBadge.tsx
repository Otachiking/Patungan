import { getInitials, getAvatarColor } from '@/lib/avatar';

interface PersonBadgeProps {
  name: string;
  index?: number;
  size?: 'sm' | 'md';
  className?: string;
  showName?: boolean;
}

export function PersonBadge({ name, index = 0, size = 'md', className = '', showName = true }: PersonBadgeProps) {
  const color = getAvatarColor(index);
  const initial = getInitials(name);

  const containerSizeStyle = size === 'sm' ? 'gap-1.5' : 'gap-2';
  const avatarSizeStyle = size === 'sm' ? 'w-5 h-5 text-[10px]' : 'w-7 h-7 text-xs';
  const textSizeStyle = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className={`inline-flex items-center ${containerSizeStyle} ${className}`}>
      <span
        className={`shrink-0 flex items-center justify-center rounded-full font-bold text-white shadow-sm tracking-wide ${avatarSizeStyle}`}
        style={{ backgroundColor: color }}
      >
        {initial}
      </span>
      {showName && (
        <span className={`font-medium text-tinta ${textSizeStyle}`}>
          {name}
        </span>
      )}
    </div>
  );
}
