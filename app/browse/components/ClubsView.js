'use client';
import { useRouter } from 'next/navigation';
import { getActivityEmoji } from '@/lib/sessionUi';

function ClubCard({ club, featured }) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/club/${club.id}`)}
      className={featured
        ? 'bg-gradient-to-r from-orange-500/10 to-pink-500/10 border-2 border-orange-500/50 rounded-xl p-6 hover:border-orange-500 transition cursor-pointer'
        : 'bg-gray-900 rounded-xl border border-gray-800 p-6 hover:border-orange-500/50 transition cursor-pointer'}
    >
      <div className="flex flex-col lg:flex-row gap-6">
        {club.coverImage && (
          <img
            src={club.coverImage}
            alt={club.name}
            className="w-full lg:w-64 h-48 object-cover rounded-lg"
          />
        )}
        <div className="flex-1">
          {featured ? (
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-2xl font-bold text-white">{club.name}</h3>
              <span className="px-2 py-1 bg-orange-500 text-white rounded text-xs font-bold">
                ✓ VERIFIED
              </span>
            </div>
          ) : (
            <h3 className="text-2xl font-bold text-white mb-2">{club.name}</h3>
          )}
          <div className="space-y-1 text-sm mb-4">
            <p className="text-gray-300">
              {getActivityEmoji(club.activity_type)} {club.activity_type.charAt(0).toUpperCase() + club.activity_type.slice(1)}
            </p>
            <p className="text-gray-300">📍 {club.location}</p>
            <p className="text-gray-300">👥 {club.member_count || 1} members</p>
          </div>
          <p className="text-gray-400 mb-4 line-clamp-2">{club.description}</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/club/${club.id}`);
            }}
            className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 font-semibold transition"
          >
            View Club
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClubsView({ clubs, loading }) {
  const featuredClubs = clubs.filter(c => c.isFeatured);
  const regularClubs = clubs.filter(c => !c.isFeatured);

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Loading clubs...</p>
      </div>
    );
  }

  if (clubs.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 md:p-12 text-center">
        <p className="text-gray-400 text-base md:text-lg">No clubs available yet. Be the first to create one!</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Featured Clubs */}
      {featuredClubs.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">✨ Featured Clubs</h2>
          <div className="grid gap-6">
            {featuredClubs.map((club) => (
              <ClubCard key={club.id} club={club} featured />
            ))}
          </div>
        </div>
      )}

      {/* All Clubs */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">
          {featuredClubs.length > 0 ? 'All Clubs' : 'Clubs'}
        </h2>
        <div className="grid gap-6">
          {regularClubs.map((club) => (
            <ClubCard key={club.id} club={club} />
          ))}
        </div>
      </div>
    </div>
  );
}
