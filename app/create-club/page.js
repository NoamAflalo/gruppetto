'use client';
import { useState, useEffect } from 'react';
import { auth, db, storage } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Navigation from '../components/navigation';
import { toast } from 'react-hot-toast';

export default function CreateClub() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasExistingClub, setHasExistingClub] = useState(false);
  const [coverImage, setCoverImage] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    activity_type: 'running',
    location: '',
    description: '',
  });
  
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        
        // Check if user already has a club
        const clubsQuery = query(
          collection(db, 'clubs'),
          where('founder_id', '==', user.uid)
        );
        const clubsSnapshot = await getDocs(clubsQuery);
        setHasExistingClub(!clubsSnapshot.empty);
      } else {
        router.push('/');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverImage(file);
      setCoverImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.location || !formData.description) {
      toast.error('Please fill in all fields');
      return;
    }

    setSubmitting(true);

    try {
      let coverImageUrl = '';
      
      // Upload cover image if provided
      if (coverImage) {
        const imageRef = ref(storage, `clubs/${user.uid}/${Date.now()}_${coverImage.name}`);
        await uploadBytes(imageRef, coverImage);
        coverImageUrl = await getDownloadURL(imageRef);
      }

      // Create club
      await addDoc(collection(db, 'clubs'), {
        ...formData,
        coverImage: coverImageUrl,
        founder_id: user.uid,
        founder_email: user.email,
        admins: [user.uid],
        members: [user.uid],
        member_count: 1,
        status: 'pending', // pending, approved, rejected
        isFeatured: false,
        created_at: new Date(),
      });

      toast.success('Club created! Waiting for approval.');
      router.push('/dashboard');
      
    } catch (error) {
      console.error('Error creating club:', error);
      toast.error('Error creating club. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading...</div>;
  }

  if (hasExistingClub) {
    return (
      <div className="min-h-screen bg-black">
        <Navigation user={user} />
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-12 text-center">
          <h1 className="text-3xl font-black text-white mb-4">Club Limit Reached</h1>
          <p className="text-gray-400 mb-8">You can only create 1 club per account.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation user={user} />
      
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">Create a Club</h1>
          <p className="text-gray-400 text-base md:text-lg">Build your training community</p>
        </div>

        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6">
          <p className="text-orange-400 text-sm">
            ℹ️ Your club will be reviewed before being published. You'll be notified once it's approved.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl border border-gray-800 p-6 md:p-8">
          {/* Club Name */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Club Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Clapham Runners"
              className="w-full p-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          {/* Activity Type */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Activity Type *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['running', 'cycling', 'swimming'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, activity_type: type })}
                  className={`p-4 rounded-xl border-2 font-semibold capitalize transition ${
                    formData.activity_type === type
                      ? 'bg-orange-500 border-orange-500 text-white'
                      : 'bg-black border-gray-700 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  {type === 'running' ? '🏃' : type === 'cycling' ? '🚴' : '🏊'} {type}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Main Location *
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Clapham Common, London"
              className="w-full p-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your club, who can join, what to expect..."
              rows={6}
              className="w-full p-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          {/* Cover Image */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Cover Image (Optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full p-3 bg-black border border-gray-700 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-orange-500 file:text-white hover:file:bg-orange-600 file:cursor-pointer"
            />
            {coverImagePreview && (
              <div className="mt-4">
                <img 
                  src={coverImagePreview} 
                  alt="Preview" 
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition disabled:bg-gray-700 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating Club...' : 'Create Club'}
          </button>
        </form>
      </div>
    </div>
  );
}