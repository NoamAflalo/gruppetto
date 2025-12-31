'use client';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl md:text-8xl font-black text-orange-500 mb-4">404</h1>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Page Not Found</h2>
        <p className="text-gray-400 mb-8 text-base md:text-lg">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <button
          onClick={() => router.push('/browse')}
          className="bg-orange-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition"
        >
          Go to Browse Sessions
        </button>
      </div>
    </div>
  );
}