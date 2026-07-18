'use client';
import { useState, useEffect, useRef } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Navigation from '../components/navigation';
import { Bell, User } from 'lucide-react';
import { collection, query, where, getDocs, onSnapshot, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';

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

    const unsubs = [];
    let cancelled = false;

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
          const unsub = onSnapshot(commentsRef, async (commentsSnapshot) => {
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

            if (cancelled) return;
            setNotifications(prev => {
              const filtered = prev.filter(n => n.sessionId !== sessionDoc.id);
              return [...filtered, ...newNotifications].sort((a, b) => {
                if (!a.timestamp || !b.timestamp) return 0;
                return b.timestamp.toMillis() - a.timestamp.toMillis();
              });
            });
          });
          unsubs.push(unsub);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchAllNotifications();
    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
    };
  }, [user]);
  // Mark visible unread notifications as read immediately. Guarded by a ref
  // so each comment is marked once; in-flight writes finish even if the user
  // navigates away (the old 1s timer was cancelled on every re-render, so
  // quick visits never cleared the badge).
  const markedRef = useRef(new Set());
  useEffect(() => {
    if (!user) return;
    const unread = notifications.filter(
      (n) => !n.isRead && !markedRef.current.has(n.id)
    );
    if (unread.length === 0) return;
    unread.forEach((n) => markedRef.current.add(n.id));

    (async () => {
      for (const n of unread) {
        try {
          await updateDoc(doc(db, 'sessions', n.sessionId, 'comments', n.id), {
            readBy: arrayUnion(user.uid),
          });
        } catch (error) {
          console.error('Error marking notification as read:', error);
          markedRef.current.delete(n.id);
        }
      }
    })();
  }, [user, notifications]);

  

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
    return <div className="min-h-screen flex items-center justify-center bg-ground text-ink">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-ground">
      <Navigation user={user} />
      
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="mb-6 md:mb-8">
          <h1 className="font-display uppercase text-4xl md:text-5xl text-ink mb-1.5">Notifications</h1>
          <p className="text-muted text-base md:text-lg">Stay updated with your sessions</p>
        </div>

        {notifications.length === 0 ? (
          <div className="bg-card rounded-xl border border-line p-8 md:p-12 text-center">
            <Bell size={44} className="text-muted mx-auto mb-4" />
            <p className="text-muted text-base md:text-lg">No notifications</p>
            <p className="text-muted text-sm mt-2">Messages from the last 2 weeks will appear here</p>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => router.push(`/session/${notification.sessionId}`)}
                className={`bg-card rounded-xl border p-4 md:p-6 hover:border-brand/50 transition cursor-pointer ${
                  notification.isRead ? 'border-line opacity-60' : 'border-brand/30'
                }`}
              >
                <div className="flex items-start gap-3 md:gap-4">
                  {notification.senderImage ? (
                    <img 
                      src={notification.senderImage} 
                      alt={notification.senderName}
                      className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-brand flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-card2 flex items-center justify-center border-2 border-brand flex-shrink-0">
                      <User size={18} className="text-muted" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-ink font-semibold text-sm md:text-base flex items-center gap-2">
                        {notification.senderName}
                        {!notification.isRead && (
                          <span className="w-2 h-2 bg-brand rounded-full"></span>
                        )}
                      </p>
                      <span className="text-xs text-muted whitespace-nowrap">
                        {formatTime(notification.timestamp)}
                      </span>
                    </div>
                    
                    <p className="text-muted text-xs md:text-sm mb-2">
                      New message in <span className="text-brand font-semibold">{notification.sessionTitle}</span>
                    </p>
                    
                    <p className="text-soft text-sm md:text-base break-words">
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