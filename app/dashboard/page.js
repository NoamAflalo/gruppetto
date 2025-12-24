'use client';
import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Navigation from '../components/navigation';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hostedSessions, setHostedSessions] = useState([]);
  const [joinedSessions, setJoinedSessions] = useState([]);
  const [filter, setFilter] = useState('upcoming'); // upcoming, past, all
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
    const fetchSessions = async () => {
      if (!user) return;

      try {
        const allSessionsQuery = query(collection(db, 'sessions'));
        const allSnapshot = await getDocs(allSessionsQuery);
        
        const hosted = [];
        const joined = [];
        
        allSnapshot.docs.forEach(doc => {
          const session = { id: doc.id, ...doc.data() };
          
          if (session.host_user_id === user.uid) {
            hosted.push(session);
          } else if (session.participants?.includes(user.uid)) {
            joined.push(session);
          }
        });
        
        hosted.sort((a, b) => {
          if (!a.created_at || !b.created_at) return 0;
          return b.created_at.seconds - a.created_at.seconds;
        });
        
        setHostedSessions(hosted);
        setJoinedSessions(joined);

      } catch (error) {
        console.error('Error fetching sessions:', error);
      }
    };

    fetchSessions();
  }, [user]);

  const isPastSession = (session) => {
    if (!session.date) return false;
    
    const [year, month, day] = session.date.split('-').map(Number);
    const sessionDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    sessionDate.setHours(0, 0, 0, 0);
    
    return sessionDate < today;
  };

  const filterSessions = (sessions) => {
    if (filter === 'upcoming') {
      return sessions.filter(s => !isPastSession(s));
    } else if (filter === 'past') {
      return sessions.filter(s => isPastSession(s));
    }
    return sessions;
  };

  const filteredHosted = filterSessions(hostedSessions);
  const filteredJoined = filterSessions(joinedSessions);

  const totalSessions = hostedSessions.length + joinedSessions.length;
  const upcomingSessions = hostedSessions.filter(s => !isPastSession(s)).length + 
                          joinedSessions.filter(s => !isPastSession(s)).length;
  const totalParticipants = hostedSessions.reduce((acc, s) => acc + (s.participants?.length || 0), 0);

  const getActivityEmoji = (type) => {
    switch(type) {
      case 'running': return '🏃';
      case 'cycling': return '🚴';
      case 'swimming': return '🏊';
      default: return '💪';
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation user={user} />
      
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <h1 className="text-3xl md:text-4xl font-black text-white mb-6 md:mb-8">My Dashboard</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8 md:mb-12">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 md:p-6">
            <div className="text-gray-400 text-xs md:text-sm mb-1 md:mb-2">Total Sessions</div>
            <div className="text-3xl md:text-4xl font-black text-orange-500">{totalSessions}</div>
          </div>
          
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 md:p-6">
            <div className="text-gray-400 text-xs md:text-sm mb-1 md:mb-2">Upcoming</div>
            <div className="text-3xl md:text-4xl font-black text-green-500">{upcomingSessions}</div>
          </div>
          
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 md:p-6">
            <div className="text-gray-400 text-xs md:text-sm mb-1 md:mb-2">Hosted</div>
            <div className="text-3xl md:text-4xl font-black text-blue-500">{hostedSessions.length}</div>
          </div>
          
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 md:p-6">
            <div className="text-gray-400 text-xs md:text-sm mb-1 md:mb-2">Total Participants</div>
            <div className="text-3xl md:text-4xl font-black text-purple-500">{totalParticipants}</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 md:mb-8 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 md:px-6 py-2 rounded-lg font-semibold transition whitespace-nowrap flex-shrink-0 ${
              filter === 'upcoming' ? 'bg-orange-500 text-white' : 'bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`px-4 md:px-6 py-2 rounded-lg font-semibold transition whitespace-nowrap flex-shrink-0 ${
              filter === 'past' ? 'bg-orange-500 text-white' : 'bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800'
            }`}
          >
            Past
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 md:px-6 py-2 rounded-lg font-semibold transition whitespace-nowrap flex-shrink-0 ${
              filter === 'all' ? 'bg-orange-500 text-white' : 'bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800'
            }`}
          >
            All
          </button>
        </div>

        {/* Hosted Sessions */}
        {filteredHosted.length > 0 && (
          <div className="mb-8 md:mb-12">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">Sessions I'm Hosting ({filteredHosted.length})</h2>
            <div className="grid gap-3 md:gap-4">
              {filteredHosted.map((session) => (
                <div 
                  key={session.id}
                  className="bg-gray-900 rounded-xl border border-gray-800 p-4 md:p-6 hover:border-orange-500/50 transition cursor-pointer"
                  onClick={() => router.push(`/session/${session.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 md:gap-3 mb-2 flex-wrap">
                        <span className="text-2xl md:text-3xl">{getActivityEmoji(session.activity_type)}</span>
                        <h3 className="text-lg md:text-2xl font-bold text-white">{session.title}</h3>
                        {isPastSession(session) && (
                          <span className="px-2 md:px-3 py-1 bg-gray-700 text-gray-400 rounded-full text-xs md:text-sm">Past</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 md:gap-6 text-xs md:text-sm text-gray-400">
                        <span>📅 {session.date}</span>
                        <span>🕐 {session.time}</span>
                        <span>📍 {session.location}</span>
                        <span>👥 {session.participants?.length || 0} participants</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Joined Sessions */}
        {filteredJoined.length > 0 && (
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">Sessions I Joined ({filteredJoined.length})</h2>
            <div className="grid gap-3 md:gap-4">
              {filteredJoined.map((session) => (
                <div 
                  key={session.id}
                  className="bg-gray-900 rounded-xl border border-gray-800 p-4 md:p-6 hover:border-orange-500/50 transition cursor-pointer"
                  onClick={() => router.push(`/session/${session.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 md:gap-3 mb-2 flex-wrap">
                        <span className="text-2xl md:text-3xl">{getActivityEmoji(session.activity_type)}</span>
                        <h3 className="text-lg md:text-2xl font-bold text-white">{session.title}</h3>
                        {isPastSession(session) && (
                          <span className="px-2 md:px-3 py-1 bg-gray-700 text-gray-400 rounded-full text-xs md:text-sm">Past</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 md:gap-6 text-xs md:text-sm text-gray-400">
                        <span>📅 {session.date}</span>
                        <span>🕐 {session.time}</span>
                        <span>📍 {session.location}</span>
                        <span>Host: {session.host_email}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredHosted.length === 0 && filteredJoined.length === 0 && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 md:p-12 text-center">
            <p className="text-gray-400 text-base md:text-lg mb-4">No {filter} sessions yet</p>
            <button
              onClick={() => router.push('/create')}
              className="px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition"
            >
              Create Your First Session
            </button>
          </div>
        )}
      </div>
    </div>
  );
}