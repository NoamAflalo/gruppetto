'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { User, Users, Settings, LogOut, Menu, X, ChevronDown } from 'lucide-react';

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

  // Unread chat messages across joined sessions. One listener per session,
  // tracked in a map so counts stay correct and listeners are cleaned up.
  useEffect(() => {
    if (!user) return;

    const counts = new Map();
    const innerUnsubs = new Map();

    const recompute = () => {
      const total = [...counts.values()].reduce((a, b) => a + b, 0);
      setUnreadCount(pathname === '/notifications' ? 0 : total);
    };

    const q = query(
      collection(db, 'sessions'),
      where('participants', 'array-contains', user.uid)
    );

    const outerUnsub = onSnapshot(q, (snapshot) => {
      const currentIds = new Set(snapshot.docs.map((d) => d.id));

      for (const [id, unsub] of innerUnsubs) {
        if (!currentIds.has(id)) {
          unsub();
          innerUnsubs.delete(id);
          counts.delete(id);
        }
      }

      snapshot.docs.forEach((sessionDoc) => {
        if (innerUnsubs.has(sessionDoc.id)) return;

        const commentsRef = collection(db, 'sessions', sessionDoc.id, 'comments');
        const unsub = onSnapshot(commentsRef, (commentsSnapshot) => {
          const unread = commentsSnapshot.docs.filter((docSnap) => {
            const comment = docSnap.data();
            return comment.userId && comment.userId !== user.uid &&
                   (!comment.readBy || !comment.readBy.includes(user.uid));
          }).length;
          counts.set(sessionDoc.id, unread);
          recompute();
        });
        innerUnsubs.set(sessionDoc.id, unsub);
      });

      recompute();
    });

    return () => {
      outerUnsub();
      innerUnsubs.forEach((unsub) => unsub());
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
    { label: 'Browse', path: '/browse' },
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Notifications', path: '/notifications', badge: unreadCount },
  ];

  const menuItems = [
    { label: 'My Profile', path: '/profile', icon: User },
    { label: 'Create Club', path: '/create-club', icon: Users },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const Badge = ({ count }) =>
    count > 0 ? (
      <span className="bg-brand text-ink rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none">
        {count}
      </span>
    ) : null;

  return (
    <nav className="sticky top-0 z-50 bg-ground/90 backdrop-blur border-b border-line">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <button onClick={() => router.push('/browse')} className="flex items-center gap-2.5 flex-none">
          <Image src="/logo.png" alt="" width={30} height={30} className="rounded-md" />
          <span className="font-display uppercase text-lg tracking-wide text-ink">Gruppetto</span>
        </button>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const active = pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`relative px-3 py-2 text-sm font-medium rounded-lg transition flex items-center gap-1.5 ${
                  active ? 'text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                {item.label}
                <Badge count={item.badge} />
                {active && (
                  <span className="absolute left-3 right-3 -bottom-[13px] h-0.5 bg-brand rounded-full" />
                )}
              </button>
            );
          })}

          <button
            onClick={() => router.push('/create')}
            className="ml-2 bg-brand text-ink text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-hover transition"
          >
            + Create
          </button>

          {/* Desktop User Menu */}
          <div className="relative ml-2">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-lg hover:bg-card2 transition"
            >
              {userProfile?.profileImage ? (
                <img
                  src={userProfile.profileImage}
                  alt={userProfile.displayName || 'Profile'}
                  className="w-8 h-8 rounded-full object-cover border border-line"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-card2 border border-line flex items-center justify-center">
                  <User size={15} className="text-muted" />
                </div>
              )}
              <ChevronDown size={14} className="text-muted" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-card border border-line rounded-xl shadow-xl shadow-black/40 overflow-hidden">
                {menuItems.map(({ label, path, icon: Icon }) => (
                  <button
                    key={path}
                    onClick={() => {
                      setShowUserMenu(false);
                      router.push(path);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-soft hover:bg-card2 hover:text-ink transition flex items-center gap-2.5"
                  >
                    <Icon size={15} className="text-muted" /> {label}
                  </button>
                ))}
                <div className="border-t border-line" />
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-card2 transition flex items-center gap-2.5"
                >
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile: hamburger + avatar */}
        <div className="flex md:hidden items-center gap-3">
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="relative p-2 text-ink"
            aria-label="Menu"
          >
            {showMobileMenu ? <X size={22} /> : <Menu size={22} />}
            {unreadCount > 0 && !showMobileMenu && (
              <span className="absolute top-0.5 right-0.5 bg-brand text-ink rounded-full px-1 py-0.5 text-[10px] font-bold leading-none">
                {unreadCount}
              </span>
            )}
          </button>

          <button onClick={() => router.push('/profile')} className="flex-none">
            {userProfile?.profileImage ? (
              <img
                src={userProfile.profileImage}
                alt={userProfile.displayName || 'Profile'}
                className="w-8 h-8 rounded-full object-cover border border-line"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-card2 border border-line flex items-center justify-center">
                <User size={15} className="text-muted" />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div
          className="md:hidden fixed inset-x-0 top-16 bottom-0 bg-ground/95 backdrop-blur z-40 p-5 overflow-y-auto"
          onClick={() => setShowMobileMenu(false)}
        >
          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => {
                setShowMobileMenu(false);
                router.push('/create');
              }}
              className="w-full p-4 bg-brand text-ink rounded-xl text-base font-bold text-left"
            >
              + Create Session
            </button>

            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  setShowMobileMenu(false);
                  router.push(item.path);
                }}
                className="w-full p-4 bg-card border border-line rounded-xl text-ink text-base font-semibold flex items-center justify-between"
              >
                {item.label}
                <Badge count={item.badge} />
              </button>
            ))}

            <div className="border-t border-line my-2" />

            {menuItems.map(({ label, path, icon: Icon }) => (
              <button
                key={path}
                onClick={() => {
                  setShowMobileMenu(false);
                  router.push(path);
                }}
                className="w-full p-4 bg-card border border-line rounded-xl text-ink text-base font-semibold flex items-center gap-3"
              >
                <Icon size={17} className="text-muted" /> {label}
              </button>
            ))}

            <button
              onClick={() => {
                setShowMobileMenu(false);
                handleSignOut();
              }}
              className="w-full p-4 bg-card border border-line rounded-xl text-red-400 text-base font-semibold flex items-center gap-3"
            >
              <LogOut size={17} /> Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
