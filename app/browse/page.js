'use client';
import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, getDoc, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Navigation from '../components/navigation';
import SessionMap from '../components/map';
import Toast from '../components/Toast';
import DatePickerCalendar from '../components/DatePickerCalendar';
import { authedFetch } from '@/lib/api';
import { getPools } from '@/lib/londonLocations';
import { ViewModeToggle, ActivityFilterBar } from './components/FilterBars';
import AdvancedFiltersPanel from './components/AdvancedFiltersPanel';
import { SessionCard, RecommendedSessionCard } from './components/SessionCard';
import CalendarView from './components/CalendarView';
import ClubsView from './components/ClubsView';

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

  // Fetch clubs on mount
  useEffect(() => {
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
          await authedFetch('/api/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'session_joined',
              to: sessionData.host_email,
              data: {
                sessionId: sessionId,
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
        <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />

        {/* Filter Buttons - Only show for sessions views */}
        {viewMode !== 'clubs' && (
          <ActivityFilterBar filter={filter} setFilter={setFilter} />
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
          <AdvancedFiltersPanel
            viewMode={viewMode}
            filter={filter}
            advancedFilters={advancedFilters}
            setAdvancedFilters={setAdvancedFilters}
            isUserFemale={isUserFemale}
          />
        )}

        {/* CLUBS VIEW */}
        {viewMode === 'clubs' && (
          <ClubsView clubs={clubs} loading={loadingClubs} />
        )}

        {/* CALENDAR VIEW */}
        {viewMode === 'calendar' && (
          <CalendarView
            sessions={filteredSessions}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            selectedDay={selectedDay}
            setSelectedDay={setSelectedDay}
            userId={user?.uid}
          />
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
                    {recommendedSessions.map((session) => (
                      <RecommendedSessionCard
                        key={session.id}
                        session={session}
                        userId={user.uid}
                        onJoin={handleJoinSession}
                      />
                    ))}
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
                {sortedSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    profiles={profiles}
                    userId={user.uid}
                    isSelected={selectedSession?.id === session.id}
                    onJoin={handleJoinSession}
                  />
                ))}
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
    </div>
  );
}
