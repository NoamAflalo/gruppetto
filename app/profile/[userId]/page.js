'use client';
import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter, useParams } from 'next/navigation';
import Navigation from '../../components/navigation';

export default function UserProfile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [userSessions, setUserSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showImageModal, setShowImageModal] = useState(false);
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
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;
      
      try {
        const profileDoc = await getDoc(doc(db, 'profiles', userId));
        if (profileDoc.exists()) {
          setProfile(profileDoc.data());
        }

        const sessionsQuery = query(
          collection(db, 'sessions'),
          where('host_user_id', '==', userId)
        );
        const sessionsSnapshot = await getDocs(sessionsQuery);
        const sessions = sessionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUserSessions(sessions);
        
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [userId]);

  const getActivityEmoji = (activity) => {
    switch(activity) {
      case 'running': return '🏃';
      case 'cycling': return '🚴';
      case 'swimming': return '🏊';
      default: return '💪';
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading...</div>;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black">
        <Navigation user={user} />
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-12 text-center">
            <p className="text-gray-400 text-lg">Profile not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation user={user} />
      
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Profile Header */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 mb-8">
          <div className="flex items-start gap-8">
            {/* Profile Image */}
            <div className="flex-shrink-0">
              {profile.profileImage ? (
                <>
                  <img 
                    src={profile.profileImage} 
                    alt={profile.displayName}
                    className="w-32 h-32 rounded-full object-cover border-4 border-orange-500 cursor-pointer hover:opacity-80 transition"
                    onClick={() => setShowImageModal(true)}
                  />

                  {/* Image Modal */}
                  {showImageModal && (
                    <div 
                      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                      onClick={() => setShowImageModal(false)}
                    >
                      <div className="relative max-w-4xl max-h-[90vh]">
                        <button
                          onClick={() => setShowImageModal(false)}
                          className="absolute top-4 right-4 text-white text-4xl hover:text-orange-500 transition"
                        >
                          ×
                        </button>
                        <img 
                          src={profile.profileImage} 
                          alt={profile.displayName}
                          className="max-w-full max-h-[90vh] object-contain rounded-xl"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-800 flex items-center justify-center text-5xl border-4 border-orange-500">
                  👤
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <h1 className="text-4xl font-black text-white mb-2">{profile.displayName}</h1>
              <p className="text-gray-400 mb-4">{profile.email}</p>
              
              {profile.bio && (
                <p className="text-gray-300 mb-6 text-lg leading-relaxed">{profile.bio}</p>
              )}

              {/* Strava Link */}
              {profile.stravaLink && (
                <a 
                  href={profile.stravaLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-orange-500/20 text-orange-500 rounded-lg hover:bg-orange-500/30 transition border border-orange-500/30"
                >
                  <span>🏃</span>
                  View on Strava
                </a>
              )}

              {/* Profile Details */}
              <div className="grid grid-cols-2 gap-4">
                {profile.fitnessLevel && (
                  <div className="bg-black rounded-xl p-4 border border-gray-800">
                    <p className="text-gray-500 text-sm mb-1">Fitness Level</p>
                    <p className="text-white font-semibold capitalize">{profile.fitnessLevel}</p>
                  </div>
                )}
                
                {profile.location && (
                  <div className="bg-black rounded-xl p-4 border border-gray-800">
                    <p className="text-gray-500 text-sm mb-1">Location</p>
                    <p className="text-white font-semibold">{profile.location}</p>
                  </div>
                )}
                
                {profile.preferredPace && (
                  <div className="bg-black rounded-xl p-4 border border-gray-800">
                    <p className="text-gray-500 text-sm mb-1">Preferred Pace</p>
                    <p className="text-white font-semibold">{profile.preferredPace}</p>
                  </div>
                )}
                
                {profile.activities && profile.activities.length > 0 && (
                  <div className="bg-black rounded-xl p-4 border border-gray-800">
                    <p className="text-gray-500 text-sm mb-2">Activities</p>
                    <div className="flex gap-2">
                      {profile.activities.map((activity) => (
                        <span key={activity} className="text-2xl" title={activity}>
                          {getActivityEmoji(activity)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* User's Hosted Sessions */}
        <div>
          <h2 className="text-3xl font-black text-white mb-6">
            Hosted Sessions ({userSessions.length})
          </h2>
          
          {userSessions.length === 0 ? (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
              <p className="text-gray-400">No sessions hosted yet</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {userSessions.map((session) => (
                <div 
                  key={session.id}
                  className="bg-gray-900 rounded-xl border border-gray-800 p-6 hover:border-orange-500/50 transition cursor-pointer"
                  onClick={() => router.push(`/session/${session.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl">{getActivityEmoji(session.activity_type)}</span>
                        <h3 className="text-2xl font-bold text-white">{session.title}</h3>
                      </div>
                      <p className="text-gray-400 mb-3">{session.description}</p>
                      <div className="flex gap-6 text-sm text-gray-400">
                        <span>📅 {session.date}</span>
                        <span>🕐 {session.time}</span>
                        <span>📍 {session.location}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-sm">Participants</p>
                      <p className="text-3xl font-bold text-orange-500">
                        {session.participants?.length || 0}
                      </p>
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