'use client';
import { useState, useEffect, use } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Navigation from '../../components/navigation';
import ActivityIcon from '../../components/ActivityIcon';
import { MapPin, Users, User, BadgeCheck, Star, Calendar, Clock } from 'lucide-react';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-ground">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-4">
          <div className="skeleton h-64 rounded-2xl" />
          <div className="skeleton h-48 rounded-2xl" />
        </div>
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
    <div className="min-h-screen bg-ground">
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
        <div className="bg-card rounded-2xl border border-line p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <ActivityIcon type={club.activity_type} boxed size={24} boxClass="w-14 h-14" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-display uppercase text-3xl md:text-5xl text-ink">{club.name}</h1>
                    {club.isFeatured && (
                      <span className="px-3 py-1 bg-brand text-white rounded-full text-xs font-bold inline-flex items-center gap-1">
                        <BadgeCheck size={13} /> VERIFIED
                      </span>
                    )}
                  </div>
                  <p className="text-muted text-sm md:text-base mt-1">
                    {club.activity_type.charAt(0).toUpperCase() + club.activity_type.slice(1)} Club
                  </p>
                </div>
              </div>
              
              <div className="space-y-2 text-soft mb-4">
                <p className="flex items-center gap-1.5"><MapPin size={15} className="text-muted" /> {club.location}</p>
                <p className="flex items-center gap-1.5"><Users size={15} className="text-muted" /> {club.member_count || 1} members</p>
                <p className="text-sm text-muted">
                  Created {new Date(club.created_at?.toDate()).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Join/Leave Button */}
            <button
              onClick={handleJoinLeave}
              className={`w-full md:w-auto px-8 py-3 rounded-lg font-semibold transition ${
                isMember
                  ? 'bg-card2 text-soft border border-line hover:border-red-500/50 hover:text-red-400'
                  : 'bg-brand text-white hover:bg-brand-hover'
              }`}
            >
              {isMember ? 'Leave Club' : 'Join Club'}
            </button>
          </div>

          {/* About */}
          <div className="border-t border-line pt-6">
            <h2 className="font-display uppercase text-xl text-ink mb-3">About</h2>
            <p className="text-soft leading-relaxed">{club.description}</p>
          </div>
        </div>

        {/* Members */}
        <div className="bg-card rounded-2xl border border-line p-6 md:p-8 mb-6">
          <h2 className="font-display uppercase text-2xl text-ink mb-6 flex items-center gap-2">
            <Users size={20} className="text-brand" /> Members ({members.length})
          </h2>
          
          {members.length === 0 ? (
            <p className="text-muted text-center py-8">No members yet</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  onClick={() => router.push(`/profile/${member.id}`)}
                  className="bg-ground rounded-xl border border-line p-4 hover:border-brand/50 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    {member.profileImage ? (
                      <img 
                        src={member.profileImage} 
                        alt={member.displayName}
                        className="w-12 h-12 rounded-full object-cover border-2 border-brand"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-card2 flex items-center justify-center border-2 border-brand">
                        <User size={18} className="text-muted" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-ink font-semibold truncate">
                        {member.displayName || 'User'}
                        {member.id === club.founder_id && (
                          <span className="ml-2 text-xs text-brand inline-flex items-center gap-0.5"><Star size={10} /> Founder</span>
                        )}
                      </p>
                      {member.fitnessLevel && (
                        <p className="text-xs text-muted capitalize">{member.fitnessLevel}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Sessions */}
        <div className="bg-card rounded-2xl border border-line p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-display uppercase text-2xl text-ink flex items-center gap-2">
              <Calendar size={20} className="text-brand" /> Upcoming Sessions ({sessions.length})
            </h2>
            {(isFounder || isAdmin) && (
              <button
                onClick={() => router.push(`/create?clubId=${clubId}`)}
                className="bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-hover font-semibold transition text-sm"
              >
                + Create Session
              </button>
            )}
          </div>
          
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted mb-4">No upcoming sessions yet</p>
              {(isFounder || isAdmin) && (
                <button
                  onClick={() => router.push(`/create?clubId=${clubId}`)}
                  className="bg-brand text-white px-6 py-3 rounded-lg hover:bg-brand-hover font-semibold transition"
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
                  className="bg-ground rounded-xl border border-line p-4 hover:border-brand/50 transition cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <ActivityIcon type={session.activity_type} boxed size={17} boxClass="w-9 h-9" />
                    <div className="flex-1">
                      <h3 className="font-display uppercase text-lg text-ink mb-1">{session.title}</h3>
                      <div className="space-y-1 text-sm text-muted">
                        <p className="flex items-center gap-1.5"><Clock size={13} /> {session.date} • {session.time}</p>
                        <p className="flex items-center gap-1.5"><MapPin size={13} /> {session.location}</p>
                        <p className="flex items-center gap-1.5"><Users size={13} /> {session.participants?.length || 0} joined</p>
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