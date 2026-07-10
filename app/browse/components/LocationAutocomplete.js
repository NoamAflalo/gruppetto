'use client';
import { useState, useEffect, useRef } from 'react';
import { MapPin, Waves } from 'lucide-react';
import { londonLocations, getPools, getNonPools } from '@/lib/londonLocations';

export default function LocationAutocomplete({ value, onChange, activityFilter, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const containerRef = useRef(null);

  // Filtrer les lieux selon l'activité
  const getFilteredLocations = () => {
    if (activityFilter === 'swimming') {
      return getPools();
    }
    // Pour les autres activités, on montre tout sauf les piscines par défaut
    // Mais si "all" est sélectionné, on montre tout
    if (activityFilter === 'all') {
      return londonLocations;
    }
    return getNonPools();
  };

  const locations = getFilteredLocations();

  // Filtrer par terme de recherche
  const filteredLocations = locations.filter(loc =>
    loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.area.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Grouper par zone
  const groupedLocations = filteredLocations.reduce((acc, loc) => {
    if (!acc[loc.area]) {
      acc[loc.area] = [];
    }
    acc[loc.area].push(loc);
    return acc;
  }, {});

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  const handleSelect = (locationName) => {
    setSearchTerm(locationName);
    onChange(locationName);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSearchTerm('');
    onChange('');
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder || "Search location..."}
          className="w-full p-3 bg-ground border border-line rounded-lg text-ink placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-brand pr-10"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-card border border-line rounded-xl shadow-xl max-h-64 overflow-y-auto">
          {Object.keys(groupedLocations).length === 0 ? (
            <div className="p-3 text-muted text-sm">No locations found</div>
          ) : (
            Object.entries(groupedLocations).map(([area, locs]) => (
              <div key={area}>
                <div className="px-3 py-2 bg-card2 text-xs font-semibold text-muted uppercase sticky top-0">
                  {area}
                </div>
                {locs.map((loc) => (
                  <button
                    key={loc.name}
                    type="button"
                    onClick={() => handleSelect(loc.name)}
                    className={`w-full px-3 py-2 text-left text-sm transition hover:bg-card2 flex items-center gap-2 ${
                      searchTerm === loc.name ? 'bg-brand/20 text-brand-soft' : 'text-soft'
                    }`}
                  >
                    {loc.type === 'pool'
                      ? <Waves size={13} className="text-muted flex-none" />
                      : <MapPin size={13} className="text-muted flex-none" />}
                    <span>{loc.name}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
