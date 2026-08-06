// Avatar and Color helpers for consistent UI across the app

export const AVATAR_COLORS = [
  'var(--color-ptptlah-red)',
  'var(--color-ptptlah-orange)',
  'var(--color-ptptlah-yellow)',
  'var(--color-ptptlah-lime)',
  'var(--color-ptptlah-green)',
  'var(--color-ptptlah-cyan)',
  'var(--color-ptptlah-blue)',
  'var(--color-ptptlah-indigo)',
  'var(--color-ptptlah-purple)',
  'var(--color-ptptlah-pink)',
];

export function getInitials(name: string): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}
