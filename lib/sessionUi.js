// Small display helpers shared across session-related pages/components.

export const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// Parses a 'YYYY-MM-DD' string as a local calendar date (not UTC) so the
// weekday is never off-by-one for browsers/servers west of UTC.
export function getWeekdayName(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}

// Adds N weeks to a 'YYYY-MM-DD' string, returning the same format.
// Local calendar-date arithmetic (JS Date normalizes day overflow across
// month/year boundaries), so no UTC/timezone drift.
export function addWeeks(dateStr, weeks) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d + weeks * 7);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function getActivityEmoji(type) {
  switch (type) {
    case 'running': return '🏃';
    case 'cycling': return '🚴';
    case 'swimming': return '🏊';
    default: return '💪';
  }
}

export function getIntensityColor(intensity) {
  switch (intensity) {
    case 'easy': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'moderate': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'hard': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}
