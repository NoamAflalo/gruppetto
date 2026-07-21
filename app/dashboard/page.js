'use client';
import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, getDoc, doc, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Navigation from '../components/navigation';
import ActivityIcon from '../components/ActivityIcon';
import { getIntensityColor } from '@/lib/sessionUi';
import { Users, Mic, Landmark, CalendarDays, History, LayoutGrid, Calendar, Clock, MapPin, Ruler, User, Lock, BadgeCheck, Star, Repeat } from 'lucide-react';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState('participating'); // 'participating', 'hosting', or 'clubs'
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

    // Hosts are always in participants, so one targeted query covers both
    const q = query(
      collection(db, 'sessions'),
      where('participants', 'array-contains', user.uid)
    );

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

      // Fetch unknown profiles in parallel
      const idsToFetch = [...userIds].filter((id) => !profiles[id]);
      const fetched = await Promise.all(
        idsToFetch.map(async (id) => {
          const profileDoc = await getDoc(doc(db, 'profiles', id));
          return profileDoc.exists() ? [id, profileDoc.data()] : null;
        })
      );
      setProfiles(prev => ({ ...prev, ...Object.fromEntries(fetched.filter(Boolean)) }));
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch clubs
  useEffect(() => {
    const fetchClubs = async () => {
      if (!user) return;

      try {
        // Fetch all approved clubs
        const clubsQuery = query(
          collection(db, 'clubs'),
          where('status', '==', 'approved')
        );
        const snapshot = await getDocs(clubsQuery);
        
        // Filter clubs where user is a member
        const clubsData = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(club => club.members?.includes(user.uid));
        
        setClubs(clubsData);
      } catch (error) {
        console.error('Error fetching clubs:', error);
      }
    };

    fetchClubs();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-ground">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-4">
          <div className="skeleton h-10 w-64" />
          <div className="skeleton h-10 w-96 max-w-full" />
          <div className="skeleton h-40 rounded-2xl" />
          <div className="skeleton h-40 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ground">
      <Navigation user={user} />
      
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="font-display uppercase text-4xl md:text-5xl text-ink mb-1.5">My Dashboard</h1>
          <p className="text-muted text-base md:text-lg">
            Welcome back, {userProfile?.displayName || user?.email}!
          </p>
        </div>

        {/* View Filter: Participating vs Hosting vs Clubs */}
        <div className="flex gap-2 mb-4 md:mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setViewFilter('participating')}
            className={`px-4 md:px-6 py-2 rounded-lg font-semibold transition whitespace-nowrap flex-shrink-0 ${
              viewFilter === 'participating'
                ? 'bg-brand text-white'
                : 'bg-card text-soft hover:bg-card2 border border-line'
            } inline-flex items-center gap-2`}
          >
            <Users size={15} /> My Sessions
          </button>
          <button
            onClick={() => setViewFilter('hosting')}
            className={`px-4 md:px-6 py-2 rounded-lg font-semibold transition whitespace-nowrap flex-shrink-0 ${
              viewFilter === 'hosting'
                ? 'bg-brand text-white'
                : 'bg-card text-soft hover:bg-card2 border border-line'
            } inline-flex items-center gap-2`}
          >
            <Mic size={15} /> Hosting
          </button>
          <button
            onClick={() => setViewFilter('clubs')}
            className={`px-4 md:px-6 py-2 rounded-lg font-semibold transition whitespace-nowrap flex-shrink-0 ${
              viewFilter === 'clubs'
                ? 'bg-brand text-white'
                : 'bg-card text-soft hover:bg-card2 border border-line'
            } inline-flex items-center gap-2`}
          >
            <Landmark size={15} /> My Clubs
          </button>
        </div>

        {/* Time Filter: Only show for sessions, not clubs */}
        {viewFilter !== 'clubs' && (
          <div className="flex gap-2 mb-6 md:mb-8 overflow-x-auto pb-2">
            <button
              onClick={() => setTimeFilter('upcoming')}
              className={`px-4 md:px-6 py-2 rounded-lg font-semibold transition whitespace-nowrap flex-shrink-0 ${
                timeFilter === 'upcoming'
                  ? 'bg-brand text-white'
                  : 'bg-card text-soft hover:bg-card2 border border-line'
              } inline-flex items-center gap-2`}
            >
              <CalendarDays size={15} /> Upcoming
            </button>
            <button
              onClick={() => setTimeFilter('past')}
              className={`px-4 md:px-6 py-2 rounded-lg font-semibold transition whitespace-nowrap flex-shrink-0 ${
                timeFilter === 'past'
                  ? 'bg-brand text-white'
                  : 'bg-card text-soft hover:bg-card2 border border-line'
              } inline-flex items-center gap-2`}
            >
              <History size={15} /> Past
            </button>
            <button
              onClick={() => setTimeFilter('all')}
              className={`px-4 md:px-6 py-2 rounded-lg font-semibold transition whitespace-nowrap flex-shrink-0 ${
                timeFilter === 'all'
                  ? 'bg-brand text-white'
                  : 'bg-card text-soft hover:bg-card2 border border-line'
              } inline-flex items-center gap-2`}
            >
              <LayoutGrid size={15} /> All
            </button>
          </div>
        )}

        {/* Clubs View */}
        {viewFilter === 'clubs' && (
          <div>
            {clubs.length === 0 ? (
              <div className="bg-card rounded-xl border border-line p-8 md:p-12 text-center">
                <p className="text-muted text-base md:text-lg mb-4">
                  You haven't joined any clubs yet.
                </p>
                <button
                  onClick={() => router.push('/browse?view=clubs')}
                  className="bg-brand text-white px-6 py-3 rounded-lg hover:bg-brand-hover font-semibold transition"
                >
                  Browse Clubs
                </button>
              </div>
            ) : (
              <div className="grid gap-6">
                {clubs.map((club) => {
                  const isFounder = club.founder_id === user.uid;
                  
                  return (
                    <div
                      key={club.id}
                      onClick={() => router.push(`/club/${club.id}`)}
                      className="bg-card rounded-xl border border-line p-6 hover:border-brand/50 transition cursor-pointer"
                    >
                      <div className="flex flex-col lg:flex-row gap-6">
                        {club.coverImage && (
                          <img 
                            src={club.coverImage} 
                            alt={club.name}
                            className="w-full lg:w-48 h-32 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="font-display uppercase text-2xl text-ink">{club.name}</h3>
                            {club.isFeatured && (
                              <span className="px-2 py-0.5 bg-brand text-white rounded-full text-[11px] font-bold inline-flex items-center gap-1">
                                <BadgeCheck size={12} /> VERIFIED
                              </span>
                            )}
                            {isFounder && (
                              <span className="px-2 py-0.5 bg-card2 text-soft border border-line rounded-full text-[11px] font-bold inline-flex items-center gap-1">
                                <Star size={11} /> Founder
                              </span>
                            )}
                          </div>
                          <div className="space-y-1 text-sm mb-4">
                            <p className="text-soft inline-flex items-center gap-1.5 capitalize">
                              <ActivityIcon type={club.activity_type} size={14} className="text-muted" /> {club.activity_type}
                            </p>
                            <p className="text-soft flex items-center gap-1.5"><MapPin size={14} className="text-muted" /> {club.location}</p>
                            <p className="text-soft flex items-center gap-1.5"><Users size={14} className="text-muted" /> {club.member_count || 1} members</p>
                          </div>
                          <p className="text-muted mb-4 line-clamp-2">{club.description}</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/club/${club.id}`);
                            }}
                            className="bg-brand text-white px-6 py-2 rounded-lg hover:bg-brand-hover font-semibold transition"
                          >
                            View Club
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Sessions List */}
        {viewFilter !== 'clubs' && (
          <>
            {sortedSessions.length === 0 ? (
              <div className="bg-card rounded-xl border border-line p-8 md:p-12 text-center">
                <p className="text-muted text-base md:text-lg mb-4">
                  {viewFilter === 'participating' 
                    ? "You haven't joined any sessions yet." 
                    : "You haven't hosted any sessions yet."}
                </p>
                <button
                  onClick={() => router.push(viewFilter === 'participating' ? '/browse' : '/create')}
                  className="bg-brand text-white px-6 py-3 rounded-lg hover:bg-brand-hover font-semibold transition"
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
                      className={`bg-card rounded-xl border p-4 md:p-8 hover:border-brand/50 transition cursor-pointer ${
                        isPast ? 'opacity-60' : ''
                      }`}
                      onClick={() => router.push(`/session/${session.id}`)}
                    >
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4 flex-wrap">
                            <ActivityIcon type={session.activity_type} boxed size={19} boxClass="w-10 h-10 md:w-11 md:h-11" />
                            <h2 className="font-display uppercase text-xl md:text-2xl text-ink leading-tight">{session.title}</h2>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border ${getIntensityColor(session.intensity)}`}>
                              {session.intensity}
                            </span>
                            {isHost && (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-brand/15 text-brand-soft border border-brand/30 inline-flex items-center gap-1">
                                <Mic size={11} /> Host
                              </span>
                            )}
                            {isPast && (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-card2 text-muted border border-line inline-flex items-center gap-1">
                                <History size={11} /> Past
                              </span>
                            )}
                            {session.isPrivate && (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-card2 text-soft border border-line inline-flex items-center gap-1">
                                <Lock size={11} /> Private
                              </span>
                            )}
                            {session.recurringSessionId && (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-brand/10 border border-brand/30 text-brand-soft inline-flex items-center gap-1">
                                <Repeat size={11} /> Weekly
                              </span>
                            )}
                          </div>
                          
                          <p className="text-muted mb-3 md:mb-4 text-sm md:text-lg">{session.description}</p>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 text-sm md:text-base text-soft mb-3 md:mb-4">
                            <div className="flex items-center gap-2"><Calendar size={15} className="text-muted flex-none" /> {session.date}</div>
                            <div className="flex items-center gap-2"><Clock size={15} className="text-muted flex-none" /> {session.time}</div>
                            <div className="sm:col-span-2 flex items-center gap-2"><MapPin size={15} className="text-muted flex-none" /> {session.location}</div>
                            {session.distance && <div className="flex items-center gap-2"><Ruler size={15} className="text-muted flex-none" /> {session.distance}</div>}
                          </div>
                          
                          {/* Host Profile */}
                          {!isHost && (
                            <div 
                              className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4 hover:bg-card2 p-2 md:p-3 rounded-lg inline-flex transition"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/profile/${session.host_user_id}`);
                              }}
                            >
                              {hostProfile?.profileImage ? (
                                <img 
                                  src={hostProfile.profileImage} 
                                  alt={hostProfile.displayName}
                                  className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-brand"
                                />
                              ) : (
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-card2 flex items-center justify-center border-2 border-brand">
                                  <User size={18} className="text-muted" />
                                </div>
                              )}
                              <div>
                                <p className="text-xs md:text-sm font-semibold text-ink">
                                  Hosted by {hostProfile?.displayName || session.host_email}
                                </p>
                                {hostProfile?.fitnessLevel && (
                                  <p className="text-xs text-muted capitalize">{hostProfile.fitnessLevel}</p>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Participants */}
                          <div className="mb-2">
                            <p className="text-xs md:text-sm font-semibold text-soft mb-2 md:mb-3 inline-flex items-center gap-1.5">
                              <Users size={14} className="text-muted" /> {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
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
                                          className="rounded-full object-cover border-2 border-line hover:border-brand"
                                          style={{ width: '2rem', height: '2rem', minWidth: '2rem', minHeight: '2rem' }}
                                        />
                                      ) : (
                                        <div className="rounded-full bg-card2 flex items-center justify-center border-2 border-line hover:border-brand"
                                             style={{ width: '2rem', height: '2rem', minWidth: '2rem', minHeight: '2rem' }}>
                                          <User size={13} className="text-muted" />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                {participantCount > 5 && (
                                  <div className="rounded-full bg-card2 flex items-center justify-center text-xs font-semibold text-muted border-2 border-line"
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
                          className="w-full md:w-auto md:ml-6 px-6 md:px-8 py-3 rounded-lg font-semibold transition bg-brand text-white hover:bg-brand-hover"
                        >
                          View Details
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
    </div>
  );
}