'use client';
import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, getDocs, deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Navigation from '../components/navigation';
import { toast } from 'react-hot-toast';

export default function Admin() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('clubs'); // 'sessions' or 'clubs'
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        
        // Fetch user profile to check role
        const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
        if (profileDoc.exists()) {
          const profile = profileDoc.data();
          setUserProfile(profile);
          
          // Check if admin
          if (profile.role !== 'admin') {
            toast.error('Access denied - Admin only');
            router.push('/browse');
            return;
          }
          
          // Fetch data
          fetchSessions();
          fetchClubs();
        } else {
          toast.error('Profile not found');
          router.push('/browse');
        }
      } else {
        router.push('/');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const fetchSessions = async () => {
    const snapshot = await getDocs(collection(db, 'sessions'));
    const sessionsData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setSessions(sessionsData);
  };

  const fetchClubs = async () => {
    const snapshot = await getDocs(collection(db, 'clubs'));
    const clubsData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setClubs(clubsData);
  };

  const deleteSession = async (sessionId) => {
    if (!confirm('Delete this session?')) return;
    
    try {
      const commentsSnapshot = await getDocs(collection(db, 'sessions', sessionId, 'comments'));
      for (const commentDoc of commentsSnapshot.docs) {
        await deleteDoc(commentDoc.ref);
      }
      
      await deleteDoc(doc(db, 'sessions', sessionId));
      fetchSessions();
      toast.success('Session deleted!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error deleting session');
    }
  };

  const approveClub = async (clubId) => {
    try {
      await updateDoc(doc(db, 'clubs', clubId), {
        status: 'approved',
        approved_at: new Date(),
      });
      fetchClubs();
      toast.success('Club approved!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error approving club');
    }
  };

  const rejectClub = async (clubId) => {
    if (!confirm('Reject this club? It will be hidden.')) return;
    
    try {
      await updateDoc(doc(db, 'clubs', clubId), {
        status: 'rejected',
        rejected_at: new Date(),
      });
      fetchClubs();
      toast.success('Club rejected');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error rejecting club');
    }
  };

  const toggleFeatured = async (clubId, currentFeatured) => {
    try {
      await updateDoc(doc(db, 'clubs', clubId), {
        isFeatured: !currentFeatured,
      });
      fetchClubs();
      toast.success(currentFeatured ? 'Removed from featured' : 'Marked as featured!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error updating club');
    }
  };

  const deleteClub = async (clubId) => {
    if (!confirm('Delete this club permanently?')) return;
    
    try {
      await deleteDoc(doc(db, 'clubs', clubId));
      fetchClubs();
      toast.success('Club deleted!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error deleting club');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-ground text-ink">Loading...</div>;
  }

  if (!userProfile || userProfile.role !== 'admin') {
    return null;
  }

  const pendingClubs = clubs.filter(c => c.status === 'pending');
  const approvedClubs = clubs.filter(c => c.status === 'approved');
  const rejectedClubs = clubs.filter(c => c.status === 'rejected');

  return (
    <div className="min-h-screen bg-ground">
      <Navigation user={user} />
      
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-ink mb-2">🔧 Admin Panel</h1>
          <p className="text-muted">Manage sessions and clubs</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab('clubs')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'clubs'
                ? 'bg-brand text-ink'
                : 'bg-card text-soft hover:bg-card2'
            }`}
          >
            👥 Clubs ({pendingClubs.length} pending)
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'sessions'
                ? 'bg-brand text-ink'
                : 'bg-card text-soft hover:bg-card2'
            }`}
          >
            📅 Sessions ({sessions.length})
          </button>
        </div>

        {/* CLUBS TAB */}
        {activeTab === 'clubs' && (
          <div className="space-y-8">
            {/* Pending Clubs */}
            {pendingClubs.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-ink mb-4">⏳ Pending Approval ({pendingClubs.length})</h2>
                <div className="space-y-4">
                  {pendingClubs.map((club) => (
                    <div key={club.id} className="bg-card rounded-xl border border-brand/50 p-6">
                      <div className="flex flex-col lg:flex-row gap-6">
                        {club.coverImage && (
                          <img 
                            src={club.coverImage} 
                            alt={club.name}
                            className="w-full lg:w-48 h-32 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-ink mb-2">{club.name}</h3>
                          <div className="space-y-1 text-sm mb-4">
                            <p className="text-muted">🏃 {club.activity_type}</p>
                            <p className="text-muted">📍 {club.location}</p>
                            <p className="text-muted">👤 Founder: {club.founder_email}</p>
                            <p className="text-soft mt-2">{club.description}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => approveClub(club.id)}
                              className="px-4 py-2 bg-green-500 text-ink rounded-lg hover:bg-green-600 font-semibold transition"
                            >
                              ✅ Approve
                            </button>
                            <button
                              onClick={() => rejectClub(club.id)}
                              className="px-4 py-2 bg-red-500 text-ink rounded-lg hover:bg-red-600 font-semibold transition"
                            >
                              ❌ Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Approved Clubs */}
            {approvedClubs.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-ink mb-4">✅ Approved Clubs ({approvedClubs.length})</h2>
                <div className="space-y-4">
                  {approvedClubs.map((club) => (
                    <div key={club.id} className="bg-card rounded-xl border border-line p-6">
                      <div className="flex flex-col lg:flex-row gap-6">
                        {club.coverImage && (
                          <img 
                            src={club.coverImage} 
                            alt={club.name}
                            className="w-full lg:w-48 h-32 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-bold text-ink">{club.name}</h3>
                            {club.isFeatured && (
                              <span className="px-2 py-1 bg-brand text-ink rounded text-xs font-bold">
                                ✨ FEATURED
                              </span>
                            )}
                          </div>
                          <div className="space-y-1 text-sm mb-4">
                            <p className="text-muted">🏃 {club.activity_type}</p>
                            <p className="text-muted">📍 {club.location}</p>
                            <p className="text-muted">👥 {club.member_count || 0} members</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => toggleFeatured(club.id, club.isFeatured)}
                              className={`px-4 py-2 rounded-lg font-semibold transition ${
                                club.isFeatured
                                  ? 'bg-card2 text-ink hover:bg-gray-600'
                                  : 'bg-brand text-ink hover:bg-brand-hover'
                              }`}
                            >
                              {club.isFeatured ? '⭐ Remove Featured' : '✨ Mark Featured'}
                            </button>
                            <button
                              onClick={() => deleteClub(club.id)}
                              className="px-4 py-2 bg-red-500 text-ink rounded-lg hover:bg-red-600 font-semibold transition"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rejected Clubs */}
            {rejectedClubs.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-ink mb-4">❌ Rejected Clubs ({rejectedClubs.length})</h2>
                <div className="space-y-4">
                  {rejectedClubs.map((club) => (
                    <div key={club.id} className="bg-card rounded-xl border border-line p-6 opacity-60">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-bold text-ink">{club.name}</h3>
                          <p className="text-muted text-sm">{club.location}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => approveClub(club.id)}
                            className="px-4 py-2 bg-green-500 text-ink rounded-lg hover:bg-green-600 font-semibold transition"
                          >
                            ✅ Approve
                          </button>
                          <button
                            onClick={() => deleteClub(club.id)}
                            className="px-4 py-2 bg-red-500 text-ink rounded-lg hover:bg-red-600 font-semibold transition"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {clubs.length === 0 && (
              <div className="bg-card rounded-xl border border-line p-12 text-center">
                <p className="text-muted">No clubs to manage</p>
              </div>
            )}
          </div>
        )}

        {/* SESSIONS TAB */}
        {activeTab === 'sessions' && (
          <div>
            <h2 className="text-2xl font-bold text-ink mb-4">All Sessions ({sessions.length})</h2>
            {sessions.length === 0 ? (
              <div className="bg-card rounded-xl border border-line p-12 text-center">
                <p className="text-muted">No sessions to manage</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div key={session.id} className="bg-card rounded-xl border border-line p-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-ink mb-2">{session.title}</h3>
                      <div className="space-y-1 text-sm">
                        <p className="text-muted">📅 {session.date} at {session.time}</p>
                        <p className="text-muted">📍 {session.location}</p>
                        <p className="text-muted">👥 {session.participants?.length || 0} participants</p>
                        <p className="text-muted">ID: {session.id}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteSession(session.id)}
                      className="px-6 py-3 bg-red-500 text-ink rounded-lg hover:bg-red-600 font-semibold transition w-full md:w-auto"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}