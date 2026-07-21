'use client';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Clock, MapPin, Lock, Check, X, Repeat } from 'lucide-react';
import { getIntensityColor } from '@/lib/sessionUi';
import ActivityIcon from '../../components/ActivityIcon';

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
          background: hasSessions ? '#211D17' : '#100E0B',
          border: isTodayDay ? '2px solid #F97316' : (isSelectedDay ? '2px solid #F97316' : (hasSessions ? '1px solid #3A342B' : '1px solid #1C1915')),
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
            e.currentTarget.style.background = '#2A251E';
            e.currentTarget.style.borderColor = '#F97316';
            e.currentTarget.style.transform = 'scale(1.05)';
          }
        }}
        onMouseLeave={(e) => {
          if (hasSessions) {
            e.currentTarget.style.background = '#211D17';
            e.currentTarget.style.borderColor = isSelectedDay ? '#F97316' : '#3A342B';
            e.currentTarget.style.transform = 'scale(1)';
          }
        }}
      >
        {hasSessions && (
          <div style={{
            position: 'absolute',
            top: '0.25rem',
            left: '0.25rem',
            background: '#F97316',
            color: '#fff',
            borderRadius: '9999px',
            width: '1.15rem',
            height: '1.15rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.625rem',
            fontWeight: '700',
            boxShadow: '0 2px 8px rgba(249, 115, 22, 0.35)',
          }}>
            {daySessions.length}
          </div>
        )}
        <div style={{
          fontSize: '1.125rem',
          fontWeight: hasSessions ? '600' : '500',
          color: hasSessions ? '#F2EFE9' : (isTodayDay ? '#F97316' : '#57524A'),
          opacity: hasSessions ? 1 : 0.6,
        }}>
          {day}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="bg-card rounded-2xl border border-line p-1 md:p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={goToPreviousMonth}
            className="px-3 py-2 bg-card2 text-soft rounded-lg hover:text-ink transition font-semibold inline-flex items-center gap-1"
          >
            <ChevronLeft size={16} /> Prev
          </button>

          <div className="text-center">
            <h2 className="font-display uppercase text-2xl md:text-3xl text-ink">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={goToToday}
              className="text-sm text-brand hover:text-brand-soft mt-1"
            >
              Today
            </button>
          </div>

          <button
            onClick={goToNextMonth}
            className="px-3 py-2 bg-card2 text-soft rounded-lg hover:text-ink transition font-semibold inline-flex items-center gap-1"
          >
            Next <ChevronRight size={16} />
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
          className="bg-card rounded-2xl border border-line p-6 md:p-8"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-display uppercase text-2xl text-ink">
              {monthNames[currentDate.getMonth()]} {selectedDay}, {currentDate.getFullYear()}
            </h2>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-muted hover:text-ink transition p-1"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          {getSessionsForDay(selectedDay).length === 0 ? (
            <p className="text-muted text-center py-8">No sessions on this day</p>
          ) : (
            <div className="space-y-4">
              {getSessionsForDay(selectedDay).map(session => (
                <div
                  key={session.id}
                  onClick={() => router.push(`/session/${session.id}`)}
                  className="bg-ground rounded-xl border border-line p-4 hover:border-brand/50 transition cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <ActivityIcon type={session.activity_type} boxed size={17} boxClass="w-9 h-9" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display uppercase text-lg text-ink mb-1">{session.title}</h3>
                      <p className="text-sm text-muted mb-2 inline-flex items-center gap-3 flex-wrap">
                        <span className="inline-flex items-center gap-1.5"><Clock size={13} /> {session.time}</span>
                        <span className="inline-flex items-center gap-1.5"><MapPin size={13} /> {session.location}</span>
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide border ${getIntensityColor(session.intensity)}`}>
                          {session.intensity}
                        </span>
                        {session.isPrivate && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-card2 text-soft border border-line inline-flex items-center gap-1">
                            <Lock size={10} /> Private
                          </span>
                        )}
                        {session.girlsOnly && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-pink-500/10 border border-pink-500/40 text-pink-400">
                            Girls only
                          </span>
                        )}
                        {session.recurringSessionId && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-brand/10 border border-brand/30 text-brand-soft inline-flex items-center gap-1">
                            <Repeat size={10} /> Weekly
                          </span>
                        )}
                        {session.participants?.includes(userId) && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-brand/15 text-brand-soft border border-brand/30 inline-flex items-center gap-1">
                            <Check size={10} /> Joined
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
          color: #A39E93;
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
