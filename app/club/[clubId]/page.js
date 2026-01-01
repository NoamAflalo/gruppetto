'use client';
import { useState, useEffect, use } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Navigation from '../../components/navigation';
import { toast } from 'react-hot-toast';

export default function ClubPage({ params }) {
  // Unwrap params promise
  const resolvedParams = use(params);
  const { clubId } = resolvedParams;

  const [user, setUser] = useState(null);
  const [club, setClub] = useState(null);
  const [members, setMembers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        router.push('/');
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Fetch club data
  useEffect(() => {
    const fetchClubData = async () => {
      if (!user || !clubId) return;

      try {
        // Fetch club
        const clubDoc = await getDoc(doc(db, 'clubs', clubId));
        
        if (!clubDoc.exists()) {
          toast.error('Club not found');
          router.push('/browse?view=clubs');
          return;
        }

        const clubData = { id: clubDoc.id, ...clubDoc.data() };
        setClub(clubData);

        // Fetch members profiles
        if (clubData.members && clubData.members.length > 0) {
          const membersData = await Promise.all(
            clubData.members.map(async (memberId) => {
              const profileDoc = await getDoc(doc(db, 'profiles', memberId));
              if (profileDoc.exists()) {
                return { id: memberId, ...profileDoc.data() };
              }
              return null;
            })
          );
          setMembers(membersData.filter(m => m !== null));
        }

        // Fetch club sessions (if any)
        const sessionsQuery = query(
          collection(db, 'sessions'),
          where('club_id', '==', clubId)
        );
        const sessionsSnapshot = await getDocs(sessionsQuery);
        const sessionsData = sessionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSessions(sessionsData);

      } catch (error) {
        console.error('Error fetching club:', error);
        toast.error('Error loading club');
      } finally {
        setLoading(false);
      }
    };

    fetchClubData();
  }, [user, clubId, router]);

  const handleJoinLeave = async () => {
    if (!user || !club) return;

    try {
      const clubRef = doc(db, 'clubs', clubId);
      const isMember = club.members?.includes(user.uid);

      if (isMember) {
        // Leave club
        await updateDoc(clubRef, {
          members: arrayRemove(user.uid),
          member_count: (club.member_count || 1) - 1,
        });
        
        setClub({
          ...club,
          members: club.members.filter(id => id !== user.uid),
          member_count: (club.member_count || 1) - 1,
        });
        
        setMembers(members.filter(m => m.id !== user.uid));
        toast.success('Left club');
      } else {
        // Join club
        await updateDoc(clubRef, {
          members: arrayUnion(user.uid),
          member_count: (club.member_count || 0) + 1,
        });
        
        setClub({
          ...club,
          members: [...(club.members || []), user.uid],
          member_count: (club.member_count || 0) + 1,
        });
        
        // Fetch new member profile
        const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
        if (profileDoc.exists()) {
          setMembers([...members, { id: user.uid, ...profileDoc.data() }]);
        }
        
        toast.success('Joined club!');
      }
    } catch (error) {
      console.error('Error joining/leaving club:', error);
      toast.error('Error updating membership');
    }
  };

  const getActivityEmoji = (type) => {
    switch(type) {
      case 'running': return '🏃';
      case 'cycling': return '🚴';
      case 'swimming': return '🏊';
      default: return '💪';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Loading...
      </div>
    );
  }

  if (!club) {
    return null;
  }

  const isMember = club.members?.includes(user?.uid);
  const isFounder = club.founder_id === user?.uid;
  const isAdmin = club.admins?.includes(user?.uid);

  return (
    <div className="min-h-screen bg-black">
      <Navigation user={user} />
      
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
        {/* Cover Image */}
        {club.coverImage && (
          <div className="mb-8 rounded-2xl overflow-hidden">
            <img 
              src={club.coverImage} 
              alt={club.name}
              className="w-full h-64 md:h-96 object-cover"
            />
          </div>
        )}

        {/* Club Header */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-4xl">{getActivityEmoji(club.activity_type)}</span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-3xl md:text-4xl font-black text-white">{club.name}</h1>
                    {club.isFeatured && (
                      <span className="px-3 py-1 bg-orange-500 text-white rounded-full text-xs font-bold">
                        ✓ VERIFIED
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm md:text-base mt-1">
                    {club.activity_type.charAt(0).toUpperCase() + club.activity_type.slice(1)} Club
                  </p>
                </div>
              </div>
              
              <div className="space-y-2 text-gray-300 mb-4">
                <p>📍 {club.location}</p>
                <p>👥 {club.member_count || 1} members</p>
                <p className="text-sm text-gray-500">
                  Created {new Date(club.created_at?.toDate()).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Join/Leave Button */}
            <button
              onClick={handleJoinLeave}
              className={`w-full md:w-auto px-8 py-3 rounded-lg font-semibold transition ${
                isMember
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-orange-500 text-white hover:bg-orange-600'
              }`}
            >
              {isMember ? 'Leave Club' : 'Join Club'}
            </button>
          </div>

          {/* About */}
          <div className="border-t border-gray-800 pt-6">
            <h2 className="text-xl font-bold text-white mb-3">About</h2>
            <p className="text-gray-300 leading-relaxed">{club.description}</p>
          </div>
        </div>

        {/* Members */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 md:p-8 mb-6">
          <h2 className="text-2xl font-bold text-white mb-6">
            Members ({members.length})
          </h2>
          
          {members.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No members yet</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  onClick={() => router.push(`/profile/${member.id}`)}
                  className="bg-black rounded-xl border border-gray-800 p-4 hover:border-orange-500/50 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    {member.profileImage ? (
                      <img 
                        src={member.profileImage} 
                        alt={member.displayName}
                        className="w-12 h-12 rounded-full object-cover border-2 border-orange-500"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-xl border-2 border-orange-500">
                        👤
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">
                        {member.displayName || 'User'}
                        {member.id === club.founder_id && (
                          <span className="ml-2 text-xs text-orange-500">★ Founder</span>
                        )}
                      </p>
                      {member.fitnessLevel && (
                        <p className="text-xs text-gray-500 capitalize">{member.fitnessLevel}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Sessions */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">
              Upcoming Sessions ({sessions.length})
            </h2>
            {(isFounder || isAdmin) && (
              <button
                onClick={() => router.push(`/create?clubId=${clubId}`)}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 font-semibold transition text-sm"
              >
                + Create Session
              </button>
            )}
          </div>
          
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">No upcoming sessions yet</p>
              {(isFounder || isAdmin) && (
                <button
                  onClick={() => router.push(`/create?clubId=${clubId}`)}
                  className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-semibold transition"
                >
                  Create First Session
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => router.push(`/session/${session.id}`)}
                  className="bg-black rounded-xl border border-gray-800 p-4 hover:border-orange-500/50 transition cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{getActivityEmoji(session.activity_type)}</span>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1">{session.title}</h3>
                      <div className="space-y-1 text-sm text-gray-400">
                        <p>📅 {session.date} • {session.time}</p>
                        <p>📍 {session.location}</p>
                        <p>👥 {session.participants?.length || 0} joined</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}