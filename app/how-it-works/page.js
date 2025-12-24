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
    return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-black">
      {user && <Navigation user={user} />}
      
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">How Gruppetto Works</h1>
          <p className="text-lg md:text-xl text-gray-400">Join the fastest-growing fitness community in South West London</p>
        </div>

        {/* Steps */}
        <div className="space-y-12 md:space-y-16 mb-12 md:mb-16">
          {/* Step 1 */}
          <div className="flex flex-col md:flex-row items-start gap-4 md:gap-8">
            <div className="flex-shrink-0 rounded-full bg-orange-500 flex items-center justify-center font-black text-white"
                 style={{ width: '4rem', height: '4rem', fontSize: '2rem', minWidth: '4rem', minHeight: '4rem' }}>
              1
            </div>
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 md:mb-4">Create Your Profile</h2>
              <p className="text-sm md:text-lg text-gray-300 mb-3 md:mb-4 leading-relaxed">
                Sign up and tell us about your fitness journey. Add your preferred activities (running, cycling, swimming), 
                your fitness level, and your preferred pace. Upload a profile photo and link your Strava account to showcase your achievements.
              </p>
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 md:p-6">
                <p className="text-xs md:text-sm text-gray-400 mb-2">💡 Pro Tip:</p>
                <p className="text-sm md:text-base text-gray-300">A complete profile gets 3x more session joins! People want to know who they'll be training with.</p>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col md:flex-row items-start gap-4 md:gap-8">
            <div className="flex-shrink-0 rounded-full bg-orange-500 flex items-center justify-center font-black text-white"
                 style={{ width: '4rem', height: '4rem', fontSize: '2rem', minWidth: '4rem', minHeight: '4rem' }}>
              2
            </div>
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 md:mb-4">Browse & Join Sessions</h2>
              <p className="text-sm md:text-lg text-gray-300 mb-3 md:mb-4 leading-relaxed">
                Explore upcoming training sessions in your area. Use filters to find sessions that match your schedule, 
                activity type, and intensity level. Check out the host's profile and see who else is joining.
              </p>
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 md:p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl md:text-2xl">🗺️</span>
                  <span className="text-sm md:text-base text-gray-300">Use Map View to find sessions near you</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl md:text-2xl">🔍</span>
                  <span className="text-sm md:text-base text-gray-300">Use Advanced Filters to narrow down by date, intensity, and location</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl md:text-2xl">👥</span>
                  <span className="text-sm md:text-base text-gray-300">Click on profiles to learn more about participants</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col md:flex-row items-start gap-4 md:gap-8">
            <div className="flex-shrink-0 rounded-full bg-orange-500 flex items-center justify-center font-black text-white"
                 style={{ width: '4rem', height: '4rem', fontSize: '2rem', minWidth: '4rem', minHeight: '4rem' }}>
              3
            </div>
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 md:mb-4">Create Your Own Session</h2>
              <p className="text-sm md:text-lg text-gray-300 mb-3 md:mb-4 leading-relaxed">
                Can't find a session that fits your schedule? Create your own! Choose your activity type, set the date, 
                time, and location. Add details like distance and intensity level. You'll be notified when people join.
              </p>
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 md:p-6">
                <p className="text-xs md:text-sm text-gray-400 mb-2">📧 Email Notifications:</p>
                <p className="text-sm md:text-base text-gray-300">You'll receive an email every time someone joins your session, so you always know who's coming!</p>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex flex-col md:flex-row items-start gap-4 md:gap-8">
            <div className="flex-shrink-0 rounded-full bg-orange-500 flex items-center justify-center font-black text-white"
                 style={{ width: '4rem', height: '4rem', fontSize: '2rem', minWidth: '4rem', minHeight: '4rem' }}>
              4
            </div>
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 md:mb-4">Chat & Coordinate</h2>
              <p className="text-sm md:text-lg text-gray-300 mb-3 md:mb-4 leading-relaxed">
                Once you've joined a session, access the group chat to coordinate with other participants. 
                Ask questions, share tips, or just get to know your training partners before the session.
              </p>
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 md:p-6">
                <p className="text-xs md:text-sm text-gray-400 mb-2">💬 Stay Updated:</p>
                <p className="text-sm md:text-base text-gray-300">Check the Notifications page to see all activity on your sessions - new messages, new participants, and more.</p>
              </div>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex flex-col md:flex-row items-start gap-4 md:gap-8">
            <div className="flex-shrink-0 rounded-full bg-orange-500 flex items-center justify-center font-black text-white"
                 style={{ width: '4rem', height: '4rem', fontSize: '2rem', minWidth: '4rem', minHeight: '4rem' }}>
              5
            </div>
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 md:mb-4">Show Up & Train!</h2>
              <p className="text-sm md:text-lg text-gray-300 mb-3 md:mb-4 leading-relaxed">
                Meet your training partners at the designated location and time. Have a great workout together! 
                Your session history is tracked in your Dashboard so you can see your progress over time.
              </p>
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 md:p-6">
                <p className="text-xs md:text-sm text-gray-400 mb-2">🏆 Build Your Stats:</p>
                <p className="text-sm md:text-base text-gray-300">Track all your hosted and joined sessions in your Dashboard. Watch your fitness community grow!</p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="border-t border-gray-800 pt-12 md:pt-16">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-6 md:mb-8 text-center">Frequently Asked Questions</h2>
          
          <div className="space-y-4 md:space-y-6 max-w-3xl mx-auto">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 md:p-6">
              <h3 className="text-lg md:text-xl font-bold text-white mb-2">Is Gruppetto free?</h3>
              <p className="text-sm md:text-base text-gray-300">Yes! Gruppetto is completely free to use. Create and join as many sessions as you want.</p>
            </div>

            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 md:p-6">
              <h3 className="text-lg md:text-xl font-bold text-white mb-2">What if I need to cancel?</h3>
              <p className="text-sm md:text-base text-gray-300">Simply click "Leave" on the session page. The host and other participants will be notified.</p>
            </div>

            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 md:p-6">
              <h3 className="text-lg md:text-xl font-bold text-white mb-2">How do I know if someone is reliable?</h3>
              <p className="text-sm md:text-base text-gray-300">Check their profile! You can see their fitness level, activities, and how many sessions they've hosted or joined.</p>
            </div>

            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 md:p-6">
              <h3 className="text-lg md:text-xl font-bold text-white mb-2">What areas does Gruppetto cover?</h3>
              <p className="text-sm md:text-base text-gray-300">Currently focused on South West London (Battersea, Clapham, Chelsea, Wandsworth, Richmond). Expanding soon!</p>
            </div>

            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 md:p-6">
              <h3 className="text-lg md:text-xl font-bold text-white mb-2">Can I bring a friend?</h3>
              <p className="text-sm md:text-base text-gray-300">Absolutely! Just make sure they sign up on Gruppetto and join the session so the host knows how many people to expect.</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 md:mt-16 text-center">
          {user ? (
            <button
              onClick={() => router.push('/browse')}
              className="px-8 md:px-12 py-3 md:py-4 bg-orange-500 text-white rounded-xl font-bold text-lg md:text-xl hover:bg-orange-600 transition w-full md:w-auto"
            >
              Browse Sessions
            </button>
          ) : (
            <button
              onClick={() => router.push('/')}
              className="px-8 md:px-12 py-3 md:py-4 bg-orange-500 text-white rounded-xl font-bold text-lg md:text-xl hover:bg-orange-600 transition w-full md:w-auto"
            >
              Get Started
            </button>
          )}
        </div>
      </div>
    </div>
  );
}