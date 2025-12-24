'use client';
import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Navigation from '../components/navigation';
import SessionMap from '../components/map';

export default function Sessions() {
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [selectedSession, setSelectedSession] = useState(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    dateFrom: '',
    dateTo: '',
    intensities: [],
    location: '',
  });
  const router = useRouter();

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

  const handleJoinSession = async (sessionId, currentParticipants) => {
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      const sessionDoc = await getDoc(sessionRef);
      const sessionData = sessionDoc.data();
      
      if (currentParticipants.includes(user.uid)) {
        await updateDoc(sessionRef, {
          participants: arrayRemove(user.uid)
        });
      } else {
        await updateDoc(sessionRef, {
          participants: arrayUnion(user.uid)
        });
        
        const currentProfile = profiles[user.uid] || {};
        
        try {
          await fetch('/api/send-email', {
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
    }
  };

  const filteredSessions = sessions.filter(session => {
    if (filter !== 'all' && session.activity_type !== filter) return false;
    if (advancedFilters.dateFrom && session.date < advancedFilters.dateFrom) return false;
    if (advancedFilters.dateTo && session.date > advancedFilters.dateTo) return false;
    if (advancedFilters.intensities.length > 0 && !advancedFilters.intensities.includes(session.intensity)) return false;
    if (advancedFilters.location && !session.location.toLowerCase().includes(advancedFilters.location.toLowerCase())) return false;
    return true;
  });

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
          <h1 className="text-3xl md:text-4xl font-black text-white">Training Sessions</h1>
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
            onClick={() => setViewMode('map')}
            className={`px-4 md:px-6 py-2 rounded-lg font-semibold transition whitespace-nowrap flex-shrink-0 ${
              viewMode === 'map' ? 'bg-orange-500 text-white' : 'bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800'
            }`}
          >
            🗺️ Map
          </button>
        </div>

        {/* Filter Buttons */}
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

        {/* Advanced Filters Toggle */}
        <div className="mb-6">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="text-orange-500 font-semibold hover:text-orange-400 transition flex items-center gap-2"
          >
            {showAdvancedFilters ? '▼' : '▶'} Advanced Filters
          </button>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 md:p-6 mb-6 md:mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {/* Date From */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">From Date</label>
                <input
                  type="date"
                  value={advancedFilters.dateFrom}
                  onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateFrom: e.target.value })}
                  className="w-full p-3 bg-black border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">To Date</label>
                <input
                  type="date"
                  value={advancedFilters.dateTo}
                  onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateTo: e.target.value })}
                  className="w-full p-3 bg-black border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Location</label>
                <input
                  type="text"
                  value={advancedFilters.location}
                  onChange={(e) => setAdvancedFilters({ ...advancedFilters, location: e.target.value })}
                  placeholder="Search location..."
                  className="w-full p-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Intensity */}
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

            {/* Clear Filters */}
            <div className="mt-4">
              <button
                onClick={() => setAdvancedFilters({ dateFrom: '', dateTo: '', intensities: [], location: '' })}
                className="text-sm text-gray-400 hover:text-orange-500 transition"
              >
                Clear all filters
              </button>
            </div>
          </div>
        )}

        {/* Map View */}
        {viewMode === 'map' && (
          <div className="mb-8 rounded-xl overflow-hidden border border-gray-800" style={{ height: '400px' }}>
            <SessionMap 
              sessions={filteredSessions} 
              onMarkerClick={handleMarkerClick}
            />
          </div>
        )}

        {/* Sessions List */}
        {filteredSessions.length === 0 ? (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 md:p-12 text-center">
            <p className="text-gray-400 text-base md:text-lg">No sessions match your filters. Try adjusting them!</p>
          </div>
        ) : (
          <div className="grid gap-4 md:gap-6">
            {filteredSessions.map((session) => {
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
      </div>
    </div>
  );
}