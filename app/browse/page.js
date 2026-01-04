'use client';
import { useState, useEffect, useRef } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, getDoc, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Navigation from '../components/navigation';
import SessionMap from '../components/map';
import Toast from '../components/Toast';
import { londonLocations, getPools, getNonPools } from '@/lib/londonLocations';

// Composant LocationAutocomplete
function LocationAutocomplete({ value, onChange, activityFilter, placeholder }) {
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
          className="w-full p-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 pr-10"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-gray-900 border border-gray-700 rounded-xl shadow-xl max-h-64 overflow-y-auto">
          {Object.keys(groupedLocations).length === 0 ? (
            <div className="p-3 text-gray-500 text-sm">No locations found</div>
          ) : (
            Object.entries(groupedLocations).map(([area, locs]) => (
              <div key={area}>
                <div className="px-3 py-2 bg-gray-800 text-xs font-semibold text-gray-400 uppercase sticky top-0">
                  {area}
                </div>
                {locs.map((loc) => (
                  <button
                    key={loc.name}
                    type="button"
                    onClick={() => handleSelect(loc.name)}
                    className={`w-full px-3 py-2 text-left text-sm transition hover:bg-gray-800 flex items-center gap-2 ${
                      searchTerm === loc.name ? 'bg-orange-500/20 text-orange-400' : 'text-gray-300'
                    }`}
                  >
                    <span>{loc.type === 'pool' ? '🏊' : '📍'}</span>
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

// Composant DatePicker avec calendrier
function DatePickerCalendar({ value, onChange, minDate, label, placeholder }) {
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

  return (
    <div ref={containerRef} className="relative">
      {label && <label className="block text-sm font-semibold text-gray-300 mb-2">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 bg-black border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-left flex items-center justify-between"
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

export default function Sessions() {
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // 'list', 'map', 'calendar', or 'clubs'
  const [selectedSession, setSelectedSession] = useState(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [toast, setToast] = useState(null);
  const [advancedFilters, setAdvancedFilters] = useState({
    dateFrom: '',
    dateTo: '',
    specificDate: new Date().toISOString().split('T')[0], // Pour Map View
    intensities: [],
    location: '',
    girlsOnly: false,
  });
  
  // Clubs state
  const [clubs, setClubs] = useState([]);
  const [loadingClubs, setLoadingClubs] = useState(false);
    
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  
  const router = useRouter();

  // Check if user is female
  const isUserFemale = userProfile?.gender === 'female';

  // Reset location filter when activity filter changes
  useEffect(() => {
    if (advancedFilters.location) {
      const pools = getPools().map(p => p.name.toLowerCase());
      const isCurrentLocationPool = pools.includes(advancedFilters.location.toLowerCase());
      
      // If switching to swimming and current location is not a pool, clear it
      if (filter === 'swimming' && !isCurrentLocationPool) {
        setAdvancedFilters(prev => ({ ...prev, location: '' }));
      }
      // If switching away from swimming and current location is a pool, keep it (pools are valid for other activities too)
    }
  }, [filter]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        router.push('/');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // Fetch user profile for recommendations AND gender verification
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
        if (profileDoc.exists()) {
          setUserProfile(profileDoc.data());
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    
    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'sessions'), orderBy('created_at', 'desc'));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const sessionsData = [];
      const userIds = new Set();
      
      snapshot.forEach((doc) => {
        const session = { id: doc.id, ...doc.data() };
        sessionsData.push(session);
        
        if (session.host_user_id) userIds.add(session.host_user_id);
        if (session.participants) {
          session.participants.forEach(id => userIds.add(id));
        }
      });
      
      setSessions(sessionsData);
      
      const profilesData = {};
      for (const userId of userIds) {
        if (!profiles[userId]) {
          const profileDoc = await getDoc(doc(db, 'profiles', userId));
          if (profileDoc.exists()) {
            profilesData[userId] = profileDoc.data();
          }
        }
      }
      setProfiles(prev => ({ ...prev, ...profilesData }));
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch clubs
  const fetchClubs = async () => {
    setLoadingClubs(true);
    try {
      const clubsQuery = query(
        collection(db, 'clubs'),
        where('status', '==', 'approved')
      );
      const snapshot = await getDocs(clubsQuery);
      const clubsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClubs(clubsData);
    } catch (error) {
      console.error('Error fetching clubs:', error);
    } finally {
      setLoadingClubs(false);
    }
  };

  // Fetch clubs on mount
  useEffect(() => {
    if (user) {
      fetchClubs();
    }
  }, [user]);

  const handleJoinSession = async (sessionId, currentParticipants) => {
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      const sessionDoc = await getDoc(sessionRef);
      const sessionData = sessionDoc.data();
      
      // Vérification Girls Only
      if (sessionData.girlsOnly && !currentParticipants.includes(user.uid)) {
        if (!userProfile) {
          setToast({ message: 'Please complete your profile first', type: 'error' });
          return;
        }

        if (!userProfile.gender) {
          setToast({ message: 'Please set your gender in your profile to join this session', type: 'warning' });
          setTimeout(() => router.push('/profile'), 2000);
          return;
        }

        if (userProfile.gender !== 'female') {
          setToast({ message: 'This is a Girls Only session. Only women can join.', type: 'error' });
          return;
        }
      }
      
      if (currentParticipants.includes(user.uid)) {
        await updateDoc(sessionRef, {
          participants: arrayRemove(user.uid)
        });
        setToast({ message: 'You left the session', type: 'success' });
      } else {
        await updateDoc(sessionRef, {
          participants: arrayUnion(user.uid)
        });
        
        setToast({ message: 'Successfully joined the session!', type: 'success' });
        
        const currentProfile = profiles[user.uid] || userProfile || {};
        
        try {
          await fetch('/api/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'session_joined',
              to: sessionData.host_email,
              data: {
                sessionTitle: sessionData.title,
                participantName: currentProfile.displayName || user.email,
                date: sessionData.date,
                time: sessionData.time,
                location: sessionData.location,
                participantCount: (currentParticipants.length + 1),
              },
            }),
          });
        } catch (emailError) {
          console.error('Email error:', emailError);
        }
      }
    } catch (error) {
      console.error('Error joining/leaving session:', error);
      setToast({ message: 'Error processing your request', type: 'error' });
    }
  };

  const filteredSessions = sessions.filter(session => {
    // Filter out past sessions
    const sessionDateTime = new Date(`${session.date}T${session.time}`);
    const now = new Date();
    
    if (sessionDateTime < now) return false;
    
    // Activity type filter
    if (filter !== 'all' && session.activity_type !== filter) return false;
    
    // Advanced filters - Different logic for Map View
    if (viewMode === 'map' && advancedFilters.specificDate) {
      // Map View: Show only sessions for the specific date
      if (session.date !== advancedFilters.specificDate) return false;
    } else {
      // List/Calendar View: Use date range
      if (advancedFilters.dateFrom && session.date < advancedFilters.dateFrom) return false;
      if (advancedFilters.dateTo && session.date > advancedFilters.dateTo) return false;
    }
    
    if (advancedFilters.intensities.length > 0 && !advancedFilters.intensities.includes(session.intensity)) return false;
    if (advancedFilters.location && !session.location.toLowerCase().includes(advancedFilters.location.toLowerCase())) return false;
    
    // Filtre Girls Only - Ne pas montrer les sessions Girls Only aux non-femmes
    // sauf si elles y participent déjà
    if (session.girlsOnly && !isUserFemale && !session.participants?.includes(user?.uid)) {
      return false;
    }
    
    // Filtre pour n'afficher que les sessions Girls Only
    if (advancedFilters.girlsOnly && !session.girlsOnly) return false;
    
    return true;
  });

  // Sort by date (soonest first)
  const sortedSessions = [...filteredSessions].sort((a, b) => {
    const dateA = new Date(a.date + ' ' + a.time);
    const dateB = new Date(b.date + ' ' + b.time);
    return dateA - dateB;
  });

  // Recommend sessions
  const getRecommendedSessions = () => {
    if (!userProfile || !userProfile.ratings) return [];
    
    const { ratings, location, activities } = userProfile;
    
    let bestActivity = 'running';
    let bestRating = ratings.running || 0;
    
    if ((ratings.cycling || 0) > bestRating) {
      bestActivity = 'cycling';
      bestRating = ratings.cycling;
    }
    if ((ratings.swimming || 0) > bestRating) {
      bestActivity = 'swimming';
      bestRating = ratings.swimming;
    }
    
    const scoredSessions = sortedSessions.map(session => {
      let score = 0;
      
      if (session.activity_type === bestActivity) {
        score += 15;
      } else if (activities?.includes(session.activity_type)) {
        score += 8;
      }
      
      const sessionRating = ratings[session.activity_type] || bestRating;
      
      if (session.intensity === 'hard' && sessionRating < 3) {
        return { ...session, recommendationScore: 0 };
      }
      
      if (session.intensity === 'easy') {
        score += 6;
      } else if (session.intensity === 'moderate') {
        if (sessionRating >= 2 && sessionRating <= 5) score += 8;
        else if (sessionRating === 1) score += 3;
      } else if (session.intensity === 'hard') {
        if (sessionRating >= 4) score += 10;
        else if (sessionRating === 3) score += 4;
      }
      
      if (location) {
        const sessionLocation = session.meetingPoint || session.location.split(' → ')[0];
        if (sessionLocation.toLowerCase().includes(location.toLowerCase())) {
          score += 8;
        }
      }
      
      if (!session.participants?.includes(user.uid)) {
        score += 4;
      } else {
        score -= 10;
      }
      
      if (!session.max_participants || (session.participants?.length || 0) < session.max_participants) {
        score += 3;
      }
      
      const sessionDate = new Date(`${session.date}T${session.time}`);
      const now = new Date();
      const daysUntil = (sessionDate - now) / (1000 * 60 * 60 * 24);
      
      if (daysUntil <= 7) {
        score += 5;
      }
      
      return { ...session, recommendationScore: score };
    });
    
    return scoredSessions
      .filter(s => s.recommendationScore >= 10 && !s.participants?.includes(user.uid))
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, 5);
  };

  const recommendedSessions = getRecommendedSessions();

  // Calendar functions
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);

  const getSessionsForDay = (day) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    return filteredSessions.filter(s => s.date === dateStr);
  };

  const getActivityEmoji = (type) => {
    switch(type) {
      case 'running': return '🏃';
      case 'cycling': return '🚴';
      case 'swimming': return '🏊';
      default: return '💪';
    }
  };

  const getIntensityColor = (intensity) => {
    switch(intensity) {
      case 'easy': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'moderate': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'hard': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

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

  const handleMarkerClick = (session) => {
    setSelectedSession(session);
    setViewMode('list');
    setTimeout(() => {
      document.getElementById(`session-${session.id}`)?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }, 100);
  };

  // Separate featured and regular clubs
  const featuredClubs = clubs.filter(c => c.isFeatured);
  const regularClubs = clubs.filter(c => !c.isFeatured);

  // Format date for display
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation user={user} />
      
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white mb-2">Browse Sessions</h1>
            <p className="text-gray-400 text-base md:text-lg">Find and join training sessions</p>
          </div>
          <button
            onClick={() => router.push('/create')}
            className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-semibold transition w-full md:w-auto"
          >
            + Create Session
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2 mb-4 md:mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 md:px-6 py-2 rounded-lg font-semibold transition whitespace-nowrap flex-shrink-0 ${
              viewMode === 'list' ? 'bg-orange-500 text-white' : 'bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800'
            }`}
          >
            📋 List
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 md:px-6 py-2 rounded-lg font-semibold transition whitespace-nowrap flex-shrink-0 ${
              viewMode === 'calendar' ? 'bg-orange-500 text-white' : 'bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800'
            }`}
          >
            📅 Calendar
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-4 md:px-6 py-2 rounded-lg font-semibold transition whitespace-nowrap flex-shrink-0 ${
              viewMode === 'map' ? 'bg-orange-500 text-white' : 'bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800'
            }`}
          >
            🗺️ Map
          </button>
          <button
            onClick={() => setViewMode('clubs')}
            className={`px-4 md:px-6 py-2 rounded-lg font-semibold transition whitespace-nowrap flex-shrink-0 ${
              viewMode === 'clubs' ? 'bg-orange-500 text-white' : 'bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800'
            }`}
          >
            👥 Clubs
          </button>
        </div>

        {/* Filter Buttons - Only show for sessions views */}
        {viewMode !== 'clubs' && (
          <div className="flex gap-2 mb-4 md:mb-6 overflow-x-auto pb-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 md:px-6 py-2 rounded-lg font-semibold transition whitespace-nowrap flex-shrink-0 ${
                filter === 'all' ? 'bg-orange-500 text-white' : 'bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('running')}
              className={`px-4 md:px-6 py-2 rounded-lg font-semibold transition whitespace-nowrap flex-shrink-0 ${
                filter === 'running' ? 'bg-orange-500 text-white' : 'bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800'
              }`}
            >
              🏃 Running
            </button>
            <button
              onClick={() => setFilter('cycling')}
              className={`px-4 md:px-6 py-2 rounded-lg font-semibold transition whitespace-nowrap flex-shrink-0 ${
                filter === 'cycling' ? 'bg-orange-500 text-white' : 'bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800'
              }`}
            >
              🚴 Cycling
            </button>
            <button
              onClick={() => setFilter('swimming')}
              className={`px-4 md:px-6 py-2 rounded-lg font-semibold transition whitespace-nowrap flex-shrink-0 ${
                filter === 'swimming' ? 'bg-orange-500 text-white' : 'bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800'
              }`}
            >
              🏊 Swimming
            </button>
          </div>
        )}

        {/* MAP VIEW - Date Picker au dessus des Advanced Filters */}
        {viewMode === 'map' && (
          <div className="mb-4">
            <div className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 border border-orange-500/30 rounded-xl p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📅</span>
                  <span className="text-white font-semibold">Show sessions for:</span>
                </div>
                <div className="flex-1 max-w-xs">
                  <DatePickerCalendar
                    value={advancedFilters.specificDate}
                    onChange={(date) => setAdvancedFilters({ ...advancedFilters, specificDate: date })}
                    minDate={new Date().toISOString().split('T')[0]}
                    placeholder="Select a date"
                  />
                </div>
                <div className="text-sm text-gray-400">
                  {sortedSessions.length} session{sortedSessions.length !== 1 ? 's' : ''} found
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Filters Toggle - Only for sessions views */}
        {viewMode !== 'clubs' && (
          <div className="mb-6">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="text-orange-500 font-semibold hover:text-orange-400 transition flex items-center gap-2"
            >
              {showAdvancedFilters ? '▼' : '▶'} Advanced Filters
            </button>
          </div>
        )}

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && viewMode !== 'clubs' && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 md:p-6 mb-6 md:mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              
              {/* From Date - Only in List View */}
              {viewMode === 'list' && (
                <DatePickerCalendar
                  label="From Date"
                  value={advancedFilters.dateFrom}
                  onChange={(date) => setAdvancedFilters({ ...advancedFilters, dateFrom: date })}
                  minDate={new Date().toISOString().split('T')[0]}
                  placeholder="Select start date"
                />
              )}

              {/* To Date - Only in List View */}
              {viewMode === 'list' && (
                <DatePickerCalendar
                  label="To Date"
                  value={advancedFilters.dateTo}
                  onChange={(date) => setAdvancedFilters({ ...advancedFilters, dateTo: date })}
                  minDate={advancedFilters.dateFrom || new Date().toISOString().split('T')[0]}
                  placeholder="Select end date"
                />
              )}

              {/* Location - All Views */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Location</label>
                <LocationAutocomplete
                  value={advancedFilters.location}
                  onChange={(value) => setAdvancedFilters({ ...advancedFilters, location: value })}
                  activityFilter={filter}
                  placeholder={filter === 'swimming' ? "Search pools..." : "Search location..."}
                />
              </div>

              {/* Intensity - All Views */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Intensity</label>
                <div className="flex gap-2">
                  {['easy', 'moderate', 'hard'].map((intensity) => (
                    <button
                      key={intensity}
                      type="button"
                      onClick={() => {
                        if (advancedFilters.intensities.includes(intensity)) {
                          setAdvancedFilters({
                            ...advancedFilters,
                            intensities: advancedFilters.intensities.filter(i => i !== intensity)
                          });
                        } else {
                          setAdvancedFilters({
                            ...advancedFilters,
                            intensities: [...advancedFilters.intensities, intensity]
                          });
                        }
                      }}
                      className={`px-2 md:px-3 py-2 rounded-lg text-xs md:text-sm font-semibold capitalize transition ${
                        advancedFilters.intensities.includes(intensity)
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {intensity}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Girls Only Filter - Only visible for women */}
            {isUserFemale && (
              <div className="mt-4">
                <div className="flex items-center gap-3 bg-black rounded-xl p-4 border border-gray-800">
                  <input
                    type="checkbox"
                    id="girlsOnlyFilter"
                    checked={advancedFilters.girlsOnly}
                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, girlsOnly: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-600 text-pink-500 focus:ring-pink-500 focus:ring-offset-gray-900"
                  />
                  <label htmlFor="girlsOnlyFilter" className="text-white font-semibold cursor-pointer flex items-center gap-2">
                    👭 Girls Only Sessions
                  </label>
                </div>
              </div>
            )}

            {/* Clear Filters */}
            <div className="mt-4">
              <button
                onClick={() => {
                  if (viewMode === 'map') {
                    setAdvancedFilters({ ...advancedFilters, specificDate: new Date().toISOString().split('T')[0], intensities: [], location: '', girlsOnly: false });
                  } else {
                    setAdvancedFilters({ dateFrom: '', dateTo: '', specificDate: new Date().toISOString().split('T')[0], intensities: [], location: '', girlsOnly: false });
                  }
                }}
                className="text-sm text-gray-400 hover:text-orange-500 transition"
              >
                Clear all filters
              </button>
            </div>
          </div>
        )}

        {/* CLUBS VIEW */}
        {viewMode === 'clubs' && (
          <div>
            {loadingClubs ? (
              <div className="text-center py-12">
                <p className="text-gray-400">Loading clubs...</p>
              </div>
            ) : clubs.length === 0 ? (
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 md:p-12 text-center">
                <p className="text-gray-400 text-base md:text-lg">No clubs available yet. Be the first to create one!</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Featured Clubs */}
                {featuredClubs.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-4">✨ Featured Clubs</h2>
                    <div className="grid gap-6">
                      {featuredClubs.map((club) => (
                        <div
                          key={club.id}
                          onClick={() => router.push(`/club/${club.id}`)}
                          className="bg-gradient-to-r from-orange-500/10 to-pink-500/10 border-2 border-orange-500/50 rounded-xl p-6 hover:border-orange-500 transition cursor-pointer"
                        >
                          <div className="flex flex-col lg:flex-row gap-6">
                            {club.coverImage && (
                              <img 
                                src={club.coverImage} 
                                alt={club.name}
                                className="w-full lg:w-64 h-48 object-cover rounded-lg"
                              />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-2xl font-bold text-white">{club.name}</h3>
                                <span className="px-2 py-1 bg-orange-500 text-white rounded text-xs font-bold">
                                  ✓ VERIFIED
                                </span>
                              </div>
                              <div className="space-y-1 text-sm mb-4">
                                <p className="text-gray-300">
                                  {getActivityEmoji(club.activity_type)} {club.activity_type.charAt(0).toUpperCase() + club.activity_type.slice(1)}
                                </p>
                                <p className="text-gray-300">📍 {club.location}</p>
                                <p className="text-gray-300">👥 {club.member_count || 1} members</p>
                              </div>
                              <p className="text-gray-400 mb-4 line-clamp-2">{club.description}</p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/club/${club.id}`);
                                }}
                                className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 font-semibold transition"
                              >
                                View Club
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* All Clubs */}
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4">
                    {featuredClubs.length > 0 ? 'All Clubs' : 'Clubs'}
                  </h2>
                  <div className="grid gap-6">
                    {regularClubs.map((club) => (
                      <div
                        key={club.id}
                        onClick={() => router.push(`/club/${club.id}`)}
                        className="bg-gray-900 rounded-xl border border-gray-800 p-6 hover:border-orange-500/50 transition cursor-pointer"
                      >
                        <div className="flex flex-col lg:flex-row gap-6">
                          {club.coverImage && (
                            <img 
                              src={club.coverImage} 
                              alt={club.name}
                              className="w-full lg:w-64 h-48 object-cover rounded-lg"
                            />
                          )}
                          <div className="flex-1">
                            <h3 className="text-2xl font-bold text-white mb-2">{club.name}</h3>
                            <div className="space-y-1 text-sm mb-4">
                              <p className="text-gray-300">
                                {getActivityEmoji(club.activity_type)} {club.activity_type.charAt(0).toUpperCase() + club.activity_type.slice(1)}
                              </p>
                              <p className="text-gray-300">📍 {club.location}</p>
                              <p className="text-gray-300">👥 {club.member_count || 1} members</p>
                            </div>
                            <p className="text-gray-400 mb-4 line-clamp-2">{club.description}</p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/club/${club.id}`);
                              }}
                              className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 font-semibold transition"
                            >
                              View Club
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CALENDAR VIEW */}
        {viewMode === 'calendar' && (
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
                              {/* Badge Girls Only dans Calendar */}
                              {session.girlsOnly && (
                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/50 text-pink-400">
                                  👭 Girls Only
                                </span>
                              )}
                              {session.participants?.includes(user?.uid) && (
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
          </div>
        )}

        {/* MAP VIEW */}
        {viewMode === 'map' && (
          <div className="mb-8 rounded-xl overflow-hidden border border-gray-800" style={{ height: '400px' }}>
            <SessionMap 
              sessions={sortedSessions} 
              onMarkerClick={handleMarkerClick}
            />
          </div>
        )}

        {/* LIST VIEW */}
        {viewMode === 'list' && (
          <>
            {/* Recommended Sessions */}
            {recommendedSessions.length > 0 && (
              <div className="mb-6 md:mb-8">
                <button
                  onClick={() => setShowRecommendations(!showRecommendations)}
                  className="w-full bg-gradient-to-r from-orange-500/10 to-pink-500/10 border-2 border-orange-500/50 rounded-xl p-4 hover:border-orange-500 transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">✨</span>
                    <div className="text-left">
                      <h3 className="text-lg md:text-xl font-bold text-white">
                        Recommended For You
                      </h3>
                      <p className="text-xs md:text-sm text-gray-400">
                        {recommendedSessions.length} session{recommendedSessions.length !== 1 ? 's' : ''} match your profile
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-orange-500 text-white rounded-full text-xs font-bold">
                      {recommendedSessions.length}
                    </span>
                    <svg 
                      width="20" 
                      height="20" 
                      viewBox="0 0 20 20" 
                      fill="currentColor" 
                      className={`text-orange-500 transition-transform ${showRecommendations ? 'rotate-180' : ''}`}
                    >
                      <path d="M10 12L5 7h10z"/>
                    </svg>
                  </div>
                </button>

                {showRecommendations && (
                  <div className="mt-4 space-y-4">
                    {recommendedSessions.map((session) => {
                      const isParticipant = session.participants?.includes(user.uid);
                      const participantCount = session.participants?.length || 0;
                      const hostProfile = profiles[session.host_user_id];
                      
                      return (
                        <div 
                          key={session.id}
                          className="bg-gradient-to-r from-orange-500/10 to-pink-500/10 rounded-xl border-2 border-orange-500/50 p-4 md:p-6 hover:border-orange-500 transition cursor-pointer"
                          onClick={() => router.push(`/session/${session.id}`)}
                        >
                          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 md:gap-3 mb-3 flex-wrap">
                                <span className="text-2xl md:text-3xl">{getActivityEmoji(session.activity_type)}</span>
                                <h3 className="text-lg md:text-xl font-bold text-white">{session.title}</h3>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getIntensityColor(session.intensity)}`}>
                                  {session.intensity}
                                </span>
                                <span className="px-3 py-1 bg-orange-500 text-white rounded-full text-xs font-bold">
                                  MATCH
                                </span>
                                {session.isPrivate && (
                                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                    🔒 Private
                                  </span>
                                )}
                                {/* Badge Girls Only */}
                                {session.girlsOnly && (
                                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/50 text-pink-400">
                                    👭 Girls Only
                                  </span>
                                )}
                              </div>
                              
                              <p className="text-gray-300 mb-3 text-sm line-clamp-2">{session.description}</p>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-300 mb-3">
                                <div>📅 {session.date}</div>
                                <div>🕐 {session.time}</div>
                                <div className="sm:col-span-2">📍 {session.location}</div>
                              </div>
                              
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <span>👥 {participantCount} joined</span>
                              </div>
                            </div>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleJoinSession(session.id, session.participants || []);
                              }}
                              disabled={!isParticipant && session.max_participants && participantCount >= session.max_participants}
                              className={`w-full md:w-auto md:ml-6 px-6 py-3 rounded-lg font-semibold transition ${
                                isParticipant
                                  ? 'bg-red-500 text-white hover:bg-red-600'
                                  : 'bg-orange-500 text-white hover:bg-orange-600 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed'
                              }`}
                            >
                              {isParticipant ? 'Leave' : 'Join'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {showRecommendations && (
                  <div className="border-t border-gray-800 pt-6 mt-6">
                    <h2 className="text-xl md:text-2xl font-bold text-white mb-4">All Sessions</h2>
                  </div>
                )}
              </div>
            )}

            {/* All Sessions */}
            {sortedSessions.length === 0 ? (
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 md:p-12 text-center">
                <p className="text-gray-400 text-base md:text-lg">No upcoming sessions match your filters. Try adjusting them!</p>
              </div>
            ) : (
              <div className="grid gap-4 md:gap-6">
                {sortedSessions.map((session) => {
                  const isParticipant = session.participants?.includes(user.uid);
                  const participantCount = session.participants?.length || 0;
                  const isSelected = selectedSession?.id === session.id;
                  const hostProfile = profiles[session.host_user_id];
                  
                  return (
                    <div 
                      key={session.id} 
                      id={`session-${session.id}`}
                      className={`bg-gray-900 rounded-xl border p-4 md:p-8 hover:border-orange-500/50 transition cursor-pointer ${
                        isSelected ? 'border-orange-500' : 'border-gray-800'
                      }`}
                      onClick={() => router.push(`/session/${session.id}`)}
                    >
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4 flex-wrap">
                            <span className="text-3xl md:text-4xl">{getActivityEmoji(session.activity_type)}</span>
                            <h2 className="text-xl md:text-3xl font-bold text-white">{session.title}</h2>
                            <span className={`px-3 md:px-4 py-1 rounded-full text-xs md:text-sm font-semibold border ${getIntensityColor(session.intensity)}`}>
                              {session.intensity}
                            </span>
                            {session.isPrivate && (
                              <span className="px-3 md:px-4 py-1 rounded-full text-xs md:text-sm font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                🔒 Private
                              </span>
                            )}
                            {/* Badge Girls Only */}
                            {session.girlsOnly && (
                              <span className="px-3 md:px-4 py-1 rounded-full text-xs md:text-sm font-semibold bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/50 text-pink-400">
                                👭 Girls Only
                              </span>
                            )}
                          </div>
                          
                          <p className="text-gray-400 mb-3 md:mb-4 text-sm md:text-lg">{session.description}</p>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 text-sm md:text-base text-gray-300 mb-3 md:mb-4">
                            <div>📅 <strong>Date:</strong> {session.date}</div>
                            <div>🕐 <strong>Time:</strong> {session.time}</div>
                            <div className="sm:col-span-2">📍 <strong>Location:</strong> {session.location}</div>
                            {session.distance && <div>📏 <strong>Distance:</strong> {session.distance}</div>}
                          </div>
                          
                          {/* Host Profile */}
                          <div 
                            className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4 hover:bg-gray-800 p-2 md:p-3 rounded-lg inline-flex transition"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/profile/${session.host_user_id}`);
                            }}
                          >
                            {hostProfile?.profileImage ? (
                              <img 
                                src={hostProfile.profileImage} 
                                alt={hostProfile.displayName}
                                className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-orange-500"
                              />
                            ) : (
                              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-800 flex items-center justify-center text-lg md:text-xl border-2 border-orange-500">
                                👤
                              </div>
                            )}
                            <div>
                              <p className="text-xs md:text-sm font-semibold text-white">
                                Hosted by {hostProfile?.displayName || session.host_email}
                              </p>
                              {hostProfile?.fitnessLevel && (
                                <p className="text-xs text-gray-500 capitalize">{hostProfile.fitnessLevel}</p>
                              )}
                            </div>
                          </div>
                          
                          {/* Participants */}
                          <div className="mb-2">
                            <p className="text-xs md:text-sm font-semibold text-gray-300 mb-2 md:mb-3">
                              👥 {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
                              {session.max_participants && ` (max: ${session.max_participants})`}
                            </p>
                            {participantCount > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {session.participants?.slice(0, 5).map((participantId) => {
                                  const profile = profiles[participantId];
                                  return (
                                    <div
                                      key={participantId}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/profile/${participantId}`);
                                      }}
                                      className="cursor-pointer hover:scale-110 transition"
                                      title={profile?.displayName || 'User'}
                                    >
                                      {profile?.profileImage ? (
                                        <img 
                                          src={profile.profileImage} 
                                          alt={profile.displayName}
                                          className="rounded-full object-cover border-2 border-gray-700 hover:border-orange-500"
                                          style={{ width: '2rem', height: '2rem', minWidth: '2rem', minHeight: '2rem' }}
                                        />
                                      ) : (
                                        <div className="rounded-full bg-gray-800 flex items-center justify-center text-xs md:text-sm border-2 border-gray-700 hover:border-orange-500"
                                             style={{ width: '2rem', height: '2rem', minWidth: '2rem', minHeight: '2rem' }}>
                                          👤
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                {participantCount > 5 && (
                                  <div className="rounded-full bg-gray-800 flex items-center justify-center text-xs font-semibold text-gray-400 border-2 border-gray-700"
                                       style={{ width: '2rem', height: '2rem', minWidth: '2rem', minHeight: '2rem' }}>
                                    +{participantCount - 5}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Join/Leave Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJoinSession(session.id, session.participants || []);
                          }}
                          disabled={!isParticipant && session.max_participants && participantCount >= session.max_participants}
                          className={`w-full md:w-auto md:ml-6 px-6 md:px-8 py-3 rounded-lg font-semibold transition ${
                            isParticipant
                              ? 'bg-red-500 text-white hover:bg-red-600'
                              : 'bg-green-500 text-white hover:bg-green-600 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed'
                          }`}
                        >
                          {isParticipant ? 'Leave' : 'Join'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
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