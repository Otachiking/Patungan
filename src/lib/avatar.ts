// Avatar and Color helpers for consistent UI across the app

export const AVATAR_COLORS = [
  'var(--color-spillthebill-red)',
  'var(--color-spillthebill-orange)',
  'var(--color-spillthebill-yellow)',
  'var(--color-spillthebill-lime)',
  'var(--color-spillthebill-green)',
  'var(--color-spillthebill-cyan)',
  'var(--color-spillthebill-blue)',
  'var(--color-spillthebill-indigo)',
  'var(--color-spillthebill-purple)',
  'var(--color-spillthebill-pink)',
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
