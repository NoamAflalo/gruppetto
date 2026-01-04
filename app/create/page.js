'use client';
import { useState, useEffect, useRef } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Navigation from '../components/navigation';
import LocationSelect from '../components/LocationSelect';
import Toast from '../components/Toast';

// Composant DatePicker avec calendrier
function DatePickerCalendar({ value, onChange, minDate, label, required }) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  const containerRef = useRef(null);

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (value) {
      setViewDate(new Date(value));
    }
  }, [value]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(viewDate);
  const adjustedStartDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

  const goToPreviousMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const goToNextMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const selectDay = (day) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const isDateDisabled = (day) => {
    if (!minDate) return false;
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateStr < minDate;
  };

  const isSelectedDate = (day) => {
    if (!value) return false;
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateStr === value;
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() &&
           viewDate.getMonth() === today.getMonth() &&
           viewDate.getFullYear() === today.getFullYear();
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return 'Select date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const calendarDays = [];
  for (let i = 0; i < adjustedStartDay; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const disabled = isDateDisabled(day);
    const selected = isSelectedDate(day);
    const today = isToday(day);

    calendarDays.push(
      <button
        key={day}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && selectDay(day)}
        className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
          selected
            ? 'bg-orange-500 text-white'
            : today
              ? 'bg-orange-500/20 text-orange-400 border border-orange-500'
              : disabled
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-gray-300 hover:bg-gray-700'
        }`}
      >
        {day}
      </button>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          {label} {required && '*'}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 md:p-4 bg-black border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-left flex items-center justify-between text-base"
      >
        <span className={value ? 'text-white' : 'text-gray-500'}>
          {formatDisplayDate(value)}
        </span>
        <span className="text-gray-400">📅</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-xl min-w-[280px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
            >
              ←
            </button>
            <span className="font-semibold text-white">
              {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <button
              type="button"
              onClick={goToNextMonth}
              className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
            >
              →
            </button>
          </div>

          {/* Days header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
              <div key={d} className="w-8 h-6 text-center text-xs text-gray-500 font-medium">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays}
          </div>

          {/* Today button */}
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              const todayStr = today.toISOString().split('T')[0];
              if (!minDate || todayStr >= minDate) {
                onChange(todayStr);
                setIsOpen(false);
              }
            }}
            className="w-full mt-3 py-2 text-sm text-orange-500 hover:text-orange-400 font-medium"
          >
            Today
          </button>
        </div>
      )}
    </div>
  );
}



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
      const response = await fetch('/api/generate-session', {
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
        await fetch('/api/send-notification', {
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

  const getActivityEmoji = (type) => {
    switch(type) {
      case 'running': return '🏃';
      case 'cycling': return '🚴';
      case 'swimming': return '🏊';
      default: return '💪';
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading...</div>;
  }

  const isUserFemale = userProfile?.gender === 'female';
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-black">
      <Navigation user={user} />
      
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">Create a Session</h1>
          <p className="text-gray-400 text-base md:text-lg">Organize your next training session</p>
        </div>

        {/* AI Generator Button */}
        <button
          type="button"
          onClick={() => setShowAIModal(true)}
          className="mb-6 w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-xl font-bold text-lg hover:from-purple-600 hover:to-pink-600 transition flex items-center justify-center gap-2"
        >
          ✨ Need inspiration? Ask Claude AI
        </button>

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl border border-gray-800 p-4 md:p-8 space-y-4 md:space-y-6">
          
          {/* Link to Club (Optional) */}
          {clubs.length > 0 && (
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-4 md:p-6">
              <label className="block text-sm font-semibold text-white mb-3">
                🏛️ Link to Club (Optional)
              </label>
              <select
                value={selectedClub}
                onChange={(e) => setSelectedClub(e.target.value)}
                className="w-full p-3 md:p-4 bg-black border border-purple-500/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-base"
              >
                <option value="">No club (Personal session)</option>
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>
                    {getActivityEmoji(club.activity_type)} {club.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-purple-400 mt-2">
                💡 Create this session for one of your clubs. Only clubs where you're an admin are shown.
              </p>
            </div>
          )}

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

          {/* Date and Time - Using custom pickers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <DatePickerCalendar
              label="Date"
              value={formData.date}
              onChange={(date) => setFormData({ ...formData, date })}
              minDate={todayStr}
              required={true}
            />
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Time *</label>
              <input
                type="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                onKeyDown={(e) => e.preventDefault()}
                onClick={(e) => e.target.showPicker?.()}
                className="w-full p-3 md:p-4 bg-black border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-base [color-scheme:dark] cursor-pointer"
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
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <p className="text-sm text-blue-400">
                💡 <strong>Tip:</strong> Add a destination if your session involves traveling (e.g., "Meet at City Hall → Run to Battersea Park")
              </p>
            </div>
          )}

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

          {/* Private Session Toggle */}
          <div className="bg-black rounded-xl p-4 md:p-6 border border-gray-700">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="isPrivate"
                checked={formData.isPrivate}
                onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
                className="mt-1 w-5 h-5 rounded border-gray-600 text-orange-500 focus:ring-orange-500 focus:ring-offset-gray-900"
              />
              <div className="flex-1">
                <label htmlFor="isPrivate" className="block text-base font-semibold text-white cursor-pointer">
                  🔒 Private Session (Request to Join)
                </label>
                <p className="text-sm text-gray-400 mt-1">
                  Perfect for run clubs! People can see your session but need your approval to join.
                </p>
              </div>
            </div>
          </div>

          {/* Girls Only Toggle (visible only for women) */}
          {isUserFemale && (
            <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/30 rounded-xl p-4 md:p-6">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="girlsOnly"
                  checked={formData.girlsOnly}
                  onChange={(e) => setFormData({ ...formData, girlsOnly: e.target.checked })}
                  className="mt-1 w-5 h-5 rounded border-pink-600 text-pink-500 focus:ring-pink-500 focus:ring-offset-gray-900"
                />
                <div className="flex-1">
                  <label htmlFor="girlsOnly" className="block text-base font-semibold text-white cursor-pointer">
                    👭 Girls Only Session
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
              className="w-full bg-orange-500 text-white py-3 md:py-4 rounded-xl font-bold text-base md:text-lg hover:bg-orange-600 transition"
            >
              {selectedClub ? 'Create Club Session' : 'Create Session'}
            </button>
          </div>
        </form>

        {/* AI Modal */}
        {showAIModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 md:p-8 max-w-2xl w-full">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">✨ AI Session Generator</h2>
              <p className="text-gray-400 mb-6">Describe what kind of session you want and Claude will create it for you!</p>
              
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Example: 'Fun interval session for beginners in Battersea Park' or 'Challenging hill repeats for advanced runners'"
                rows="4"
                className="w-full p-4 bg-black border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-6"
              />
              
              <div className="flex gap-3">
                <button
                  onClick={handleAIGenerate}
                  disabled={aiLoading}
                  className="flex-1 bg-purple-500 text-white py-3 rounded-xl font-bold hover:bg-purple-600 disabled:bg-gray-700 disabled:cursor-not-allowed transition"
                >
                  {aiLoading ? '✨ Generating...' : '✨ Generate Session'}
                </button>
                <button
                  onClick={() => {
                    setShowAIModal(false);
                    setAiPrompt('');
                  }}
                  className="px-6 py-3 bg-gray-800 text-white rounded-xl font-semibold hover:bg-gray-700 transition"
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