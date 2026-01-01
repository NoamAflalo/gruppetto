'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';

export default function Navigation({ user }) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userProfile, setUserProfile] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
        if (profileDoc.exists()) {
          setUserProfile(profileDoc.data());
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    
    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Reset unread count when on notifications page
    if (pathname === '/notifications') {
      setUnreadCount(0);
      return;
    }

    const q = query(
      collection(db, 'sessions'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let totalUnread = 0;

      snapshot.docs.forEach((sessionDoc) => {
        const commentsRef = collection(db, 'sessions', sessionDoc.id, 'comments');
        
        onSnapshot(commentsRef, (commentsSnapshot) => {
          const unreadComments = commentsSnapshot.docs.filter(doc => {
            const comment = doc.data();
            return comment.userId && comment.userId !== user.uid && 
                   (!comment.readBy || !comment.readBy.includes(user.uid));
          });
          
          totalUnread += unreadComments.length;
          
          // Don't show count on notifications page
          if (pathname === '/notifications') {
            setUnreadCount(0);
          } else {
            setUnreadCount(totalUnread);
          }
        });
      });
    });

    return () => {
      unsubscribe();
    };
  }, [user, pathname]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navItems = [
    { label: 'How it Works', path: '/how-it-works' },
    { label: 'Browse Sessions', path: '/browse' },
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Notifications', path: '/notifications', badge: unreadCount },
    { label: 'Create Session', path: '/create' },
  ];

  return (
    <nav style={{ 
      background: '#000', 
      borderBottom: '1px solid #374151',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <div style={{ 
        maxWidth: '80rem', 
        margin: '0 auto', 
        padding: '1rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* Logo */}
        <button
          onClick={() => router.push('/browse')}
          style={{
            fontSize: '1.5rem',
            fontWeight: '900',
            color: '#f97316',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontStyle: 'italic'
          }}
        >
          Gruppetto
        </button>

        {/* Desktop Navigation */}
        <div style={{ 
          display: 'none', 
          gap: '1.5rem', 
          alignItems: 'center',
        }}
        className="desktop-nav"
        >
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              style={{
                color: '#d1d5db',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'color 0.2s',
                position: 'relative',
                padding: '0.5rem'
              }}
              onMouseEnter={(e) => e.target.style.color = '#f97316'}
              onMouseLeave={(e) => e.target.style.color = '#d1d5db'}
            >
              {item.label}
              {item.badge > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '0',
                  right: '-0.5rem',
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: '9999px',
                  padding: '0.125rem 0.375rem',
                  fontSize: '0.75rem',
                  fontWeight: 'bold'
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}

          {/* Desktop User Menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#1f2937'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {userProfile?.profileImage ? (
                <img 
                  src={userProfile.profileImage} 
                  alt={userProfile.displayName || 'Profile'}
                  style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    borderRadius: '9999px',
                    objectFit: 'cover',
                    border: '2px solid #f97316'
                  }}
                />
              ) : (
                <div style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '9999px',
                  background: '#1f2937',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.125rem',
                  border: '2px solid #f97316'
                }}>
                  👤
                </div>
              )}
              <span style={{ color: '#fff', fontWeight: '600', fontSize: '1rem' }}>
                {userProfile?.displayName || 'Profile'}
              </span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style={{ color: '#9ca3af' }}>
                <path d="M6 9L1 4h10z"/>
              </svg>
            </button>

            {showUserMenu && (
              <div style={{
                position: 'absolute',
                right: 0,
                marginTop: '0.5rem',
                width: '12rem',
                background: '#111827',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                zIndex: 50
              }}>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    router.push('/profile');
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.75rem 1rem',
                    color: '#fff',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#1f2937'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  👤 My Profile
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    router.push('/create-club');
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.75rem 1rem',
                    color: '#fff',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#1f2937'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  👥 Create Club
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    router.push('/settings');
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.75rem 1rem',
                    color: '#fff',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#1f2937'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  ⚙️ Settings
                </button>
                <div style={{ borderTop: '1px solid #374151' }}></div>
                <button
                  onClick={handleSignOut}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.75rem 1rem',
                    color: '#f87171',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#1f2937'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  🚪 Sign Out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }} className="mobile-nav">
          {/* Hamburger Button */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              padding: '0.5rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            <div style={{ width: '1.5rem', height: '2px', background: '#fff', transition: 'all 0.3s' }}></div>
            <div style={{ width: '1.5rem', height: '2px', background: '#fff', transition: 'all 0.3s' }}></div>
            <div style={{ width: '1.5rem', height: '2px', background: '#fff', transition: 'all 0.3s' }}></div>
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '0',
                right: '0',
                background: '#ef4444',
                color: '#fff',
                borderRadius: '9999px',
                padding: '0.125rem 0.375rem',
                fontSize: '0.625rem',
                fontWeight: 'bold'
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          {/* User Avatar */}
          <button
            onClick={() => router.push('/profile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.25rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {userProfile?.profileImage ? (
              <img 
                src={userProfile.profileImage} 
                alt={userProfile.displayName || 'Profile'}
                style={{
                  width: '2rem',
                  height: '2rem',
                  borderRadius: '9999px',
                  objectFit: 'cover',
                  border: '2px solid #f97316'
                }}
              />
            ) : (
              <div style={{
                width: '2rem',
                height: '2rem',
                borderRadius: '9999px',
                background: '#1f2937',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                border: '2px solid #f97316'
              }}>
                👤
              </div>
            )}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        {showMobileMenu && (
          <div 
            style={{
              position: 'fixed',
              top: '4rem',
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.95)',
              zIndex: 40,
              padding: '1.5rem',
              overflowY: 'auto'
            }}
            onClick={() => setShowMobileMenu(false)}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    setShowMobileMenu(false);
                    router.push(item.path);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '1rem',
                    background: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '0.5rem',
                    color: '#fff',
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}
                >
                  {item.label}
                  {item.badge > 0 && (
                    <span style={{
                      background: '#ef4444',
                      color: '#fff',
                      borderRadius: '9999px',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}

              <div style={{ borderTop: '1px solid #374151', margin: '1rem 0' }}></div>

              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  router.push('/profile');
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '1rem',
                  background: '#111827',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                  color: '#fff',
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                👤 My Profile
              </button>

              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  router.push('/create-club');
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '1rem',
                  background: '#111827',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                  color: '#fff',
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                👥 Create Club
              </button>

              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  router.push('/settings');
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '1rem',
                  background: '#111827',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                  color: '#fff',
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ⚙️ Settings
              </button>

              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  handleSignOut();
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '1rem',
                  background: '#111827',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                  color: '#f87171',
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                🚪 Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @media (min-width: 768px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-nav {
            display: none !important;
          }
        }
        @media (max-width: 767px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-nav {
            display: flex !important;
          }
        }
      `}</style>
    </nav>
  );
}