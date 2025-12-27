'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';

export default function Navigation({ user }) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userProfile, setUserProfile] = useState(null);
  const router = useRouter();

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
            return comment.userId !== user.uid && 
                   (!comment.readBy || !comment.readBy.includes(user.uid));
          });
          
          totalUnread = unreadComments.length;
          setUnreadCount(totalUnread);
        });
      });
    });

    const intervalId = setInterval(() => {
      
    }, 10000);

    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navItems = [
    { label: 'Browse Sessions', path: '/browse' },
    { label: 'How it Works', path: '/how-it-works' },
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
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
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
            <span style={{ color: '#fff', fontWeight: '600', fontSize: '0.875rem' }}>
              {userProfile?.displayName || 'Menu'}
            </span>
          </button>

          {showUserMenu && (
            <div style={{
              position: 'absolute',
              right: '1rem',
              top: '4rem',
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