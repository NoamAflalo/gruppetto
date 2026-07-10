'use client';
import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter, useParams } from 'next/navigation';
import Navigation from '../../components/navigation';

export default function UserProfile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    sessionsJoined: 0,
    sessionsHosted: 0,
    memberSince: null,
  });
  const router = useRouter();
  const params = useParams();
  const userId = params.userId;

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
    const fetchProfile = async () => {
      if (!userId) return;

      try {
        const profileDoc = await getDoc(doc(db, 'profiles', userId));
        if (profileDoc.exists()) {
          setProfile({ id: userId, ...profileDoc.data() });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();
  }, [userId]);

  // Fetch user stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!userId) return;

      try {
        const sessionsRef = collection(db, 'sessions');
        const sessionsSnapshot = await getDocs(sessionsRef);

        let joined = 0;
        let hosted = 0;

        sessionsSnapshot.docs.forEach(docSnap => {
          const session = docSnap.data();
          if (session.host_user_id === userId) {
            hosted++;
          }
          if (session.participants?.includes(userId)) {
            joined++;
          }
        });

        // Get member since date
        const userDoc = await getDoc(doc(db, 'profiles', userId));
        const memberSince = userDoc.exists() && userDoc.data().updatedAt
          ? userDoc.data().updatedAt.toDate()
          : new Date();

        setStats({
          sessionsJoined: joined,
          sessionsHosted: hosted,
          memberSince: memberSince,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, [userId]);

  if (loading || !profile) {
    return <div className="min-h-screen flex items-center justify-center bg-ground text-ink">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-ground">
      <Navigation user={user} />
      
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-ink mb-2">{profile.displayName || 'User Profile'}</h1>
          {profile.location && (
            <p className="text-muted text-base md:text-lg">📍 {profile.location}</p>
          )}
        </div>

        {/* Stats Section */}
        <div className="bg-card rounded-2xl border border-line p-4 md:p-6 mb-6 md:mb-8">
          <h2 className="text-xl md:text-2xl font-bold text-ink mb-4">📊 Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-ground rounded-xl p-4 border border-line">
              <div className="text-2xl md:text-3xl font-black text-brand mb-1">
                {stats.sessionsJoined}
              </div>
              <div className="text-xs md:text-sm text-muted">Sessions Joined</div>
            </div>
            
            <div className="bg-ground rounded-xl p-4 border border-line">
              <div className="text-2xl md:text-3xl font-black text-green-500 mb-1">
                {stats.sessionsHosted}
              </div>
              <div className="text-xs md:text-sm text-muted">Sessions Hosted</div>
            </div>
            
            <div className="bg-ground rounded-xl p-4 border border-line col-span-2 md:col-span-1">
              <div className="text-2xl md:text-3xl font-black text-blue-500 mb-1">
                {stats.memberSince 
                  ? new Date(stats.memberSince).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
                  : '...'
                }
              </div>
              <div className="text-xs md:text-sm text-muted">Member Since</div>
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <div className="bg-card rounded-2xl border border-line p-4 md:p-8">
          {/* Profile Image */}
          {profile.profileImage && (
            <div className="flex justify-center mb-6 md:mb-8">
              <img 
                src={profile.profileImage} 
                alt={profile.displayName}
                className="rounded-full object-cover border-4 border-brand"
                style={{ width: '10rem', height: '10rem' }}
              />
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <div className="mb-6">
              <h3 className="text-lg md:text-xl font-bold text-ink mb-2">About</h3>
              <p className="text-soft text-sm md:text-base leading-relaxed">{profile.bio}</p>
            </div>
          )}

          {/* Training Goals */}
          {profile.goals && (
            <div className="mb-6">
              <h3 className="text-lg md:text-xl font-bold text-ink mb-2">🎯 Training Goals</h3>
              <p className="text-soft text-sm md:text-base leading-relaxed">{profile.goals}</p>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* NOUVEAU - Gender Display */}
            {profile.gender && (
              <div>
                <h3 className="text-sm font-semibold text-muted mb-2">Gender</h3>
                <p className="text-ink capitalize text-sm md:text-base">
                  {profile.gender === 'female' ? '👩 Female' : '👨 Male'}
                </p>
              </div>
            )}

            {profile.fitnessLevel && (
              <div>
                <h3 className="text-sm font-semibold text-muted mb-2">Fitness Level</h3>
                <p className="text-ink capitalize text-sm md:text-base">{profile.fitnessLevel}</p>
              </div>
            )}

            {profile.activities && profile.activities.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted mb-2">Activities</h3>
                <div className="flex gap-2 flex-wrap">
                  {profile.activities.map((activity) => (
                    <span key={activity} className="px-3 py-1 bg-brand/20 text-brand-soft rounded-full text-xs md:text-sm font-semibold capitalize">
                      {activity === 'running' && '🏃 '}
                      {activity === 'cycling' && '🚴 '}
                      {activity === 'swimming' && '🏊 '}
                      {activity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.preferredPace && (
              <div>
                <h3 className="text-sm font-semibold text-muted mb-2">Preferred Pace</h3>
                <p className="text-ink text-sm md:text-base">{profile.preferredPace}</p>
              </div>
            )}

            {profile.location && (
              <div>
                <h3 className="text-sm font-semibold text-muted mb-2">Location</h3>
                <p className="text-ink text-sm md:text-base">{profile.location}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}