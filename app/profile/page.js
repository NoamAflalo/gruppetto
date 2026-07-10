'use client';
import { useState, useEffect, useRef } from 'react';
import { auth, db, storage } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Navigation from '../components/navigation';
import ActivityIcon from '../components/ActivityIcon';
import ImageLightbox from '../components/ImageLightbox';
import { BarChart3, Camera } from 'lucide-react';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  // STRAVA - États commentés
  // const [stravaConnected, setStravaConnected] = useState(false);
  // const [stravaData, setStravaData] = useState(null);
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    gender: '', // NOUVEAU
    fitnessLevel: '',
    activities: [],
    preferredPace: '',
    location: '',
    profileImage: '',
    // STRAVA - Champs commentés
    // stravaLink: '',
    // stravaId: '',
    // stravaVerified: false,
    // stravaUsername: '',
    goals: '',
    ratings: {
      running: 0,
      cycling: 0,
      swimming: 0,
    },
  });
  const [stats, setStats] = useState({
    sessionsJoined: 0,
    sessionsHosted: 0,
    memberSince: null,
  });
  const [saveMessage, setSaveMessage] = useState('');
  const fileInputRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        
        const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
        if (profileDoc.exists()) {
          const data = profileDoc.data();
          setFormData({
            ...data,
            ratings: data.ratings || { running: 0, cycling: 0, swimming: 0 },
          });
        }
      } else {
        router.push('/');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // STRAVA - Handle Strava OAuth callback - COMMENTÉ
  // useEffect(() => {
  //   if (typeof window === 'undefined') return;
  //   
  //   const params = new URLSearchParams(window.location.search);
  //   const stravaId = params.get('strava_id');
  //   const stravaUsername = params.get('strava_username');
  //   const stravaFirstname = params.get('strava_firstname');
  //   const stravaLastname = params.get('strava_lastname');
  //   const stravaError = params.get('strava_error');
  //
  //   if (stravaError) {
  //     alert('Strava connection failed. Please try again.');
  //     // Clean URL
  //     window.history.replaceState({}, '', '/profile');
  //     return;
  //   }
  //
  //   if (stravaId) {
  //     const data = {
  //       id: stravaId,
  //       username: stravaUsername,
  //       firstname: stravaFirstname,
  //       lastname: stravaLastname,
  //     };
  //     
  //     setStravaData(data);
  //     setStravaConnected(true);
  //     setFormData(prev => ({
  //       ...prev,
  //       stravaLink: `https://www.strava.com/athletes/${stravaId}`,
  //       stravaId: stravaId,
  //       stravaVerified: true,
  //       stravaUsername: stravaUsername,
  //     }));
  //
  //     // Clean URL
  //     window.history.replaceState({}, '', '/profile');
  //   }
  // }, []);

  // STRAVA - Check if Strava is already connected - COMMENTÉ
  // useEffect(() => {
  //   if (formData.stravaId && formData.stravaVerified) {
  //     setStravaConnected(true);
  //     setStravaData({
  //       id: formData.stravaId,
  //       username: formData.stravaUsername || '',
  //       firstname: formData.displayName || '',
  //     });
  //   }
  // }, [formData.stravaId, formData.stravaVerified, formData.stravaUsername, formData.displayName]);

  // Fetch user stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        // Get all sessions
        const sessionsRef = collection(db, 'sessions');
        const sessionsSnapshot = await getDocs(sessionsRef);

        let joined = 0;
        let hosted = 0;

        sessionsSnapshot.docs.forEach(docSnap => {
          const session = docSnap.data();
          if (session.host_user_id === user.uid) {
            hosted++;
          }
          if (session.participants?.includes(user.uid)) {
            joined++;
          }
        });

        // Get member since date
        const userDoc = await getDoc(doc(db, 'profiles', user.uid));
        const memberSince = userDoc.exists() && userDoc.data().updatedAt
          ? userDoc.data().updatedAt.toDate()
          : user.metadata.creationTime ? new Date(user.metadata.creationTime) : new Date();

        setStats({
          sessionsJoined: joined,
          sessionsHosted: hosted,
          memberSince: memberSince,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, [user]);

  const handleImageUpload = async (file) => {
    if (!file || !user) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    try {
      setUploading(true);

      const storageRef = ref(storage, `profile-images/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      setFormData({ ...formData, profileImage: downloadURL });
      setUploading(false);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image. Please try again.');
      setUploading(false);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImageUpload(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await setDoc(doc(db, 'profiles', user.uid), {
        ...formData,
        userId: user.uid,
        email: user.email,
        updatedAt: new Date(),
      });
      
      setSaveMessage('Profile saved successfully!');
      
      // Auto-scroll to top to see message
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Hide message after 5 seconds
      setTimeout(() => setSaveMessage(''), 5000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveMessage('Error saving profile. Please try again.');
      setTimeout(() => setSaveMessage(''), 5000);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleActivityToggle = (activity) => {
    setFormData({
      ...formData,
      activities: formData.activities.includes(activity)
        ? formData.activities.filter(a => a !== activity)
        : [...formData.activities, activity],
    });
  };

  const handleRatingChange = (activity, rating) => {
    setFormData({
      ...formData,
      ratings: {
        ...formData.ratings,
        [activity]: rating,
      },
    });
  };

  // STRAVA - handleConnectStrava - COMMENTÉ
  // const handleConnectStrava = () => {
  //   const clientId = '192146';
  //   const redirectUri = `${window.location.origin}/api/strava/callback`;
  //   const scope = 'read,activity:read';
  //   
  //   const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scope}`;
  //   
  //   window.location.href = authUrl;
  // };

  // STRAVA - handleDisconnectStrava - COMMENTÉ
  // const handleDisconnectStrava = () => {
  //   if (!confirm('Disconnect your Strava account?')) return;
  //   
  //   setStravaConnected(false);
  //   setStravaData(null);
  //   setFormData({
  //     ...formData,
  //     stravaLink: '',
  //     stravaId: '',
  //     stravaVerified: false,
  //     stravaUsername: '',
  //   });
  // };

  if (loading) {
    return (
      <div className="min-h-screen bg-ground">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-12 space-y-4">
          <div className="skeleton h-10 w-56" />
          <div className="skeleton h-32 rounded-2xl" />
          <div className="skeleton h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ground">
      <Navigation user={user} />
      
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="mb-6 md:mb-8">
          <h1 className="font-display uppercase text-4xl md:text-5xl text-ink mb-1.5">Your Profile</h1>
          <p className="text-muted text-base md:text-lg">Tell others about your fitness journey</p>
        </div>

        {saveMessage && (
          <div className={`mb-6 p-4 rounded-xl text-center font-semibold text-base md:text-lg animate-pulse ${
            saveMessage.includes('successfully') 
              ? 'bg-green-500/20 border-2 border-green-500 text-green-400' 
              : 'bg-red-500/20 border-2 border-red-500 text-red-400'
          }`}>
            {saveMessage}
          </div>
        )}

        {/* Stats Section */}
        <div className="bg-card rounded-2xl border border-line p-4 md:p-6 mb-6 md:mb-8">
          <h2 className="font-display uppercase text-xl md:text-2xl text-ink mb-4 flex items-center gap-2">
            <BarChart3 size={19} className="text-brand" /> Your Stats
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-ground rounded-xl p-4 border border-line">
              <div className="text-2xl md:text-3xl font-black text-brand mb-1">
                {stats.sessionsJoined}
              </div>
              <div className="text-xs md:text-sm text-muted">Sessions Joined</div>
            </div>
            
            <div className="bg-ground rounded-xl p-4 border border-line">
              <div className="text-2xl md:text-3xl font-black text-green-500 mb-1">
                {stats.sessionsHosted}
              </div>
              <div className="text-xs md:text-sm text-muted">Sessions Hosted</div>
            </div>
            
            <div className="bg-ground rounded-xl p-4 border border-line col-span-2 md:col-span-1">
              <div className="text-2xl md:text-3xl font-black text-ink mb-1">
                {stats.memberSince 
                  ? new Date(stats.memberSince).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
                  : '...'
                }
              </div>
              <div className="text-xs md:text-sm text-muted">Member Since</div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-line p-4 md:p-8 space-y-4 md:space-y-6">
          {/* Profile Image Upload */}
          <div>
            <label className="block text-sm font-semibold text-soft mb-3">Profile Photo</label>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {/* Click the photo to view it large; camera button changes it */}
            <div className="flex items-center gap-5">
              <div className="relative w-32 h-32 flex-none">
                {formData.profileImage ? (
                  <button
                    type="button"
                    onClick={() => setShowImageModal(true)}
                    className="block w-full h-full rounded-full overflow-hidden border-4 border-brand hover:opacity-90 transition"
                    title="View photo"
                  >
                    <img
                      src={formData.profileImage}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-full rounded-full bg-card2 flex flex-col items-center justify-center gap-1.5 border-4 border-line hover:border-brand transition"
                  >
                    <Camera size={26} className="text-muted" />
                    <span className="text-xs text-muted">Add Photo</span>
                  </button>
                )}
                {formData.profileImage && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0.5 right-0.5 bg-brand text-white rounded-full p-2 border-2 border-card hover:bg-brand-hover transition"
                    title="Change photo"
                    aria-label="Change photo"
                  >
                    <Camera size={14} />
                  </button>
                )}
              </div>

              <div className="flex-1">
                <p className="text-sm text-soft mb-1.5">
                  {formData.profileImage ? 'Click your photo to see it full size — the camera button swaps it' : 'Click to add a profile photo'}
                </p>
                <p className="text-xs text-muted">PNG, JPG, GIF or WebP (max 5MB)</p>
                {uploading && (
                  <p className="text-sm text-brand mt-2">Uploading…</p>
                )}
              </div>
            </div>

            {showImageModal && (
              <ImageLightbox
                src={formData.profileImage}
                alt="Profile photo"
                onClose={() => setShowImageModal(false)}
              />
            )}
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-semibold text-soft mb-2">Display Name *</label>
            <input
              type="text"
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
              placeholder="Your name"
              className="w-full p-3 md:p-4 bg-ground border border-line rounded-xl text-ink placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-brand text-base"
              required
            />
          </div>

          {/* NOUVEAU - Gender Selection */}
          <div>
            <label className="block text-sm font-semibold text-soft mb-3">Gender</label>
            <div className="grid grid-cols-2 gap-2 md:gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, gender: 'female' })}
                className={`p-3 md:p-4 rounded-xl border-2 font-semibold transition text-sm md:text-base ${
                  formData.gender === 'female'
                    ? 'bg-brand/10 border-brand text-ink'
                    : 'bg-ground border-line text-soft hover:border-brand/40'
                }`}
              >
                Female
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, gender: 'male' })}
                className={`p-3 md:p-4 rounded-xl border-2 font-semibold transition text-sm md:text-base ${
                  formData.gender === 'male'
                    ? 'bg-brand/10 border-brand text-ink'
                    : 'bg-ground border-line text-soft hover:border-brand/40'
                }`}
              >
                Male
              </button>
            </div>
            <p className="text-xs text-muted mt-2">
              Required to access certain features like creating "Girls Only" sessions
            </p>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-semibold text-soft mb-2">Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell us about yourself..."
              rows="4"
              className="w-full p-3 md:p-4 bg-ground border border-line rounded-xl text-ink placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-brand text-base"
            />
          </div>

          {/* Training Goals */}
          <div>
            <label className="block text-sm font-semibold text-soft mb-2">Training Goals</label>
            <textarea
              name="goals"
              value={formData.goals}
              onChange={handleChange}
              placeholder="e.g., Training for London Marathon 2025, Sub-20 5K, First triathlon..."
              rows="3"
              className="w-full p-3 md:p-4 bg-ground border border-line rounded-xl text-ink placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-brand text-base"
            />
            <p className="text-xs text-muted mt-2">Let others know what you're working towards!</p>
          </div>

          {/* STRAVA - Strava Connection Section - COMMENTÉ */}
          {/* <div>
            <label className="block text-sm font-semibold text-soft mb-2">Strava Profile</label>
            
            {stravaConnected ? (
              <div className="bg-ground rounded-xl border border-green-500/30 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#fc4c02">
                      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
                    </svg>
                    <div>
                      <p className="text-ink font-semibold flex items-center gap-2">
                        Connected to Strava
                        <span className="text-green-400">✓</span>
                      </p>
                      <p className="text-sm text-muted">
                        {stravaData?.firstname} {stravaData?.lastname}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDisconnectStrava}
                    className="text-sm text-red-400 hover:text-red-300 transition"
                  >
                    Disconnect
                  </button>
                </div>
                <a 
                  href={formData.stravaLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-hover to-red-600 text-ink rounded-xl font-semibold hover:from-orange-700 hover:to-red-700 transition text-sm md:text-base"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
                  </svg>
                  View My Strava Profile
                </a>
              </div>
            ) : (
              <div className="bg-ground rounded-xl border border-line p-4">
                <p className="text-muted text-sm mb-3">
                  Connect your Strava account to verify your profile and show your real activities.
                </p>
                <button
                  type="button"
                  onClick={handleConnectStrava}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-hover to-red-600 text-ink rounded-xl font-semibold hover:from-orange-700 hover:to-red-700 transition text-sm md:text-base"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
                  </svg>
                  Connect Strava Account
                </button>
              </div>
            )}
          </div> */}

          {/* Fitness Level */}
          <div>
            <label className="block text-sm font-semibold text-soft mb-3">Fitness Level</label>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {['beginner', 'intermediate', 'advanced'].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setFormData({ ...formData, fitnessLevel: level })}
                  className={`p-3 md:p-4 rounded-xl border-2 font-semibold capitalize transition text-sm md:text-base ${
                    formData.fitnessLevel === level
                      ? 'bg-brand border-brand text-white'
                      : 'bg-ground border-line text-soft hover:border-brand/40'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Activities */}
          <div>
            <label className="block text-sm font-semibold text-soft mb-3">Activities</label>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {['running', 'cycling', 'swimming'].map((activity) => (
                <button
                  key={activity}
                  type="button"
                  onClick={() => handleActivityToggle(activity)}
                  className={`p-3 md:p-4 rounded-xl border-2 font-semibold capitalize transition text-sm md:text-base ${
                    formData.activities.includes(activity)
                      ? 'bg-brand/10 border-brand text-ink'
                      : 'bg-ground border-line text-soft hover:border-brand/40'
                  }`}
                >
                  <ActivityIcon
                    type={activity}
                    size={16}
                    className={`inline -mt-0.5 mr-1.5 ${formData.activities.includes(activity) ? 'text-brand' : 'text-muted'}`}
                  />
                  {activity}
                </button>
              ))}
            </div>
          </div>

          {/* Skill Ratings */}
          <div>
            <label className="block text-sm font-semibold text-soft mb-3">Rate Your Skills</label>
            <p className="text-xs text-muted mb-4">
              Help us recommend the right sessions for you. Rate yourself honestly from 1 (beginner) to 5 (expert).
            </p>
            
            <div className="space-y-4">
              {['running', 'cycling', 'swimming'].map((activity) => (
                <div key={activity} className="bg-ground rounded-xl p-4 border border-line">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm md:text-base text-ink font-semibold capitalize inline-flex items-center gap-2">
                      <ActivityIcon type={activity} size={16} className="text-brand" /> {activity}
                    </span>
                    <span className="text-brand font-bold">{formData.ratings[activity]}/5</span>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => handleRatingChange(activity, rating)}
                        className={`flex-1 py-2 rounded-lg font-semibold transition text-sm ${
                          formData.ratings[activity] >= rating
                            ? 'bg-brand text-white'
                            : 'bg-card2 text-muted hover:text-soft'
                        }`}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 bg-brand/5 border border-brand/20 rounded-lg p-3">
              <p className="text-xs md:text-sm text-soft">
                <strong>Tip:</strong> 1-2 = Beginner | 3 = Intermediate | 4-5 = Advanced
              </p>
            </div>
          </div>

          {/* Preferred Pace */}
          <div>
            <label className="block text-sm font-semibold text-soft mb-2">Preferred Running Pace</label>
            <input
              type="text"
              name="preferredPace"
              value={formData.preferredPace}
              onChange={handleChange}
              placeholder="e.g., 5:30 min/km, 9:00 min/mile"
              className="w-full p-3 md:p-4 bg-ground border border-line rounded-xl text-ink placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-brand text-base"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-semibold text-soft mb-2">Location</label>
            <select
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full p-3 md:p-4 bg-ground border border-line rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-brand text-base"
            >
              <option value="">Select your area</option>
              <option value="Battersea">Battersea</option>
              <option value="Clapham">Clapham</option>
              <option value="Chelsea">Chelsea</option>
              <option value="Wandsworth">Wandsworth</option>
              <option value="Richmond">Richmond</option>
              <option value="Other SW London">Other SW London</option>
            </select>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={uploading}
              className="w-full bg-brand text-white py-3 md:py-4 rounded-xl font-bold text-base md:text-lg hover:bg-brand-hover disabled:bg-card2 disabled:cursor-not-allowed transition"
            >
              {uploading ? 'Uploading...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}