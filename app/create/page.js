'use client';
import { useState, useEffect, useRef } from 'react';
import { auth, db } from '@/lib/firebase';
import { authedFetch } from '@/lib/api';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Navigation from '../components/navigation';
import LocationSelect from '../components/LocationSelect';
import Toast from '../components/Toast';
import DatePickerCalendar from '../components/DatePickerCalendar';
import ActivityIcon from '../components/ActivityIcon';
import { Sparkles, Lock } from 'lucide-react';

export default function CreateSession() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    activity_type: 'running',
    date: '',
    time: '',
    meetingPoint: '',
    destination: '',
    intensity: 'moderate',
    distance: '',
    max_participants: '',
    isPrivate: false,
    girlsOnly: false,
  });
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        
        try {
          const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
          if (profileDoc.exists()) {
            setUserProfile(profileDoc.data());
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        router.push('/');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // Fetch clubs where user is admin
  useEffect(() => {
    const fetchMyClubs = async () => {
      if (!user) return;

      try {
        const clubsQuery = query(
          collection(db, 'clubs'),
          where('status', '==', 'approved')
        );
        const snapshot = await getDocs(clubsQuery);
        
        const myAdminClubs = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(club => 
            club.founder_id === user.uid || club.admins?.includes(user.uid)
          );
        
        setClubs(myAdminClubs);
      } catch (error) {
        console.error('Error fetching clubs:', error);
      }
    };

    fetchMyClubs();
  }, [user]);

  // Reset time when date changes to today (to clear potentially invalid past times)
  useEffect(() => {
    if (formData.date && formData.time) {
      const today = new Date().toISOString().split('T')[0];
      if (formData.date === today) {
        const now = new Date();
        const [hours, minutes] = formData.time.split(':').map(Number);
        const selectedTime = new Date();
        selectedTime.setHours(hours, minutes, 0, 0);
        
        if (selectedTime <= now) {
          setFormData(prev => ({ ...prev, time: '' }));
        }
      }
    }
  }, [formData.date]);

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      setToast({ message: 'Please describe what kind of session you want', type: 'warning' });
      return;
    }

    setAiLoading(true);
    
    try {
      const response = await authedFetch('/api/generate-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt }),
      });

      const data = await response.json();
      
      if (data.error) {
        setToast({ message: 'Error generating session', type: 'error' });
        return;
      }

      setFormData({
        ...formData,
        title: data.title,
        description: data.description,
        distance: data.distance,
        intensity: data.intensity,
      });

      setShowAIModal(false);
      setAiPrompt('');
      setToast({ message: 'Session generated successfully!', type: 'success' });
      
    } catch (error) {
      console.error('Error:', error);
      setToast({ message: 'Error generating session', type: 'error' });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation date et heure
    if (!formData.date) {
      setToast({ message: 'Please select a date', type: 'error' });
      return;
    }
    
    if (!formData.time) {
      setToast({ message: 'Please select a time', type: 'error' });
      return;
    }
    
    const sessionDateTime = new Date(`${formData.date}T${formData.time}`);
    const now = new Date();

    if (sessionDateTime < now) {
      setToast({ 
        message: '⚠️ Cannot create a session in the past! Please select a future date and time.', 
        type: 'error' 
      });
      return;
    }
    
    if (!formData.meetingPoint || formData.meetingPoint.trim() === '') {
      setToast({ message: 'Please select a meeting point', type: 'error' });
      return;
    }
    
    try {
      const locationDisplay = formData.destination 
        ? `${formData.meetingPoint} → ${formData.destination}`
        : formData.meetingPoint;

      const sessionData = {
        title: formData.title,
        description: formData.description,
        activity_type: formData.activity_type,
        date: formData.date,
        time: formData.time,
        location: locationDisplay,
        meetingPoint: formData.meetingPoint,
        destination: formData.destination || '',
        intensity: formData.intensity,
        distance: formData.distance,
        max_participants: formData.max_participants,
        isPrivate: formData.isPrivate,
        girlsOnly: formData.girlsOnly,
        host_user_id: user.uid,
        host_email: user.email,
        participants: [user.uid],
        created_at: serverTimestamp(),
      };

      if (selectedClub) {
        sessionData.club_id = selectedClub;
        sessionData.is_club_session = true;
      }

      if (formData.isPrivate) {
        sessionData.joinRequests = [];
      }

      const docRef = await addDoc(collection(db, 'sessions'), sessionData);

      try {
        await authedFetch('/api/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'session_created',
            to: user.email,
            data: {
              sessionId: docRef.id,
              sessionTitle: formData.title,
              date: formData.date,
              time: formData.time,
              location: locationDisplay,
            },
          }),
        });
      } catch (emailError) {
        console.error('Email error:', emailError);
      }
      
      setToast({ message: 'Session created successfully!', type: 'success' });
      
      if (selectedClub) {
        setTimeout(() => router.push(`/club/${selectedClub}`), 1500);
      } else {
        setTimeout(() => router.push('/browse'), 1500);
      }
    } catch (error) {
      console.error('Error creating session:', error);
      setToast({ message: 'Error creating session. Please try again.', type: 'error' });
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ground">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-12 space-y-4">
          <div className="skeleton h-10 w-64" />
          <div className="skeleton h-14 rounded-xl" />
          <div className="skeleton h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  const isUserFemale = userProfile?.gender === 'female';
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-ground">
      <Navigation user={user} />
      
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="mb-6 md:mb-8">
          <h1 className="font-display uppercase text-4xl md:text-5xl text-ink mb-1.5">Create a Session</h1>
          <p className="text-muted text-base md:text-lg">Organize your next training session</p>
        </div>

        {/* AI Generator Button */}
        <button
          type="button"
          onClick={() => setShowAIModal(true)}
          className="mb-6 w-full bg-gradient-to-r from-brand to-brand-hover text-white py-4 rounded-xl font-bold text-lg hover:from-brand-hover hover:to-brand-hover transition flex items-center justify-center gap-2"
        >
          <Sparkles size={19} /> Need inspiration? Ask Claude AI
        </button>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-line p-4 md:p-8 space-y-4 md:space-y-6">
          
          {/* Link to Club (Optional) */}
          {clubs.length > 0 && (
            <div className="bg-gradient-to-r from-brand/10 to-brand/5 border border-brand/25 rounded-xl p-4 md:p-6">
              <label className="block text-sm font-semibold text-ink mb-3">
                Link to Club (Optional)
              </label>
              <select
                value={selectedClub}
                onChange={(e) => setSelectedClub(e.target.value)}
                className="w-full p-3 md:p-4 bg-ground border border-brand/50 rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-brand text-base"
              >
                <option value="">No club (Personal session)</option>
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-brand-soft mt-2">
                Create this session for one of your clubs. Only clubs where you're an admin are shown.
              </p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-soft mb-2">Session Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Morning 10K Run"
              className="w-full p-3 md:p-4 bg-ground border border-line rounded-xl text-ink placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-brand text-base"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-soft mb-2">Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Tell people about your session..."
              rows="4"
              className="w-full p-3 md:p-4 bg-ground border border-line rounded-xl text-ink placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-brand text-base"
              required
            />
          </div>

          {/* Activity Type */}
          <div>
            <label className="block text-sm font-semibold text-soft mb-3">Activity Type *</label>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {['running', 'cycling', 'swimming'].map((activity) => {
                const active = formData.activity_type === activity;
                return (
                  <button
                    key={activity}
                    type="button"
                    onClick={() => setFormData({ ...formData, activity_type: activity })}
                    className={`p-3 md:p-4 rounded-xl border font-semibold transition flex flex-col items-center gap-2 ${
                      active
                        ? 'bg-brand/10 border-brand text-ink'
                        : 'bg-ground border-line text-soft hover:border-brand/40'
                    }`}
                  >
                    <ActivityIcon type={activity} size={24} className={active ? 'text-brand' : 'text-muted'} />
                    <div className="text-xs md:text-sm capitalize">{activity}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date and Time - Using custom pickers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <DatePickerCalendar
              size="lg"
              label="Date"
              value={formData.date}
              onChange={(date) => setFormData({ ...formData, date })}
              minDate={todayStr}
              required={true}
            />
            <div>
              <label className="block text-sm font-semibold text-soft mb-2">Time *</label>
              <input
                type="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                onKeyDown={(e) => e.preventDefault()}
                onClick={(e) => e.target.showPicker?.()}
                className="w-full p-3 md:p-4 bg-ground border border-line rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-brand text-base [color-scheme:dark] cursor-pointer"
                required
              />
            </div>
          </div>

          {/* Meeting Point & Destination */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <LocationSelect
              label="Meeting Point"
              value={formData.meetingPoint}
              onChange={(value) => setFormData({ ...formData, meetingPoint: value })}
              required={true}
              activityType={formData.activity_type}
            />
            
            {formData.activity_type !== 'swimming' && (
              <LocationSelect
                label="Destination (optional)"
                value={formData.destination}
                onChange={(value) => setFormData({ ...formData, destination: value })}
                required={false}
                activityType={formData.activity_type}
              />
            )}
          </div>

          {formData.activity_type !== 'swimming' && (
            <div className="bg-brand/5 border border-brand/20 rounded-xl p-4">
              <p className="text-sm text-soft">
                💡 <strong>Tip:</strong> Add a destination if your session involves traveling (e.g., "Meet at City Hall → Run to Battersea Park")
              </p>
            </div>
          )}

          {/* Intensity */}
          <div>
            <label className="block text-sm font-semibold text-soft mb-3">Intensity *</label>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, intensity: 'easy' })}
                className={`p-3 md:p-4 rounded-xl border-2 font-semibold capitalize transition text-sm md:text-base ${
                  formData.intensity === 'easy'
                    ? 'bg-green-500 border-green-500 text-ink'
                    : 'bg-ground border-line text-soft hover:border-brand/40'
                }`}
              >
                Easy
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, intensity: 'moderate' })}
                className={`p-3 md:p-4 rounded-xl border-2 font-semibold capitalize transition text-sm md:text-base ${
                  formData.intensity === 'moderate'
                    ? 'bg-yellow-500 border-yellow-500 text-ink'
                    : 'bg-ground border-line text-soft hover:border-brand/40'
                }`}
              >
                Moderate
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, intensity: 'hard' })}
                className={`p-3 md:p-4 rounded-xl border-2 font-semibold capitalize transition text-sm md:text-base ${
                  formData.intensity === 'hard'
                    ? 'bg-red-500 border-red-500 text-ink'
                    : 'bg-ground border-line text-soft hover:border-brand/40'
                }`}
              >
                Hard
              </button>
            </div>
          </div>

          {/* Distance and Max Participants */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="block text-sm font-semibold text-soft mb-2">Distance (optional)</label>
              <input
                type="text"
                name="distance"
                value={formData.distance}
                onChange={handleChange}
                placeholder="e.g., 10km"
                className="w-full p-3 md:p-4 bg-ground border border-line rounded-xl text-ink placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-brand text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-soft mb-2">Max Participants (optional)</label>
              <input
                type="number"
                name="max_participants"
                value={formData.max_participants}
                onChange={handleChange}
                placeholder="No limit"
                min="1"
                className="w-full p-3 md:p-4 bg-ground border border-line rounded-xl text-ink placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-brand text-base"
              />
            </div>
          </div>

          {/* Private Session Toggle */}
          <div className="bg-ground rounded-xl p-4 md:p-6 border border-line">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="isPrivate"
                checked={formData.isPrivate}
                onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
                className="mt-1 w-5 h-5 rounded border-line text-brand focus:ring-brand focus:ring-offset-card"
              />
              <div className="flex-1">
                <label htmlFor="isPrivate" className="block text-base font-semibold text-ink cursor-pointer">
                  <Lock size={15} className="inline -mt-0.5 mr-1.5 text-muted" />
                  Private Session (Request to Join)
                </label>
                <p className="text-sm text-muted mt-1">
                  Perfect for run clubs! People can see your session but need your approval to join.
                </p>
              </div>
            </div>
          </div>

          {/* Girls Only Toggle (visible only for women) */}
          {isUserFemale && (
            <div className="bg-pink-500/5 border border-pink-500/25 rounded-xl p-4 md:p-6">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="girlsOnly"
                  checked={formData.girlsOnly}
                  onChange={(e) => setFormData({ ...formData, girlsOnly: e.target.checked })}
                  className="mt-1 w-5 h-5 rounded border-pink-600 text-pink-500 focus:ring-pink-500 focus:ring-offset-card"
                />
                <div className="flex-1">
                  <label htmlFor="girlsOnly" className="block text-base font-semibold text-ink cursor-pointer">
                    Girls Only Session
                  </label>
                  <p className="text-sm text-pink-400 mt-1">
                    Only women will be able to join this session. Perfect for creating a safe and supportive environment!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              className="w-full bg-brand text-ink py-3 md:py-4 rounded-xl font-bold text-base md:text-lg hover:bg-brand-hover transition"
            >
              {selectedClub ? 'Create Club Session' : 'Create Session'}
            </button>
          </div>
        </form>

        {/* AI Modal */}
        {showAIModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl border border-line p-6 md:p-8 max-w-2xl w-full">
              <h2 className="font-display uppercase text-2xl md:text-3xl text-ink mb-4 flex items-center gap-2.5">
                <Sparkles size={24} className="text-brand" /> AI Session Generator
              </h2>
              <p className="text-muted mb-6">Describe what kind of session you want and Claude will create it for you!</p>
              
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Example: 'Fun interval session for beginners in Battersea Park' or 'Challenging hill repeats for advanced runners'"
                rows="4"
                className="w-full p-4 bg-ground border border-line rounded-xl text-ink placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-brand mb-6"
              />
              
              <div className="flex gap-3">
                <button
                  onClick={handleAIGenerate}
                  disabled={aiLoading}
                  className="flex-1 bg-brand text-ink py-3 rounded-xl font-bold hover:bg-brand-hover disabled:bg-card2 disabled:cursor-not-allowed transition"
                >
                  {aiLoading ? 'Generating…' : 'Generate Session'}
                </button>
                <button
                  onClick={() => {
                    setShowAIModal(false);
                    setAiPrompt('');
                  }}
                  className="px-6 py-3 bg-card2 text-ink rounded-xl font-semibold hover:bg-card2 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast Notifications */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  );
}