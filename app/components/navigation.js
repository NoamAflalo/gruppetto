'use client';
import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

function NotificationButton({ user, router }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        // Get last check time
        const userDataDoc = await getDoc(doc(db, 'user_data', user.uid));
        const lastCheck = userDataDoc.exists() ? userDataDoc.data().lastNotificationCheck?.toDate() : new Date(0);

        // Get all user sessions
        const allSessionsQuery = query(collection(db, 'sessions'));
        const sessionsSnapshot = await getDocs(allSessionsQuery);
        
        const userSessions = sessionsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(session => 
            session.host_user_id === user.uid || 
            session.participants?.includes(user.uid)
          );

        // Count unread comments
        let count = 0;
        for (const session of userSessions) {
          const commentsSnapshot = await getDocs(collection(db, 'sessions', session.id, 'comments'));
          
          commentsSnapshot.docs.forEach(doc => {
            const comment = doc.data();
            if (comment.user_id !== user.uid && comment.created_at?.toDate() > lastCheck) {
              count++;
            }
          });
        }

        setUnreadCount(count);
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 10000); // Check every 10 seconds
    
    return () => clearInterval(interval);
  }, [user]);

  return (
    <button
      onClick={() => router.push('/notifications')}
      className="text-gray-300 hover:text-orange-500 font-medium transition relative"
    >
      Notifications
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}

export default function Navigation({ user }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/');
  };

  const navItems = [
    { label: 'Browse Sessions', path: '/browse' },
    { label: 'How it Works', path: '/how-it-works' },
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Notifications', path: '/notifications' },
    { label: 'Create Session', path: '/create' },
    { label: 'Profile', path: '/profile' },
  ];

  return (
    <nav className="bg-black shadow-md border-b border-gray-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <h1 
            className="text-2xl md:text-3xl font-bold text-orange-500 cursor-pointer italic" 
            onClick={() => router.push('/browse')}
          >
            Gruppetto
          </h1>

          {/* Desktop Navigation */}
          {user && (
            <>
              <div className="hidden md:flex items-center space-x-6">
                {navItems.map((item) => {
                  if (item.path === '/notifications') {
                    return (
                      <NotificationButton key={item.path} user={user} router={router} />
                    );
                  }
                  return (
                    <button
                      key={item.path}
                      onClick={() => router.push(item.path)}
                      className="text-gray-300 hover:text-orange-500 font-medium transition"
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* Desktop User Menu */}
              <div className="hidden md:flex items-center space-x-4 relative">
                <span className="text-gray-400 text-sm">{user.email}</span>
                
                {/* User Dropdown Button */}
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 font-semibold transition flex items-center gap-2"
                >
                  ⚙️
                  <span className="text-sm">▼</span>
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <>
                    {/* Backdrop to close menu when clicking outside */}
                    <div 
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    
                    <div className="absolute right-0 top-12 bg-gray-900 border border-gray-800 rounded-xl shadow-xl py-2 w-48 z-20">
                      <button
                        onClick={() => {
                          router.push('/settings');
                          setUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-orange-500 transition flex items-center gap-2"
                      >
                        ⚙️ Settings
                      </button>
                      <div className="border-t border-gray-800 my-1"></div>
                      <button
                        onClick={() => {
                          handleSignOut();
                          setUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 text-red-400 hover:bg-gray-800 transition flex items-center gap-2"
                      >
                        🚪 Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Mobile Hamburger Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-white text-3xl focus:outline-none"
              >
                {mobileMenuOpen ? '✕' : '☰'}
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        {user && mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-3">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  router.push(item.path);
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left px-4 py-3 text-gray-300 hover:bg-gray-900 hover:text-orange-500 rounded-lg transition font-medium"
              >
                {item.label}
              </button>
            ))}
            
            <div className="border-t border-gray-800 pt-3 mt-3">
              <p className="px-4 py-2 text-gray-500 text-sm">{user.email}</p>
              
              <button
                onClick={() => {
                  router.push('/settings');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-4 py-3 text-gray-300 hover:bg-gray-900 hover:text-orange-500 rounded-lg transition font-medium"
              >
                ⚙️ Settings
              </button>
              
              <button
                onClick={() => {
                  handleSignOut();
                  setMobileMenuOpen(false);
                }}
                className="w-full mt-2 bg-orange-500 text-white px-4 py-3 rounded-lg hover:bg-orange-600 font-semibold transition"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}