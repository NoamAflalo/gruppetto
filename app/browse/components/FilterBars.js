'use client';

function PillButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 md:px-6 py-2 rounded-lg font-semibold transition whitespace-nowrap flex-shrink-0 ${
        active ? 'bg-orange-500 text-white' : 'bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800'
      }`}
    >
      {children}
    </button>
  );
}

const VIEW_MODES = [
  { id: 'list', label: '📋 List' },
  { id: 'calendar', label: '📅 Calendar' },
  { id: 'map', label: '🗺️ Map' },
  { id: 'clubs', label: '👥 Clubs' },
];

export function ViewModeToggle({ viewMode, setViewMode }) {
  return (
    <div className="flex gap-2 mb-4 md:mb-6 overflow-x-auto pb-2">
      {VIEW_MODES.map(({ id, label }) => (
        <PillButton key={id} active={viewMode === id} onClick={() => setViewMode(id)}>
          {label}
        </PillButton>
      ))}
    </div>
  );
}

const ACTIVITIES = [
  { id: 'all', label: 'All' },
  { id: 'running', label: '🏃 Running' },
  { id: 'cycling', label: '🚴 Cycling' },
  { id: 'swimming', label: '🏊 Swimming' },
];

export function ActivityFilterBar({ filter, setFilter }) {
  return (
    <div className="flex gap-2 mb-4 md:mb-6 overflow-x-auto pb-2">
      {ACTIVITIES.map(({ id, label }) => (
        <PillButton key={id} active={filter === id} onClick={() => setFilter(id)}>
          {label}
        </PillButton>
      ))}
    </div>
  );
}
