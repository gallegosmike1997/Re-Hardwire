/** Shared display helpers. */

/** Format an ISO timestamp as a short, locale-aware clock time. */
export function formatTime(iso?: string): string {
  if (!iso) return '--:--';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/** Format an ISO timestamp as a short date. */
export function formatDate(iso?: string): string {
  if (!iso) return 'Unknown';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Format an ISO timestamp as a relative "3m ago" style string. */
export function formatRelative(iso?: string): string {
  if (!iso) return 'never';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'never';

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return 'just now';
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.round(seconds / 86400)}d ago`;
  return formatDate(iso);
}

/** Render a 0-1 confidence value as a whole percentage. */
export function formatPercent(value?: number): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '--';
  return `${Math.round(value * 100)}%`;
}

/** Turn a snake_case action or state into Title Case words. */
export function humanize(value?: string): string {
  if (!value) return 'Unknown';
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Truncate long text for previews. */
export function truncate(text: string, max = 90): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

/** Shorten a protocol name for compact chips, tolerating older stored shapes. */
export function shortProtocol(value?: unknown): string {
  const name = typeof value === 'string'
    ? value
    : value && typeof value === 'object' && 'name' in value && typeof value.name === 'string'
      ? value.name
      : '';
  if (!name) return 'No protocol';
  return name.replace('Resilience Builder Level ', 'L');
}
