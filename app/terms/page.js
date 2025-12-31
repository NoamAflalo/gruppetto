'use client';
import Navigation from '../components/navigation';
import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function Terms() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <Navigation user={user} />
      
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <h1 className="text-3xl md:text-4xl font-black text-white mb-8">Terms & Conditions</h1>
        
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 md:p-8 space-y-6 text-gray-300">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Acceptance of Terms</h2>
            <p>By accessing and using Gruppetto ("the Service"), you accept and agree to be bound by the terms and provisions of this agreement.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Use of Service</h2>
            <p>Gruppetto is a platform that connects athletes for training sessions. You agree to:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Provide accurate information when creating an account</li>
              <li>Be responsible for your own safety during training sessions</li>
              <li>Respect other users and follow community guidelines</li>
              <li>Not use the Service for any illegal or unauthorized purpose</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. User Responsibilities</h2>
            <p>As a user, you are responsible for:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Your own physical fitness and ability to participate in sessions</li>
              <li>Informing session hosts of any medical conditions</li>
              <li>Following local laws and regulations during sessions</li>
              <li>Maintaining the security of your account credentials</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Liability Disclaimer</h2>
            <p className="font-semibold text-orange-400 mb-2">IMPORTANT: Please read carefully</p>
            <p>Gruppetto is a connection platform only. We do not organize, supervise, or take responsibility for any training sessions. By using this Service, you acknowledge that:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>You participate in all activities at your own risk</li>
              <li>Gruppetto is not liable for any injuries, accidents, or incidents</li>
              <li>You should have appropriate insurance coverage</li>
              <li>Session hosts are not employed by or affiliated with Gruppetto</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Content Guidelines</h2>
            <p>Users agree not to post content that is:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Offensive, discriminatory, or harassing</li>
              <li>Fraudulent or misleading</li>
              <li>Violates intellectual property rights</li>
              <li>Contains spam or advertising</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Account Termination</h2>
            <p>We reserve the right to suspend or terminate accounts that violate these terms or engage in harmful behavior.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Changes to Terms</h2>
            <p>We may update these terms from time to time. Continued use of the Service constitutes acceptance of updated terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. Contact</h2>
            <p>For questions about these terms, contact us at: <a href="mailto:noamaflalo@gmail.com" className="text-orange-500 hover:underline">noamaflalo@gmail.com</a></p>
          </section>

          <div className="pt-6 border-t border-gray-800">
            <p className="text-sm text-gray-500">Last updated: December 31, 2025</p>
          </div>
        </div>
      </div>
    </div>
  );
}