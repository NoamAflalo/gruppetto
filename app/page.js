'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { auth, db } from '@/lib/firebase';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Users, MapPin, MessagesSquare } from 'lucide-react';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push('/browse');
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);

        if (result?.user) {
          await createUserProfile(result.user);
        }
      } catch (error) {
        console.error('❌ Redirect error:', error);
        alert('ERROR: ' + error.code + ' - ' + error.message);
      }
    };

    handleRedirectResult();
  }, []);

  const createUserProfile = async (user) => {
    try {
      const profileRef = doc(db, 'profiles', user.uid);
      const profileSnap = await getDoc(profileRef);

      // Si le profil n'existe pas, le créer
      if (!profileSnap.exists()) {
        // No email in the profile doc: profiles are readable by all signed-in
        // users, emails live in Firebase Auth only.
        await setDoc(profileRef, {
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          profileImage: user.photoURL || null,
          createdAt: new Date().toISOString(),
          fitnessLevel: 'intermediate',
          bio: '',
          location: '',
        });
      }
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsAuthenticating(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      // Créer le profil si nécessaire
      await createUserProfile(result.user);

    } catch (error) {
      console.error('Error signing in:', error);

      // Popup couldn't open (blocked, or unsupported on this browser) —
      // fall back to the full-page redirect flow, which needs no popup.
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request' || error.code === 'auth/operation-not-supported-in-this-environment') {
        try {
          await signInWithRedirect(auth, new GoogleAuthProvider());
          return;
        } catch (redirectError) {
          console.error('Redirect sign-in error:', redirectError);
        }
      }

      setIsAuthenticating(false);

      if (error.code === 'auth/popup-closed-by-user') {
        // User fermé le popup, c'est normal
      } else {
        alert(
          "Sign-in didn't complete. Please try again — and if it keeps failing, make sure popups are allowed for this site."
        );
      }
    }
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Créer le profil immédiatement
      await createUserProfile(userCredential.user);

      router.push('/browse');
    } catch (error) {
      console.error('Error signing up:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('Email already in use');
      } else if (error.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters');
      } else {
        setError('Failed to create account');
      }
    }
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/browse');
    } catch (error) {
      console.error('Error signing in:', error);
      if (error.code === 'auth/invalid-credential') {
        setError('Invalid email or password');
      } else if (error.code === 'auth/user-not-found') {
        setError('No account found with this email');
      } else {
        setError('Failed to sign in');
      }
    }
  };

  // Loader pendant l'authentification
  if (isAuthenticating) {
    return (
      <div className="min-h-screen bg-ground flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-line border-t-brand rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-soft text-lg">Signing you in...</p>
        </div>
      </div>
    );
  }

  const features = [
    {
      icon: Users,
      title: 'Find training partners',
      text: 'Connect with runners, cyclists, and swimmers at your pace. No more solo sessions.',
    },
    {
      icon: MapPin,
      title: 'Sessions near you',
      text: 'Browse the map from Battersea to Richmond. Join in one tap, get a reminder the night before.',
    },
    {
      icon: MessagesSquare,
      title: 'Coordinate together',
      text: 'Session chat for pace, meeting points, and the post-workout coffee plan.',
    },
  ];

  return (
    <div className="min-h-screen bg-ground">
      {/* Top bar */}
      <header className="max-w-6xl mx-auto px-6 pt-8 flex items-center gap-3">
        <Image src="/logo.png" alt="Gruppetto" width={36} height={36} className="rounded-lg" />
        <span className="font-display text-xl uppercase tracking-wide text-ink">Gruppetto</span>
      </header>

      <main className="max-w-6xl mx-auto px-6">
        {/* Hero + auth */}
        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center py-14 md:py-24">
          <div>
            <p className="text-brand font-semibold text-sm uppercase tracking-[0.18em] mb-5">
              London · Running · Cycling · Swimming
            </p>
            <h1 className="font-display uppercase text-6xl md:text-7xl lg:text-8xl leading-[0.95] text-ink mb-6">
              Never train<br />alone<span className="text-brand">.</span>
            </h1>
            <p className="text-soft text-lg md:text-xl leading-relaxed max-w-md">
              The <em className="text-ink not-italic font-semibold">gruppetto</em> is the group
              that sticks together to the finish. Find your people, join a session, and show up.
            </p>
          </div>

          {/* Sign In Card */}
          <div className="w-full max-w-md md:justify-self-end bg-card border border-line rounded-2xl p-8">
            <h2 className="font-display uppercase text-2xl text-ink mb-6 text-center">
              {isSignUp ? 'Create account' : 'Welcome back'}
            </h2>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2.5 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              className="w-full bg-ink text-ground py-3.5 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-white transition mb-4"
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
                <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-line"></div>
              <span className="text-muted text-sm">or</span>
              <div className="flex-1 h-px bg-line"></div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={isSignUp ? handleEmailSignUp : handleEmailSignIn}>
              <div className="mb-4">
                <label className="block text-soft text-sm font-semibold mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  required
                  className="w-full p-3 bg-ground border border-line rounded-lg text-ink placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-brand appearance-none"
                />
              </div>

              <div className="mb-6">
                <label className="block text-soft text-sm font-semibold mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full p-3 bg-ground border border-line rounded-lg text-ink placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-brand appearance-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-brand text-ink py-3.5 rounded-lg font-bold hover:bg-brand-hover transition"
              >
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </button>

              {/* Forgot Password Link */}
              {!isSignUp && (
                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => router.push('/forgot-password')}
                    className="text-brand text-sm underline hover:text-brand-soft transition"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </form>

            {/* Toggle Sign Up / Sign In */}
            <div className="mt-6 text-center text-muted text-sm">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                }}
                className="text-brand font-semibold underline hover:text-brand-soft transition"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid sm:grid-cols-3 gap-5 pb-20">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="bg-card border border-line rounded-2xl p-7">
              <div className="w-11 h-11 rounded-xl bg-brand/10 border border-brand/25 flex items-center justify-center mb-5">
                <Icon size={20} className="text-brand" />
              </div>
              <h3 className="font-display uppercase text-lg text-ink mb-2">{title}</h3>
              <p className="text-muted text-sm leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
