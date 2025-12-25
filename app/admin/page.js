'use client';
import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Navigation from '../components/navigation';

const ADMIN_EMAIL = 'noamaflalo@gmail.com'; // 👈 REMPLACE PAR TON EMAIL

export default function Admin() {
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        fetchSessions();
      } else {
        router.push('/');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // Protection : Seul l'admin peut accéder
  useEffect(() => {
    if (user && user.email !== ADMIN_EMAIL) {
      alert('Access denied - Admin only');
      router.push('/browse');
    }
  }, [user, router]);

  const fetchSessions = async () => {
    const snapshot = await getDocs(collection(db, 'sessions'));
    const sessionsData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setSessions(sessionsData);
  };

  const deleteSession = async (sessionId) => {
    if (!confirm('Delete this session?')) return;
    
    try {
      // Delete comments first
      const commentsSnapshot = await getDocs(collection(db, 'sessions', sessionId, 'comments'));
      for (const commentDoc of commentsSnapshot.docs) {
        await deleteDoc(commentDoc.ref);
      }
      
      // Delete session
      await deleteDoc(doc(db, 'sessions', sessionId));
      
      // Refresh list
      fetchSessions();
      alert('Session deleted!');
    } catch (error) {
      console.error('Error:', error);
      alert('Error deleting session');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading...</div>;
  }

  // Si pas admin, ne rien afficher (redirection en cours)
  if (user && user.email !== ADMIN_EMAIL) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation user={user} />
      
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-white mb-2">🔧 Admin Panel</h1>
          <p className="text-gray-400">Manage all sessions - Admin only</p>
        </div>

        {sessions.length === 0 ? (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
            <p className="text-gray-400">No sessions to manage</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <div key={session.id} className="bg-gray-900 rounded-xl border border-gray-800 p-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">{session.title}</h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-400">📅 {session.date} at {session.time}</p>
                    <p className="text-gray-400">📍 {session.location}</p>
                    <p className="text-gray-400">👥 {session.participants?.length || 0} participants</p>
                    <p className="text-gray-500">ID: {session.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => deleteSession(session.id)}
                  className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold transition w-full md:w-auto"
                >
                  🗑️ Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}