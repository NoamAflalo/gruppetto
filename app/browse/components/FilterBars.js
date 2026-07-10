'use client';
import { List, CalendarDays, Map, Users, Footprints, Bike, Waves } from 'lucide-react';

function PillButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 md:px-5 py-2 rounded-lg font-semibold text-sm transition whitespace-nowrap flex-shrink-0 inline-flex items-center gap-2 ${
        active ? 'bg-brand text-white' : 'bg-card text-soft hover:bg-card2 border border-line'
      }`}
    >
      {Icon && <Icon size={15} className={active ? 'text-white' : 'text-muted'} />}
      {children}
    </button>
  );
}

const VIEW_MODES = [
  { id: 'list', label: 'List', icon: List },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'map', label: 'Map', icon: Map },
  { id: 'clubs', label: 'Clubs', icon: Users },
];

export function ViewModeToggle({ viewMode, setViewMode }) {
  return (
    <div className="flex gap-2 mb-4 md:mb-6 overflow-x-auto pb-2">
      {VIEW_MODES.map(({ id, label, icon }) => (
        <PillButton key={id} active={viewMode === id} onClick={() => setViewMode(id)} icon={icon}>
          {label}
        </PillButton>
      ))}
    </div>
  );
}

const ACTIVITIES = [
  { id: 'all', label: 'All' },
  { id: 'running', label: 'Running', icon: Footprints },
  { id: 'cycling', label: 'Cycling', icon: Bike },
  { id: 'swimming', label: 'Swimming', icon: Waves },
];

export function ActivityFilterBar({ filter, setFilter }) {
  return (
    <div className="flex gap-2 mb-4 md:mb-6 overflow-x-auto pb-2">
      {ACTIVITIES.map(({ id, label, icon }) => (
        <PillButton key={id} active={filter === id} onClick={() => setFilter(id)} icon={icon}>
          {label}
        </PillButton>
      ))}
    </div>
  );
}
