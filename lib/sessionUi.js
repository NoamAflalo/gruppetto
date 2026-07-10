// Small display helpers shared across session-related pages/components.

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
