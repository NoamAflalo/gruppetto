'use client';
import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Navigation from '../components/navigation';

export default function Settings() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    emailNotifications: true,
    profileVisibility: 'public',
    showEmail: true,
    showStrava: true,
  });
  const [saveMessage, setSaveMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        
        const settingsDoc = await getDoc(doc(db, 'settings', user.uid));
        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data());
        }
      } else {
        router.push('/');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleSaveSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', user.uid), {
        ...settings,
        userId: user.uid,
        updatedAt: new Date(),
      });
      
      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please try again.');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-ground text-ink">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-ground">
      <Navigation user={user} />
      
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-ink mb-2">Settings</h1>
          <p className="text-muted text-base md:text-lg">Manage your account preferences and privacy</p>
        </div>

        {saveMessage && (
          <div className="mb-4 md:mb-6 bg-green-500/10 border border-green-500/30 text-green-400 p-3 md:p-4 rounded-xl text-sm md:text-base">
            {saveMessage}
          </div>
        )}

        {/* Notifications Settings */}
        <div className="bg-card rounded-2xl border border-line p-4 md:p-8 mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-ink mb-4 md:mb-6">📧 Email Notifications</h2>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between p-3 md:p-4 bg-ground rounded-xl border border-line cursor-pointer hover:border-line transition">
              <div className="flex-1 pr-4">
                <p className="text-sm md:text-base text-ink font-semibold">Email Notifications</p>
                <p className="text-xs md:text-sm text-muted">Receive emails when someone joins your session or messages you</p>
              </div>
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                className="w-5 h-5 md:w-6 md:h-6 text-brand rounded focus:ring-2 focus:ring-brand flex-shrink-0"
              />
            </label>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="bg-card rounded-2xl border border-line p-4 md:p-8 mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-ink mb-4 md:mb-6">🔒 Privacy</h2>
          
          <div className="space-y-4 md:space-y-6">
            {/* Profile Visibility */}
            <div>
              <label className="block text-sm font-semibold text-soft mb-3">Profile Visibility</label>
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, profileVisibility: 'public' })}
                  className={`p-3 md:p-4 rounded-xl border-2 font-semibold transition text-sm md:text-base ${
                    settings.profileVisibility === 'public'
                      ? 'bg-brand border-brand text-ink'
                      : 'bg-ground border-line text-soft hover:border-brand/40'
                  }`}
                >
                  🌍 Public
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, profileVisibility: 'private' })}
                  className={`p-3 md:p-4 rounded-xl border-2 font-semibold transition text-sm md:text-base ${
                    settings.profileVisibility === 'private'
                      ? 'bg-brand border-brand text-ink'
                      : 'bg-ground border-line text-soft hover:border-brand/40'
                  }`}
                >
                  🔒 Private
                </button>
              </div>
              <p className="text-xs md:text-sm text-muted mt-2">
                {settings.profileVisibility === 'public' 
                  ? 'Your profile is visible to all Gruppeto users'
                  : 'Your profile is only visible to session participants'}
              </p>
            </div>

            {/* Show Email */}
            <label className="flex items-center justify-between p-3 md:p-4 bg-ground rounded-xl border border-line cursor-pointer hover:border-line transition">
              <div className="flex-1 pr-4">
                <p className="text-sm md:text-base text-ink font-semibold">Show Email on Profile</p>
                <p className="text-xs md:text-sm text-muted">Allow others to see your email address</p>
              </div>
              <input
                type="checkbox"
                checked={settings.showEmail}
                onChange={(e) => setSettings({ ...settings, showEmail: e.target.checked })}
                className="w-5 h-5 md:w-6 md:h-6 text-brand rounded focus:ring-2 focus:ring-brand flex-shrink-0"
              />
            </label>

            {/* Show Strava */}
            <label className="flex items-center justify-between p-3 md:p-4 bg-ground rounded-xl border border-line cursor-pointer hover:border-line transition">
              <div className="flex-1 pr-4">
                <p className="text-sm md:text-base text-ink font-semibold">Show Strava Link</p>
                <p className="text-xs md:text-sm text-muted">Display your Strava profile link publicly</p>
              </div>
              <input
                type="checkbox"
                checked={settings.showStrava}
                onChange={(e) => setSettings({ ...settings, showStrava: e.target.checked })}
                className="w-5 h-5 md:w-6 md:h-6 text-brand rounded focus:ring-2 focus:ring-brand flex-shrink-0"
              />
            </label>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveSettings}
          className="w-full bg-brand text-ink py-3 md:py-4 rounded-xl font-bold text-base md:text-lg hover:bg-brand-hover transition mb-6 md:mb-8"
        >
          Save Settings
        </button>

        {/* Contact for Account Deletion */}
        <div className="bg-card2 rounded-2xl border border-line p-4 md:p-6 text-center">
          <p className="text-sm md:text-base text-soft mb-2">Need to delete your account?</p>
          <p className="text-xs md:text-sm text-muted">Contact us at hello.gruppetto@gmail.com</p>
        </div>
      </div>
    </div>
  );
}