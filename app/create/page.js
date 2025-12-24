'use client';
import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Navigation from '../components/navigation';

export default function CreateSession() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    activity_type: 'running',
    date: '',
    time: '',
    location: '',
    intensity: 'moderate',
    distance: '',
    max_participants: '',
  });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate date is not in the past
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      alert('You cannot create a session in the past');
      return;
    }
    
    try {
      await addDoc(collection(db, 'sessions'), {
        ...formData,
        host_user_id: user.uid,
        host_email: user.email,
        participants: [user.uid],
        created_at: serverTimestamp(),
      });

      // Send confirmation email
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'session_created',
            to: user.email,
            data: {
              sessionTitle: formData.title,
              date: formData.date,
              time: formData.time,
              location: formData.location,
            },
          }),
        });
      } catch (emailError) {
        console.error('Email error:', emailError);
      }
      
      router.push('/browse');
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Error creating session. Please try again.');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation user={user} />
      
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">Create a Session</h1>
          <p className="text-gray-400 text-base md:text-lg">Organize your next training session</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl border border-gray-800 p-4 md:p-8 space-y-4 md:space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Session Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Morning 10K Run"
              className="w-full p-3 md:p-4 bg-black border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-base"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Tell people about your session..."
              rows="4"
              className="w-full p-3 md:p-4 bg-black border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-base"
              required
            />
          </div>

          {/* Activity Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-3">Activity Type *</label>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, activity_type: 'running' })}
                className={`p-3 md:p-4 rounded-xl border-2 font-semibold transition ${
                  formData.activity_type === 'running'
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'bg-black border-gray-700 text-gray-300 hover:border-gray-600'
                }`}
              >
                <div className="text-2xl md:text-3xl mb-1">🏃</div>
                <div className="text-xs md:text-sm">Running</div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, activity_type: 'cycling' })}
                className={`p-3 md:p-4 rounded-xl border-2 font-semibold transition ${
                  formData.activity_type === 'cycling'
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'bg-black border-gray-700 text-gray-300 hover:border-gray-600'
                }`}
              >
                <div className="text-2xl md:text-3xl mb-1">🚴</div>
                <div className="text-xs md:text-sm">Cycling</div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, activity_type: 'swimming' })}
                className={`p-3 md:p-4 rounded-xl border-2 font-semibold transition ${
                  formData.activity_type === 'swimming'
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'bg-black border-gray-700 text-gray-300 hover:border-gray-600'
                }`}
              >
                <div className="text-2xl md:text-3xl mb-1">🏊</div>
                <div className="text-xs md:text-sm">Swimming</div>
              </button>
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Date *</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className="w-full p-3 md:p-4 bg-black border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-base"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Time *</label>
              <input
                type="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                className="w-full p-3 md:p-4 bg-black border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-base"
                required
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Location *</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g., Battersea Park"
              className="w-full p-3 md:p-4 bg-black border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-base"
              required
            />
          </div>

          {/* Intensity */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-3">Intensity *</label>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, intensity: 'easy' })}
                className={`p-3 md:p-4 rounded-xl border-2 font-semibold capitalize transition text-sm md:text-base ${
                  formData.intensity === 'easy'
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'bg-black border-gray-700 text-gray-300 hover:border-gray-600'
                }`}
              >
                Easy
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, intensity: 'moderate' })}
                className={`p-3 md:p-4 rounded-xl border-2 font-semibold capitalize transition text-sm md:text-base ${
                  formData.intensity === 'moderate'
                    ? 'bg-yellow-500 border-yellow-500 text-white'
                    : 'bg-black border-gray-700 text-gray-300 hover:border-gray-600'
                }`}
              >
                Moderate
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, intensity: 'hard' })}
                className={`p-3 md:p-4 rounded-xl border-2 font-semibold capitalize transition text-sm md:text-base ${
                  formData.intensity === 'hard'
                    ? 'bg-red-500 border-red-500 text-white'
                    : 'bg-black border-gray-700 text-gray-300 hover:border-gray-600'
                }`}
              >
                Hard
              </button>
            </div>
          </div>

          {/* Distance and Max Participants */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Distance (optional)</label>
              <input
                type="text"
                name="distance"
                value={formData.distance}
                onChange={handleChange}
                placeholder="e.g., 10km"
                className="w-full p-3 md:p-4 bg-black border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Max Participants (optional)</label>
              <input
                type="number"
                name="max_participants"
                value={formData.max_participants}
                onChange={handleChange}
                placeholder="No limit"
                min="1"
                className="w-full p-3 md:p-4 bg-black border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-base"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              className="w-full bg-orange-500 text-white py-3 md:py-4 rounded-xl font-bold text-base md:text-lg hover:bg-orange-600 transition"
            >
              Create Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}