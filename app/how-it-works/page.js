'use client';
import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Navigation from '../components/navigation';

export default function HowItWorks() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-ground text-ink">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-ground">
      {user && <Navigation user={user} />}
      
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-ink mb-4">How Gruppetto Works</h1>
          <p className="text-lg md:text-xl text-muted">Join the fastest-growing fitness community in South West London</p>
        </div>

        {/* Steps */}
        <div className="space-y-12 md:space-y-16 mb-12 md:mb-16">
          {/* Step 1 */}
          <div className="flex flex-col md:flex-row items-start gap-4 md:gap-8">
            <div className="flex-shrink-0 rounded-full bg-brand flex items-center justify-center font-black text-ink"
                 style={{ width: '4rem', height: '4rem', fontSize: '2rem', minWidth: '4rem', minHeight: '4rem' }}>
              1
            </div>
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-bold text-ink mb-3 md:mb-4">Create Your Profile</h2>
              <p className="text-sm md:text-lg text-soft mb-3 md:mb-4 leading-relaxed">
                Sign up and tell us about your fitness journey. Add your preferred activities (running, cycling, swimming), 
                your fitness level, and your location. Upload a profile photo to personalize your account. 
                Our smart recommendation system uses your profile to suggest sessions that match your abilities and preferences.
              </p>
              <div className="bg-card rounded-xl border border-line p-4 md:p-6">
                <p className="text-xs md:text-sm text-muted mb-2">💡 Pro Tip:</p>
                <p className="text-sm md:text-base text-soft">Rate yourself for each activity (1-5) in Settings. This helps us recommend the perfect sessions for your fitness level!</p>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col md:flex-row items-start gap-4 md:gap-8">
            <div className="flex-shrink-0 rounded-full bg-brand flex items-center justify-center font-black text-ink"
                 style={{ width: '4rem', height: '4rem', fontSize: '2rem', minWidth: '4rem', minHeight: '4rem' }}>
              2
            </div>
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-bold text-ink mb-3 md:mb-4">Browse Sessions & Clubs</h2>
              <p className="text-sm md:text-lg text-soft mb-3 md:mb-4 leading-relaxed">
                Explore upcoming training sessions and clubs in your area. Switch between <strong>List View</strong> for detailed info, 
                <strong> Calendar View</strong> to see what's happening when, or <strong>Map View</strong> to find sessions near you. 
                Use filters to narrow down by activity type, date, intensity, and location.
              </p>
              <div className="bg-card rounded-xl border border-line p-4 md:p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl md:text-2xl">✨</span>
                  <span className="text-sm md:text-base text-soft"><strong>Personalized Recommendations</strong> - See sessions matched to your profile at the top</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl md:text-2xl">📅</span>
                  <span className="text-sm md:text-base text-soft"><strong>Calendar View</strong> - Click any day to see all sessions scheduled</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl md:text-2xl">🗺️</span>
                  <span className="text-sm md:text-base text-soft"><strong>Map View</strong> - Visualize where sessions are happening</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl md:text-2xl">👥</span>
                  <span className="text-sm md:text-base text-soft"><strong>Clubs Tab</strong> - Browse and join run clubs, cycling groups, and swim teams</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col md:flex-row items-start gap-4 md:gap-8">
            <div className="flex-shrink-0 rounded-full bg-brand flex items-center justify-center font-black text-ink"
                 style={{ width: '4rem', height: '4rem', fontSize: '2rem', minWidth: '4rem', minHeight: '4rem' }}>
              3
            </div>
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-bold text-ink mb-3 md:mb-4">Join or Create Sessions</h2>
              <p className="text-sm md:text-lg text-soft mb-3 md:mb-4 leading-relaxed">
                Found a session you like? Click "Join" to add yourself to the participant list. Creating your own session? 
                Use our <strong>AI Session Generator</strong> for inspiration, or fill out the details yourself. 
                Choose between public sessions (anyone can join) or private sessions (require approval).
              </p>
              <div className="bg-card rounded-xl border border-line p-4 md:p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl md:text-2xl">🤖</span>
                  <span className="text-sm md:text-base text-soft"><strong>AI Generator</strong> - Describe your ideal session and Claude AI creates it for you</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl md:text-2xl">🔒</span>
                  <span className="text-sm md:text-base text-soft"><strong>Private Sessions</strong> - Perfect for clubs! People can request to join and you approve them</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl md:text-2xl">📍</span>
                  <span className="text-sm md:text-base text-soft"><strong>Smart Locations</strong> - Set a meeting point and optional destination (e.g., "Hyde Park → Serpentine")</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 - NEW: Clubs */}
          <div className="flex flex-col md:flex-row items-start gap-4 md:gap-8">
            <div className="flex-shrink-0 rounded-full bg-brand flex items-center justify-center font-black text-ink"
                 style={{ width: '4rem', height: '4rem', fontSize: '2rem', minWidth: '4rem', minHeight: '4rem' }}>
              4
            </div>
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-bold text-ink mb-3 md:mb-4">Create or Join a Club</h2>
              <p className="text-sm md:text-lg text-soft mb-3 md:mb-4 leading-relaxed">
                Take it to the next level by creating your own run club, cycling group, or swim team. 
                Add a cover photo, description, and start building your community. Club admins can create sessions directly 
                for their club, making it easy to organize regular training.
              </p>
              <div className="bg-card rounded-xl border border-line p-4 md:p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl md:text-2xl">🏛️</span>
                  <span className="text-sm md:text-base text-soft"><strong>One Club Per Person</strong> - Ensure quality by creating one official club</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl md:text-2xl">✓</span>
                  <span className="text-sm md:text-base text-soft"><strong>Featured Clubs</strong> - Top clubs get verified badge and featured placement</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl md:text-2xl">⚙️</span>
                  <span className="text-sm md:text-base text-soft"><strong>Admin Controls</strong> - Manage members and create club sessions as an admin</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex flex-col md:flex-row items-start gap-4 md:gap-8">
            <div className="flex-shrink-0 rounded-full bg-brand flex items-center justify-center font-black text-ink"
                 style={{ width: '4rem', height: '4rem', fontSize: '2rem', minWidth: '4rem', minHeight: '4rem' }}>
              5
            </div>
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-bold text-ink mb-3 md:mb-4">Chat & Coordinate</h2>
              <p className="text-sm md:text-lg text-soft mb-3 md:mb-4 leading-relaxed">
                Once you've joined a session, use the comments section to coordinate with other participants. 
                Ask questions, share tips, or just get to know your training partners. Get notified via email when 
                someone joins your session or leaves a comment.
              </p>
              <div className="bg-card rounded-xl border border-line p-4 md:p-6">
                <p className="text-xs md:text-sm text-muted mb-2">📧 Email Notifications:</p>
                <p className="text-sm md:text-base text-soft">Stay updated with email alerts for new participants, comments, and session updates!</p>
              </div>
            </div>
          </div>

          {/* Step 6 */}
          <div className="flex flex-col md:flex-row items-start gap-4 md:gap-8">
            <div className="flex-shrink-0 rounded-full bg-brand flex items-center justify-center font-black text-ink"
                 style={{ width: '4rem', height: '4rem', fontSize: '2rem', minWidth: '4rem', minHeight: '4rem' }}>
              6
            </div>
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-bold text-ink mb-3 md:mb-4">Show Up & Train!</h2>
              <p className="text-sm md:text-lg text-soft mb-3 md:mb-4 leading-relaxed">
                Meet your training partners at the designated location and time. Have a great workout together! 
                Your session history is tracked in your Dashboard, showing all the sessions you've hosted, joined, 
                and the clubs you're part of.
              </p>
              <div className="bg-card rounded-xl border border-line p-4 md:p-6">
                <p className="text-xs md:text-sm text-muted mb-2">🏆 Track Your Progress:</p>
                <p className="text-sm md:text-base text-soft">View your stats in the Dashboard: sessions hosted, sessions joined, and clubs you're part of. Watch your fitness community grow!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Highlight */}
        <div className="border-t border-line pt-12 md:pt-16 mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-black text-ink mb-6 md:mb-8 text-center">Powerful Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="bg-card rounded-xl border border-line p-4 md:p-6">
              <div className="text-3xl mb-3">🤖</div>
              <h3 className="text-lg md:text-xl font-bold text-ink mb-2">AI Session Generator</h3>
              <p className="text-sm md:text-base text-soft">Stuck for ideas? Describe what you want and Claude AI generates a complete session for you in seconds.</p>
            </div>

            <div className="bg-card rounded-xl border border-line p-4 md:p-6">
              <div className="text-3xl mb-3">✨</div>
              <h3 className="text-lg md:text-xl font-bold text-ink mb-2">Smart Recommendations</h3>
              <p className="text-sm md:text-base text-soft">Our algorithm suggests sessions based on your fitness level, location, and activity preferences.</p>
            </div>

            <div className="bg-card rounded-xl border border-line p-4 md:p-6">
              <div className="text-3xl mb-3">📅</div>
              <h3 className="text-lg md:text-xl font-bold text-ink mb-2">3 Browse Views</h3>
              <p className="text-sm md:text-base text-soft">Switch between List, Calendar, and Map views to find sessions the way you prefer.</p>
            </div>

            <div className="bg-card rounded-xl border border-line p-4 md:p-6">
              <div className="text-3xl mb-3">👥</div>
              <h3 className="text-lg md:text-xl font-bold text-ink mb-2">Clubs & Communities</h3>
              <p className="text-sm md:text-base text-soft">Create your own club or join existing ones. Organize regular sessions and build lasting training partnerships.</p>
            </div>

            <div className="bg-card rounded-xl border border-line p-4 md:p-6">
              <div className="text-3xl mb-3">🔒</div>
              <h3 className="text-lg md:text-xl font-bold text-ink mb-2">Private Sessions</h3>
              <p className="text-sm md:text-base text-soft">Create invite-only sessions where you approve participants - perfect for club-organized training.</p>
            </div>

            <div className="bg-card rounded-xl border border-line p-4 md:p-6">
              <div className="text-3xl mb-3">📧</div>
              <h3 className="text-lg md:text-xl font-bold text-ink mb-2">Email Notifications</h3>
              <p className="text-sm md:text-base text-soft">Get notified when people join your sessions, leave comments, or when sessions are created.</p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="border-t border-line pt-12 md:pt-16">
          <h2 className="text-3xl md:text-4xl font-black text-ink mb-6 md:mb-8 text-center">Frequently Asked Questions</h2>
          
          <div className="space-y-4 md:space-y-6 max-w-3xl mx-auto">
            <div className="bg-card rounded-xl border border-line p-4 md:p-6">
              <h3 className="text-lg md:text-xl font-bold text-ink mb-2">Is Gruppetto free?</h3>
              <p className="text-sm md:text-base text-soft">Yes! Gruppetto is completely free to use. Create and join as many sessions as you want, create clubs, and access all features at no cost.</p>
            </div>

            <div className="bg-card rounded-xl border border-line p-4 md:p-6">
              <h3 className="text-lg md:text-xl font-bold text-ink mb-2">How do clubs work?</h3>
              <p className="text-sm md:text-base text-soft">Each user can create one club. As a club founder or admin, you can create sessions specifically for your club, manage members, and build your community. Clubs need admin approval before going live.</p>
            </div>

            <div className="bg-card rounded-xl border border-line p-4 md:p-6">
              <h3 className="text-lg md:text-xl font-bold text-ink mb-2">What's the difference between public and private sessions?</h3>
              <p className="text-sm md:text-base text-soft">Public sessions let anyone join instantly. Private sessions require the host to approve join requests - perfect for club sessions or when you want to vet participants.</p>
            </div>

            <div className="bg-card rounded-xl border border-line p-4 md:p-6">
              <h3 className="text-lg md:text-xl font-bold text-ink mb-2">What if I need to cancel?</h3>
              <p className="text-sm md:text-base text-soft">Simply click "Leave" on the session page. The host and other participants will be notified automatically via email.</p>
            </div>

            <div className="bg-card rounded-xl border border-line p-4 md:p-6">
              <h3 className="text-lg md:text-xl font-bold text-ink mb-2">How does the recommendation system work?</h3>
              <p className="text-sm md:text-base text-soft">Our smart algorithm analyzes your activity preferences, fitness level ratings, and location to suggest sessions that match your abilities. The more complete your profile, the better the recommendations!</p>
            </div>

            <div className="bg-card rounded-xl border border-line p-4 md:p-6">
              <h3 className="text-lg md:text-xl font-bold text-ink mb-2">How do I know if someone is reliable?</h3>
              <p className="text-sm md:text-base text-soft">Check their profile! You can see their fitness level, preferred activities, and view their session history to see how active they are in the community.</p>
            </div>

            <div className="bg-card rounded-xl border border-line p-4 md:p-6">
              <h3 className="text-lg md:text-xl font-bold text-ink mb-2">Can I bring a friend?</h3>
              <p className="text-sm md:text-base text-soft">Absolutely! Just make sure they sign up on Gruppetto and join the session so the host knows the exact number of participants.</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 md:mt-16 text-center">
          {user ? (
            <button
              onClick={() => router.push('/browse')}
              className="px-8 md:px-12 py-3 md:py-4 bg-brand text-ink rounded-xl font-bold text-lg md:text-xl hover:bg-brand-hover transition w-full md:w-auto"
            >
              Browse Sessions
            </button>
          ) : (
            <button
              onClick={() => router.push('/')}
              className="px-8 md:px-12 py-3 md:py-4 bg-brand text-ink rounded-xl font-bold text-lg md:text-xl hover:bg-brand-hover transition w-full md:w-auto"
            >
              Get Started
            </button>
          )}
        </div>
      </div>
    </div>
  );
}