'use client';
import { Footprints, Bike, Waves, Dumbbell } from 'lucide-react';

const ICONS = {
  running: Footprints,
  cycling: Bike,
  swimming: Waves,
};

// Stroke icon for an activity type. `boxed` wraps it in the standard
// brand-tinted square used on cards and headers.
export default function ActivityIcon({ type, size = 18, className = '', boxed = false, boxClass = '' }) {
  const Icon = ICONS[type] || Dumbbell;
  if (!boxed) return <Icon size={size} className={className} />;
  return (
    <div className={`rounded-xl bg-brand/10 border border-brand/25 flex items-center justify-center flex-none ${boxClass || 'w-10 h-10'}`}>
      <Icon size={size} className={`text-brand ${className}`} />
    </div>
  );
}
