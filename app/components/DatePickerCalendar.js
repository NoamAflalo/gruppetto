'use client';
import { useState, useEffect, useRef } from 'react';

// Calendar-based date picker used by the browse filters (size="base") and the
// create-session form (size="lg", slightly larger paddings/rounding).
export default function DatePickerCalendar({ value, onChange, minDate, label, required, placeholder, size = 'base' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  const containerRef = useRef(null);

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

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
    if (value) {
      setViewDate(new Date(value));
    }
  }, [value]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(viewDate);
  const adjustedStartDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

  const goToPreviousMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const goToNextMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const selectDay = (day) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const isDateDisabled = (day) => {
    if (!minDate) return false;
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateStr < minDate;
  };

  const isSelectedDate = (day) => {
    if (!value) return false;
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateStr === value;
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() &&
           viewDate.getMonth() === today.getMonth() &&
           viewDate.getFullYear() === today.getFullYear();
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return placeholder || 'Select date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const calendarDays = [];
  for (let i = 0; i < adjustedStartDay; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const disabled = isDateDisabled(day);
    const selected = isSelectedDate(day);
    const today = isToday(day);

    calendarDays.push(
      <button
        key={day}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && selectDay(day)}
        className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
          selected
            ? 'bg-orange-500 text-white'
            : today
              ? 'bg-orange-500/20 text-orange-400 border border-orange-500'
              : disabled
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-gray-300 hover:bg-gray-700'
        }`}
      >
        {day}
      </button>
    );
  }

  const buttonClass = size === 'lg'
    ? 'w-full p-3 md:p-4 bg-black border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-left flex items-center justify-between text-base'
    : 'w-full p-3 bg-black border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-left flex items-center justify-between';

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          {label} {required && '*'}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClass}
      >
        <span className={value ? 'text-white' : 'text-gray-500'}>
          {formatDisplayDate(value)}
        </span>
        <span className="text-gray-400">📅</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-xl min-w-[280px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
            >
              ←
            </button>
            <span className="font-semibold text-white">
              {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <button
              type="button"
              onClick={goToNextMonth}
              className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
            >
              →
            </button>
          </div>

          {/* Days header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
              <div key={d} className="w-8 h-6 text-center text-xs text-gray-500 font-medium">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays}
          </div>

          {/* Today button */}
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              const todayStr = today.toISOString().split('T')[0];
              if (!minDate || todayStr >= minDate) {
                onChange(todayStr);
                setIsOpen(false);
              }
            }}
            className="w-full mt-3 py-2 text-sm text-orange-500 hover:text-orange-400 font-medium"
          >
            Today
          </button>
        </div>
      )}
    </div>
  );
}
