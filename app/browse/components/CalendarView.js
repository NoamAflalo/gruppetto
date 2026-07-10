'use client';
import { useRouter } from 'next/navigation';
import { getActivityEmoji, getIntensityColor } from '@/lib/sessionUi';

const monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

function getDaysInMonth(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  return { daysInMonth, startingDayOfWeek };
}

// Month calendar with per-day session counts + a panel listing the selected
// day's sessions. `sessions` should already be filtered.
export default function CalendarView({
  sessions,
  currentDate,
  setCurrentDate,
  selectedDay,
  setSelectedDay,
  userId,
}) {
  const router = useRouter();
  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);

  const getSessionsForDay = (day) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    return sessions.filter(s => s.date === dateStr);
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(null);
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() &&
           currentDate.getMonth() === today.getMonth() &&
           currentDate.getFullYear() === today.getFullYear();
  };

  // Generate calendar grid
  const calendarDays = [];
  const adjustedStartDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

  for (let i = 0; i < adjustedStartDay; i++) {
    calendarDays.push(<div key={`empty-${i}`} style={{ background: 'transparent', border: 'none' }}></div>);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const daySessions = getSessionsForDay(day);
    const hasSessions = daySessions.length > 0;
    const isTodayDay = isToday(day);
    const isSelectedDay = selectedDay === day;

    calendarDays.push(
      <div
        key={day}
        onClick={() => {
          if (hasSessions) {
            setSelectedDay(day);
            setTimeout(() => {
              document.getElementById('selected-day-sessions')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
              });
            }, 100);
          }
        }}
        style={{
          aspectRatio: '1',
          padding: '0.5rem',
          background: hasSessions ? '#1f2937' : '#0a0a0a',
          border: isTodayDay ? '3px solid #f97316' : (isSelectedDay ? '2px solid #f97316' : (hasSessions ? '2px solid #374151' : '2px solid #1f1f1f')),
          borderRadius: '0.75rem',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          cursor: hasSessions ? 'pointer' : 'default',
        }}
        onMouseEnter={(e) => {
          if (hasSessions) {
            e.currentTarget.style.background = '#374151';
            e.currentTarget.style.borderColor = '#f97316';
            e.currentTarget.style.transform = 'scale(1.05)';
          }
        }}
        onMouseLeave={(e) => {
          if (hasSessions) {
            e.currentTarget.style.background = '#1f2937';
            e.currentTarget.style.borderColor = isSelectedDay ? '#f97316' : '#374151';
            e.currentTarget.style.transform = 'scale(1)';
          }
        }}
      >
        {hasSessions && (
          <div style={{
            position: 'absolute',
            top: '0.25rem',
            left: '0.25rem',
            background: '#f97316',
            color: '#fff',
            borderRadius: '9999px',
            width: '1.15rem',
            height: '1.15rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.625rem',
            fontWeight: '700',
            boxShadow: '0 2px 8px rgba(249, 115, 22, 0.4)',
          }}>
            {daySessions.length}
          </div>
        )}
        <div style={{
          fontSize: '1.125rem',
          fontWeight: hasSessions ? '600' : '500',
          color: hasSessions ? '#ffffff' : (isTodayDay ? '#f97316' : '#374151'),
          opacity: hasSessions ? 1 : 0.5,
        }}>
          {day}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-1 md:p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={goToPreviousMonth}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition font-semibold"
          >
            ← Prev
          </button>

          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={goToToday}
              className="text-sm text-orange-500 hover:text-orange-400 mt-1"
            >
              Today
            </button>
          </div>

          <button
            onClick={goToNextMonth}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition font-semibold"
          >
            Next →
          </button>
        </div>

        <div className="calendar-grid">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="calendar-header">{day}</div>
          ))}
          {calendarDays}
        </div>
      </div>

      {/* Sessions du jour sélectionné - SOUS le calendrier */}
      {selectedDay && (
        <div
          id="selected-day-sessions"
          className="bg-gray-900 rounded-2xl border border-gray-800 p-6 md:p-8"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">
              {monthNames[currentDate.getMonth()]} {selectedDay}, {currentDate.getFullYear()}
            </h2>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-gray-400 hover:text-white transition text-2xl"
            >
              ×
            </button>
          </div>

          {getSessionsForDay(selectedDay).length === 0 ? (
            <p className="text-gray-500 text-center py-8">No sessions on this day</p>
          ) : (
            <div className="space-y-4">
              {getSessionsForDay(selectedDay).map(session => (
                <div
                  key={session.id}
                  onClick={() => router.push(`/session/${session.id}`)}
                  className="bg-black rounded-xl border border-gray-800 p-4 hover:border-orange-500/50 transition cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{getActivityEmoji(session.activity_type)}</span>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1">{session.title}</h3>
                      <p className="text-sm text-gray-400 mb-2">{session.time} • {session.location}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getIntensityColor(session.intensity)}`}>
                          {session.intensity}
                        </span>
                        {session.isPrivate && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                            🔒 Private
                          </span>
                        )}
                        {session.girlsOnly && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/50 text-pink-400">
                            👭 Girls Only
                          </span>
                        )}
                        {session.participants?.includes(userId) && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                            ✓ Joined
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.75rem;
        }

        .calendar-header {
          padding: 1rem;
          text-align: center;
          font-weight: 600;
          color: #9ca3af;
          font-size: 0.875rem;
        }

        @media (max-width: 768px) {
          .calendar-grid {
            gap: 0.15rem;
          }

          .calendar-header {
            font-size: 0.5rem;
            padding: 0.25rem 0;
          }
        }
      `}</style>
    </div>
  );
}
