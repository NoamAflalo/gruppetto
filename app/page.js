'use client';
import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        router.push('/browse');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push('/browse');
    } catch (error) {
      console.error('Error signing in with Google:', error);
      setError('Error signing in with Google. Please try again.');
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.push('/browse');
    } catch (error) {
      console.error('Error with email auth:', error);
      setError(error.message);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'black', color: 'white' }}>
        Loading...
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'black', color: 'white' }}>
      {/* Hero Section */}
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '3rem 1.5rem',
        textAlign: 'center'
      }}>
        {/* Logo */}
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
        
        {/* Tagline */}
        <p style={{ 
          fontSize: 'clamp(1.25rem, 4vw, 2rem)',
          color: '#d1d5db',
          marginBottom: '1rem',
          fontWeight: '600',
          lineHeight: '1.3'
        }}>
          Find Your Training Partners
        </p>
        
        <p style={{ 
          fontSize: 'clamp(1rem, 3vw, 1.5rem)',
          color: '#9ca3af',
          marginBottom: '3rem',
          maxWidth: '800px',
          margin: '0 auto 3rem',
          lineHeight: '1.5',
          padding: '0 1rem'
        }}>
          Join South West London's fastest-growing community for runners, cyclists, and swimmers
        </p>

        {/* Auth Section */}
        <div style={{ 
          maxWidth: '450px', 
          margin: '0 auto',
          padding: '0 1rem'
        }}>
          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            style={{
              width: '100%',
              padding: '1rem',
              backgroundColor: 'white',
              color: 'black',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1.125rem',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              transition: 'all 0.2s',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
            onTouchStart={(e) => e.target.style.backgroundColor = '#f3f4f6'}
            onTouchEnd={(e) => e.target.style.backgroundColor = 'white'}
          >
            <span style={{ fontSize: '1.5rem' }}>🔐</span>
            Continue with Google
          </button>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#374151' }}></div>
            <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>OR</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#374151' }}></div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} style={{ marginBottom: '1.5rem' }}>
            {error && (
              <div style={{
                padding: '0.75rem',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#f87171',
                fontSize: '0.875rem',
                marginBottom: '1rem'
              }}>
                {error}
              </div>
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '1rem',
                marginBottom: '1rem',
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '12px',
                color: 'white',
                fontSize: '1rem',
                outline: 'none',
                WebkitAppearance: 'none',
                boxSizing: 'border-box'
              }}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '1rem',
                marginBottom: '1rem',
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '12px',
                color: 'white',
                fontSize: '1rem',
                outline: 'none',
                WebkitAppearance: 'none',
                boxSizing: 'border-box'
              }}
            />

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '1rem',
                backgroundColor: '#f97316',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1.125rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#ea580c'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#f97316'}
              onTouchStart={(e) => e.target.style.backgroundColor = '#ea580c'}
              onTouchEnd={(e) => e.target.style.backgroundColor = '#f97316'}
            >
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          <button
            onClick={() => setIsSignUp(!isSignUp)}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: 'transparent',
              color: '#f97316',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>

      {/* Features Grid */}
      <div style={{ 
        backgroundColor: '#111827', 
        padding: '4rem 1.5rem',
        marginTop: '4rem'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem'
          }}>
            {/* Feature 1 */}
            <div style={{ 
              backgroundColor: '#1f2937',
              padding: '2rem',
              borderRadius: '16px',
              border: '1px solid #374151',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏃</div>
              <h3 style={{ 
                fontSize: '1.5rem', 
                fontWeight: '700', 
                marginBottom: '0.75rem',
                color: 'white'
              }}>
                Find Sessions
              </h3>
              <p style={{ color: '#9ca3af', lineHeight: '1.6' }}>
                Browse running, cycling, and swimming sessions near you
              </p>
            </div>

            {/* Feature 2 */}
            <div style={{ 
              backgroundColor: '#1f2937',
              padding: '2rem',
              borderRadius: '16px',
              border: '1px solid #374151',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
              <h3 style={{ 
                fontSize: '1.5rem', 
                fontWeight: '700', 
                marginBottom: '0.75rem',
                color: 'white'
              }}>
                Join Community
              </h3>
              <p style={{ color: '#9ca3af', lineHeight: '1.6' }}>
                Connect with like-minded athletes in SW London
              </p>
            </div>

            {/* Feature 3 */}
            <div style={{ 
              backgroundColor: '#1f2937',
              padding: '2rem',
              borderRadius: '16px',
              border: '1px solid #374151',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
              <h3 style={{ 
                fontSize: '1.5rem', 
                fontWeight: '700', 
                marginBottom: '0.75rem',
                color: 'white'
              }}>
                Stay Connected
              </h3>
              <p style={{ color: '#9ca3af', lineHeight: '1.6' }}>
                Chat with participants and coordinate your training
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ 
        backgroundColor: 'black',
        padding: '2rem 1.5rem',
        textAlign: 'center',
        borderTop: '1px solid #1f2937'
      }}>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          © 2025 Gruppetto. Made with 💪 in London.
        </p>
      </div>
    </div>
  );
}