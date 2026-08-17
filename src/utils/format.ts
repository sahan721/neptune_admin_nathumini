/** Small formatting helpers shared across the dashboard UI. */

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

export function formatWeight(kg: number | null): string {
  return kg === null ? '—' : `${kg.toFixed(1)} kg`;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function classNames(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function colourHex(value: string): string {
  const map: Record<string, string> = {
    WHITE: '#ffffff',
    GREEN: '#2c8a52',
    BLUE: '#2563ab',
    RED: '#c1352b',
    BLACK: '#1c1c1c',
    SILVER: '#b6bdb9',
    YELLOW: '#d9a512',
  };
  return map[value] ?? '#e8efe9';
}