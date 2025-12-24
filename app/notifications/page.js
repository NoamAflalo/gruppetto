'use client';
import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, onSnapshot, orderBy, doc, setDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Navigation from '../components/navigation';

export default function Notifications() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
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

    const fetchNotifications = async () => {
      try {
        // Get all sessions where user is participant or host
        const allSessionsQuery = query(collection(db, 'sessions'));
        const sessionsSnapshot = await getDocs(allSessionsQuery);
        
        const userSessions = sessionsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(session => 
            session.host_user_id === user.uid || 
            session.participants?.includes(user.uid)
          );

        // For each session, listen to comments
        const allNotifications = [];
        
        for (const session of userSessions) {
          const commentsQuery = query(
            collection(db, 'sessions', session.id, 'comments'),
            orderBy('created_at', 'desc')
          );
          
          const commentsSnapshot = await getDocs(commentsQuery);
          
          commentsSnapshot.docs.forEach(doc => {
            const comment = doc.data();
            // Don't show your own messages
            if (comment.user_id !== user.uid) {
              allNotifications.push({
                id: doc.id,
                type: 'comment',
                sessionId: session.id,
                sessionTitle: session.title,
                ...comment
              });
            }
          });
        }

        // Sort by date
        allNotifications.sort((a, b) => {
          if (!a.created_at || !b.created_at) return 0;
          return b.created_at.seconds - a.created_at.seconds;
        });

        setNotifications(allNotifications);

        // Mark all notifications as read
        await setDoc(doc(db, 'user_data', user.uid), {
          lastNotificationCheck: new Date(),
        }, { merge: true });

      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    
    return () => clearInterval(interval);
  }, [user]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation user={user} />
      
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <h1 className="text-3xl md:text-4xl font-black text-white mb-6 md:mb-8">Notifications</h1>

        {notifications.length === 0 ? (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 md:p-12 text-center">
            <div className="text-4xl md:text-6xl mb-4">🔔</div>
            <p className="text-gray-400 text-base md:text-lg">No new notifications</p>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {notifications.map((notification) => (
              <div 
                key={notification.id}
                onClick={() => router.push(`/session/${notification.sessionId}`)}
                className="bg-gray-900 rounded-xl border border-gray-800 p-4 md:p-6 hover:border-orange-500/50 transition cursor-pointer"
              >
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="text-2xl md:text-3xl flex-shrink-0">💬</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                      <h3 className="text-base md:text-lg font-bold text-white truncate">{notification.sessionTitle}</h3>
                      <span className="text-xs text-gray-500 whitespace-nowrap">{formatTime(notification.created_at)}</span>
                    </div>
                    <p className="text-gray-400 mb-2 text-sm md:text-base">
                      <span className="font-semibold text-orange-500">{notification.user_email}</span> posted a message
                    </p>
                    <p className="text-sm md:text-base text-gray-300 bg-black p-3 rounded-lg border border-gray-800 break-words">
                      "{notification.text}"
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}