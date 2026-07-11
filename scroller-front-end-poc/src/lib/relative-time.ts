// Coarse "N ago" label for shortlist rows (e.g. "Saved 2 days ago"). Deliberately
// day-granular — the shortlist never needs sub-day precision.

export function formatRelativeDay(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) {
    return '';
  }
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) {
    return '';
  }

  const days = Math.floor((now.getTime() - then.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) {
    return 'today';
  }
  if (days === 1) {
    return 'yesterday';
  }
  if (days < 7) {
    return `${days} days ago`;
  }

  const weeks = Math.floor(days / 7);
  if (days < 30) {
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }

  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}
