'use client';
import Navigation from '../components/navigation';
import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function Privacy() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-ground">
      <Navigation user={user} />
      
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <h1 className="text-3xl md:text-4xl font-black text-ink mb-8">Privacy Policy</h1>
        
        <div className="bg-card rounded-2xl border border-line p-6 md:p-8 space-y-6 text-soft">
          <section>
            <h2 className="text-xl font-bold text-ink mb-3">1. Information We Collect</h2>
            <p>When you use Gruppetto, we collect:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li><strong>Account Information:</strong> Email address, display name, profile picture</li>
              <li><strong>Profile Data:</strong> Fitness level, activities, bio, location (optional)</li>
              <li><strong>Session Data:</strong> Sessions you create or join, messages in session chats</li>
              <li><strong>Usage Data:</strong> Pages visited, features used (via Google Analytics)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ink mb-3">2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Provide and improve the Service</li>
              <li>Connect you with other athletes for training sessions</li>
              <li>Send notifications about sessions you've joined</li>
              <li>Analyze usage patterns to improve user experience</li>
              <li>Ensure safety and prevent misuse of the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ink mb-3">3. Information Sharing</h2>
            <p>Your information is visible to:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li><strong>Other Users:</strong> Your profile, sessions, and chat messages are visible to other Gruppetto users</li>
              <li><strong>Session Participants:</strong> When you join a session, participants can see your profile</li>
              <li><strong>We do NOT:</strong> Sell your data to third parties or use it for advertising</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ink mb-3">4. Third-Party Services</h2>
            <p>We use the following third-party services:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li><strong>Firebase (Google):</strong> Authentication, database, file storage</li>
              <li><strong>Google Analytics:</strong> Usage analytics (anonymized)</li>
              <li><strong>Resend:</strong> Email notifications</li>
              <li><strong>Anthropic:</strong> AI session generation (data not stored)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ink mb-3">5. Data Storage & Security</h2>
            <p>We take security seriously:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Data is stored securely on Firebase servers (EU/US regions)</li>
              <li>Passwords are encrypted and never stored in plain text</li>
              <li>We use industry-standard security practices</li>
              <li>Access to user data is restricted to essential operations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ink mb-3">6. Your Rights (GDPR)</h2>
            <p>If you're in the EU, you have the right to:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li><strong>Access:</strong> Request a copy of your data</li>
              <li><strong>Rectification:</strong> Correct inaccurate data</li>
              <li><strong>Erasure:</strong> Request deletion of your account and data</li>
              <li><strong>Portability:</strong> Receive your data in a machine-readable format</li>
            </ul>
            <p className="mt-3">To exercise these rights, email: <a href="mailto:privacy@getgruppetto.com" className="text-brand hover:underline">privacy@getgruppetto.com</a></p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ink mb-3">7. Cookies & Tracking</h2>
            <p>We use:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li><strong>Essential Cookies:</strong> Required for authentication and core functionality</li>
              <li><strong>Analytics Cookies:</strong> Google Analytics to understand usage patterns</li>
            </ul>
            <p className="mt-3">You can disable cookies in your browser, but this may affect functionality.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ink mb-3">8. Children's Privacy</h2>
            <p>Gruppetto is not intended for users under 16. We do not knowingly collect data from children. If you believe a child has created an account, please contact us.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ink mb-3">9. Changes to Privacy Policy</h2>
            <p>We may update this policy from time to time. We'll notify users of significant changes via email or in-app notification.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ink mb-3">10. Contact Us</h2>
            <p>For privacy questions or concerns:</p>
            <p className="mt-2">
              Email: <a href="mailto:hello.gruppetto@gmail.com" className="text-brand hover:underline">hello.gruppetto@gmail.com</a><br/>
              Address: London, United Kingdom
            </p>
          </section>

          <div className="pt-6 border-t border-line">
            <p className="text-sm text-muted">Last updated: December 31, 2025</p>
          </div>
        </div>
      </div>
    </div>
  );
}