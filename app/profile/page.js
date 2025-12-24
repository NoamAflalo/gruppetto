'use client';
import { useState, useEffect, useRef } from 'react';
import { auth, db, storage } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Navigation from '../components/navigation';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    fitnessLevel: '',
    activities: [],
    preferredPace: '',
    location: '',
    profileImage: '',
    stravaLink: '',
  });
  const [saveMessage, setSaveMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        
        const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
        if (profileDoc.exists()) {
          setFormData(profileDoc.data());
        }
      } else {
        router.push('/');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

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

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
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
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error saving profile. Please try again.');
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation user={user} />
      
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">Your Profile</h1>
          <p className="text-gray-400 text-base md:text-lg">Tell others about your fitness journey</p>
        </div>

        {saveMessage && (
          <div className="mb-4 md:mb-6 bg-green-500/10 border border-green-500/30 text-green-400 p-3 md:p-4 rounded-xl text-sm md:text-base">
            {saveMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl border border-gray-800 p-4 md:p-8 space-y-4 md:space-y-6">
          {/* Profile Image Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-3">Profile Photo</label>
            
            {/* Current Image Preview */}
            {formData.profileImage && (
              <>
                <div className="mb-4 flex justify-center">
                  <img 
                    src={formData.profileImage} 
                    alt="Profile" 
                    className="rounded-full object-cover border-4 border-orange-500 cursor-pointer hover:opacity-80 transition"
                    style={{ width: '8rem', height: '8rem', minWidth: '8rem', minHeight: '8rem' }}
                    onClick={() => setShowImageModal(true)}
                  />
                </div>

                {/* Image Modal */}
                {showImageModal && (
                  <div 
                    className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                    onClick={() => setShowImageModal(false)}
                  >
                    <div className="relative max-w-4xl max-h-[90vh]">
                      <button
                        onClick={() => setShowImageModal(false)}
                        className="absolute top-4 right-4 text-white text-4xl hover:text-orange-500 transition z-10"
                      >
                        ×
                      </button>
                      <img 
                        src={formData.profileImage} 
                        alt="Profile" 
                        className="max-w-full max-h-[90vh] object-contain rounded-xl"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Drag & Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-6 md:p-8 text-center transition ${
                dragActive 
                  ? 'border-orange-500 bg-orange-500/10' 
                  : 'border-gray-700 bg-black hover:border-gray-600'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {uploading ? (
                <div className="text-orange-500">
                  <div className="text-3xl md:text-4xl mb-2">⏳</div>
                  <p className="text-sm md:text-base">Uploading...</p>
                </div>
              ) : (
                <>
                  <div className="text-3xl md:text-4xl mb-2">📸</div>
                  <p className="text-gray-300 mb-2 text-sm md:text-base">Drag and drop your photo here, or</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 md:px-6 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition text-sm md:text-base"
                  >
                    Choose File
                  </button>
                  <p className="text-xs text-gray-500 mt-2">PNG, JPG, GIF or WebP (max 5MB)</p>
                </>
              )}
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Display Name *</label>
            <input
              type="text"
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
              placeholder="Your name"
              className="w-full p-3 md:p-4 bg-black border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-base"
              required
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell us about yourself..."
              rows="4"
              className="w-full p-3 md:p-4 bg-black border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-base"
            />
          </div>

          {/* Strava Link */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Strava Profile Link</label>
            <input
              type="url"
              name="stravaLink"
              value={formData.stravaLink}
              onChange={handleChange}
              placeholder="https://www.strava.com/athletes/..."
              className="w-full p-3 md:p-4 bg-black border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-base"
            />
            {formData.stravaLink && (
              <a 
                href={formData.stravaLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs md:text-sm text-orange-500 hover:text-orange-400 mt-2 inline-block"
              >
                View on Strava →
              </a>
            )}
          </div>

          {/* Fitness Level */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-3">Fitness Level</label>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {['beginner', 'intermediate', 'advanced'].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setFormData({ ...formData, fitnessLevel: level })}
                  className={`p-3 md:p-4 rounded-xl border-2 font-semibold capitalize transition text-sm md:text-base ${
                    formData.fitnessLevel === level
                      ? 'bg-orange-500 border-orange-500 text-white'
                      : 'bg-black border-gray-700 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Activities */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-3">Activities</label>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {['running', 'cycling', 'swimming'].map((activity) => (
                <button
                  key={activity}
                  type="button"
                  onClick={() => handleActivityToggle(activity)}
                  className={`p-3 md:p-4 rounded-xl border-2 font-semibold capitalize transition text-sm md:text-base ${
                    formData.activities.includes(activity)
                      ? 'bg-orange-500 border-orange-500 text-white'
                      : 'bg-black border-gray-700 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  {activity === 'running' && '🏃 '}
                  {activity === 'cycling' && '🚴 '}
                  {activity === 'swimming' && '🏊 '}
                  {activity}
                </button>
              ))}
            </div>
          </div>

          {/* Preferred Pace */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Preferred Running Pace</label>
            <input
              type="text"
              name="preferredPace"
              value={formData.preferredPace}
              onChange={handleChange}
              placeholder="e.g., 5:30 min/km, 9:00 min/mile"
              className="w-full p-3 md:p-4 bg-black border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-base"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Location</label>
            <select
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full p-3 md:p-4 bg-black border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-base"
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
              className="w-full bg-orange-500 text-white py-3 md:py-4 rounded-xl font-bold text-base md:text-lg hover:bg-orange-600 disabled:bg-gray-700 disabled:cursor-not-allowed transition"
            >
              {uploading ? 'Uploading...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}