'use client';
import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Navigation from '../components/navigation';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState('participating'); // 'participating' or 'hosting'
  const [timeFilter, setTimeFilter] = useState('upcoming'); // 'upcoming', 'past', 'all'
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

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
        if (profileDoc.exists()) {
          setUserProfile(profileDoc.data());
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };
    
    fetchUserProfile();
  }, [user]);

  // Fetch sessions
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'sessions'),
      orderBy('created_at', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const sessionsData = [];
      const userIds = new Set();
      
      snapshot.forEach((doc) => {
        const session = { id: doc.id, ...doc.data() };
        
        // Filter: only sessions where user is participant OR host
        if (
          session.participants?.includes(user.uid) || 
          session.host_user_id === user.uid
        ) {
          sessionsData.push(session);
          
          if (session.host_user_id) userIds.add(session.host_user_id);
          if (session.participants) {
            session.participants.forEach(id => userIds.add(id));
          }
        }
      });
      
      setSessions(sessionsData);
      
      // Fetch profiles
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

  // Filter sessions based on view and time
  const filteredSessions = sessions.filter(session => {
    const now = new Date();
    const sessionDateTime = new Date(`${session.date}T${session.time}`);
    
    // View filter: Participating vs Hosting
    if (viewFilter === 'participating') {
      if (!session.participants?.includes(user.uid)) return false;
    } else if (viewFilter === 'hosting') {
      if (session.host_user_id !== user.uid) return false;
    }
    
    // Time filter: Upcoming vs Past vs All
    if (timeFilter === 'upcoming') {
      return sessionDateTime >= now;
    } else if (timeFilter === 'past') {
      return sessionDateTime < now;
    }
    // 'all' = no time filter
    return true;
  });

  // Sort by date (soonest first for upcoming, most recent first for past)
  const sortedSessions = [...filteredSessions].sort((a, b) => {
    const dateA = new Date(a.date + ' ' + a.time);
    const dateB = new Date(b.date + ' ' + b.time);
    
    if (timeFilter === 'past') {
      return dateB - dateA; // Most recent past first
    }
    return dateA - dateB; // Soonest upcoming first
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation user={user} />
      
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">My Dashboard</h1>
          <p className="text-gray-400 text-base md:text-lg">
            Welcome back, {userProfile?.displayName || user?.email}!
          </p>
        </div>

        {/* View Filter: Participating vs Hosting */}
        <div className="flex gap-2 mb-4 md:mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setViewFilter('participating')}
            className={`px-4 md:px-6 py-2 rounded-lg font-semibold transition whitespace-nowrap flex-shrink-0 ${
              viewFilter === 'participating' 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800'
            }`}
          >
            👥 My Sessions
          </button>
          <button
            onClick={() => setViewFilter('hosting')}
            className={`px-4 md:px-6 py-2 rounded-lg font-semibold transition whitespace-nowrap flex-shrink-0 ${
              viewFilter === 'hosting' 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800'
            }`}
          >
            🎤 Hosting
          </button>
        </div>

        {/* Time Filter: Upcoming vs Past vs All */}
        <div className="flex gap-2 mb-6 md:mb-8 overflow-x-auto pb-2">
          <button
            onClick={() => setTimeFilter('upcoming')}
            className={`px-4 md:px-6 py-2 rounded-lg font-semibold transition whitespace-nowrap flex-shrink-0 ${
              timeFilter === 'upcoming' 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800'
            }`}
          >
            📅 Upcoming
          </button>
          <button
            onClick={() => setTimeFilter('past')}
            className={`px-4 md:px-6 py-2 rounded-lg font-semibold transition whitespace-nowrap flex-shrink-0 ${
              timeFilter === 'past' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800'
            }`}
          >
            📜 Past
          </button>
          <button
            onClick={() => setTimeFilter('all')}
            className={`px-4 md:px-6 py-2 rounded-lg font-semibold transition whitespace-nowrap flex-shrink-0 ${
              timeFilter === 'all' 
                ? 'bg-purple-500 text-white' 
                : 'bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800'
            }`}
          >
            🗂️ All
          </button>
        </div>

        {/* Sessions List */}
        {sortedSessions.length === 0 ? (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 md:p-12 text-center">
            <p className="text-gray-400 text-base md:text-lg mb-4">
              {viewFilter === 'participating' 
                ? "You haven't joined any sessions yet." 
                : "You haven't hosted any sessions yet."}
            </p>
            <button
              onClick={() => router.push(viewFilter === 'participating' ? '/browse' : '/create')}
              className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-semibold transition"
            >
              {viewFilter === 'participating' ? 'Browse Sessions' : 'Create Session'}
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:gap-6">
            {sortedSessions.map((session) => {
              const isHost = session.host_user_id === user.uid;
              const participantCount = session.participants?.length || 0;
              const hostProfile = profiles[session.host_user_id];
              const isPast = new Date(`${session.date}T${session.time}`) < new Date();
              
              return (
                <div 
                  key={session.id}
                  className={`bg-gray-900 rounded-xl border p-4 md:p-8 hover:border-orange-500/50 transition cursor-pointer ${
                    isPast ? 'opacity-60' : ''
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
                        {isHost && (
                          <span className="px-3 md:px-4 py-1 rounded-full text-xs md:text-sm font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                            🎤 Host
                          </span>
                        )}
                        {isPast && (
                          <span className="px-3 md:px-4 py-1 rounded-full text-xs md:text-sm font-semibold bg-gray-500/20 text-gray-400 border border-gray-500/30">
                            ⏱️ Past
                          </span>
                        )}
                        {session.isPrivate && (
                          <span className="px-3 md:px-4 py-1 rounded-full text-xs md:text-sm font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                            🔒 Private
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
                      {!isHost && (
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
                      )}
                      
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
                    
                    {/* View Details Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/session/${session.id}`);
                      }}
                      className="w-full md:w-auto md:ml-6 px-6 md:px-8 py-3 rounded-lg font-semibold transition bg-orange-500 text-white hover:bg-orange-600"
                    >
                      View Details
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