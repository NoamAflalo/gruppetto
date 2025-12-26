'use client';
import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged 
} from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push('/browse');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push('/browse');
    } catch (error) {
      console.error('Error signing in with Google:', error);
      setError('Failed to sign in with Google');
    }
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
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

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Hero Section */}
      <div style={{ 
        textAlign: 'center', 
        maxWidth: '48rem', 
        marginBottom: '3rem'
      }}>
        <h1 style={{ 
          fontSize: 'clamp(3rem, 8vw, 6rem)',
          fontWeight: '900',
          color: '#f97316',
          marginBottom: '1.5rem',
          fontStyle: 'italic',
          lineHeight: '1.1'
        }}>
          Gruppetto
        </h1>
        <p style={{ 
          fontSize: 'clamp(1.25rem, 3vw, 1.875rem)',
          color: '#fff',
          marginBottom: '1rem',
          fontWeight: '600'
        }}>
          Train together. Get stronger.
        </p>
        <p style={{ 
          fontSize: 'clamp(1rem, 2vw, 1.25rem)',
          color: '#9ca3af',
          lineHeight: '1.6'
        }}>
          Join the community of runners, cyclists, and swimmers in South West London. 
          Find your training partners, organize sessions, and never train alone again.
        </p>
      </div>

      {/* Sign In Card */}
      <div style={{
        width: '100%',
        maxWidth: '28rem',
        background: '#111827',
        border: '1px solid #374151',
        borderRadius: '1rem',
        padding: '2rem',
        marginBottom: '3rem'
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: '#fff',
          marginBottom: '1.5rem',
          textAlign: 'center'
        }}>
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h2>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            marginBottom: '1rem',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        {/* Google Sign In */}
        <button
          onClick={handleGoogleSignIn}
          style={{
            width: '100%',
            background: '#fff',
            color: '#000',
            padding: '1rem',
            borderRadius: '0.5rem',
            border: 'none',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.background = '#f3f4f6'}
          onMouseLeave={(e) => e.target.style.background = '#fff'}
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
        <div style={{
          display: 'flex',
          alignItems: 'center',
          margin: '1.5rem 0',
          gap: '1rem'
        }}>
          <div style={{ flex: 1, height: '1px', background: '#374151' }}></div>
          <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: '#374151' }}></div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={isSignUp ? handleEmailSignUp : handleEmailSignIn}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              color: '#d1d5db',
              fontSize: '0.875rem',
              fontWeight: '600',
              marginBottom: '0.5rem'
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your-email@example.com"
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#000',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
                color: '#fff',
                fontSize: '1rem',
                outline: 'none',
                WebkitAppearance: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              color: '#d1d5db',
              fontSize: '0.875rem',
              fontWeight: '600',
              marginBottom: '0.5rem'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#000',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
                color: '#fff',
                fontSize: '1rem',
                outline: 'none',
                WebkitAppearance: 'none'
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              background: '#f97316',
              color: '#fff',
              padding: '1rem',
              borderRadius: '0.5rem',
              border: 'none',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = '#ea580c'}
            onMouseLeave={(e) => e.target.style.background = '#f97316'}
          >
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </button>

          {/* Forgot Password Link */}
          {!isSignUp && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => router.push('/forgot-password')}
                style={{
                  color: '#f97316',
                  fontSize: '0.875rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Forgot password?
              </button>
            </div>
          )}
        </form>

        {/* Toggle Sign Up / Sign In */}
        <div style={{ 
          marginTop: '1.5rem', 
          textAlign: 'center',
          color: '#9ca3af',
          fontSize: '0.875rem'
        }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            style={{
              color: '#f97316',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>

      {/* Features Section */}
      <div style={{
        width: '100%',
        maxWidth: '64rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '2rem',
        marginBottom: '3rem'
      }}>
        <div style={{
          background: '#111827',
          border: '1px solid #374151',
          borderRadius: '1rem',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏃</div>
          <h3 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            Find Training Partners
          </h3>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', lineHeight: '1.5' }}>
            Connect with runners, cyclists, and swimmers in your area. No more solo sessions.
          </p>
        </div>

        <div style={{
          background: '#111827',
          border: '1px solid #374151',
          borderRadius: '1rem',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📍</div>
          <h3 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            Local Sessions
          </h3>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', lineHeight: '1.5' }}>
            Browse sessions on the map. Find workouts near Battersea, Clapham, Richmond, and beyond.
          </p>
        </div>

        <div style={{
          background: '#111827',
          border: '1px solid #374151',
          borderRadius: '1rem',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
          <h3 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            Real-Time Chat
          </h3>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', lineHeight: '1.5' }}>
            Coordinate with your training group. Discuss pace, meeting points, and post-workout coffee.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ 
        textAlign: 'center',
        paddingTop: '2rem',
        borderTop: '1px solid #374151',
        width: '100%',
        maxWidth: '64rem'
      }}>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          © 2025 Gruppetto. Made with 💪 in London.
        </p>
      </div>
    </div>
  );
}