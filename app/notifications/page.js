'use client';
import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Navigation from '../components/navigation';

export default function Notifications() {
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
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

  // Fetch ALL notifications from last 2 weeks (not just unread)
  useEffect(() => {
    if (!user) return;

    const fetchAllNotifications = async () => {
      try {
        const sessionsRef = collection(db, 'sessions');
        const q = query(sessionsRef, where('participants', 'array-contains', user.uid));
        const sessionsSnapshot = await getDocs(q);

        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        for (const sessionDoc of sessionsSnapshot.docs) {
          const sessionData = sessionDoc.data();
          
          const commentsRef = collection(db, 'sessions', sessionDoc.id, 'comments');
          const unsubscribe = onSnapshot(commentsRef, async (commentsSnapshot) => {
            const newNotifications = [];

            for (const commentDoc of commentsSnapshot.docs) {
              const comment = commentDoc.data();
              
              // Skip own comments
              if (!comment.userId || comment.userId === user.uid) {
                continue;
              }

              // Skip comments older than 2 weeks
              if (comment.timestamp && comment.timestamp.toDate() < twoWeeksAgo) {
                continue;
              }

              try {
                const senderProfile = await getDoc(doc(db, 'profiles', comment.userId));
                
                newNotifications.push({
                  id: commentDoc.id,
                  sessionId: sessionDoc.id,
                  sessionTitle: sessionData.title,
                  message: comment.message,
                  timestamp: comment.timestamp,
                  senderName: senderProfile.exists() ? senderProfile.data().displayName : 'Unknown',
                  senderImage: senderProfile.exists() ? senderProfile.data().profileImage : null,
                  isRead: comment.readBy && comment.readBy.includes(user.uid),
                });
              } catch (error) {
                console.error('Error fetching sender profile:', error);
                continue;
              }
            }

            setNotifications(prev => {
              const filtered = prev.filter(n => n.sessionId !== sessionDoc.id);
              return [...filtered, ...newNotifications].sort((a, b) => {
                if (!a.timestamp || !b.timestamp) return 0;
                return b.timestamp.toMillis() - a.timestamp.toMillis();
              });
            });
          });
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchAllNotifications();
  }, [user]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const messageTime = timestamp.toDate();
    const diffMs = now - messageTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return messageTime.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation user={user} />
      
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">Notifications</h1>
          <p className="text-gray-400 text-base md:text-lg">Stay updated with your sessions</p>
        </div>

        {notifications.length === 0 ? (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 md:p-12 text-center">
            <div className="text-5xl md:text-6xl mb-4">🔔</div>
            <p className="text-gray-400 text-base md:text-lg">No notifications</p>
            <p className="text-gray-500 text-sm mt-2">Messages from the last 2 weeks will appear here</p>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => router.push(`/session/${notification.sessionId}`)}
                className={`bg-gray-900 rounded-xl border p-4 md:p-6 hover:border-orange-500/50 transition cursor-pointer ${
                  notification.isRead ? 'border-gray-800 opacity-60' : 'border-orange-500/30'
                }`}
              >
                <div className="flex items-start gap-3 md:gap-4">
                  {notification.senderImage ? (
                    <img 
                      src={notification.senderImage} 
                      alt={notification.senderName}
                      className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-orange-500 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-800 flex items-center justify-center text-base md:text-lg border-2 border-orange-500 flex-shrink-0">
                      👤
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-white font-semibold text-sm md:text-base flex items-center gap-2">
                        {notification.senderName}
                        {!notification.isRead && (
                          <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                        )}
                      </p>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatTime(notification.timestamp)}
                      </span>
                    </div>
                    
                    <p className="text-gray-400 text-xs md:text-sm mb-2">
                      New message in <span className="text-orange-500 font-semibold">{notification.sessionTitle}</span>
                    </p>
                    
                    <p className="text-gray-300 text-sm md:text-base break-words">
                      "{notification.message}"
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