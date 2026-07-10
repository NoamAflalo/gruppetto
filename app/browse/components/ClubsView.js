'use client';
import { useRouter } from 'next/navigation';
import { MapPin, Users, BadgeCheck, Sparkles } from 'lucide-react';
import ActivityIcon from '../../components/ActivityIcon';

function ClubCard({ club, featured }) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/club/${club.id}`)}
      className={featured
        ? 'bg-gradient-to-r from-brand/10 to-brand/5 border border-brand/40 rounded-2xl p-6 hover:border-brand transition cursor-pointer'
        : 'bg-card rounded-2xl border border-line p-6 hover:border-brand/50 transition cursor-pointer'}
    >
      <div className="flex flex-col lg:flex-row gap-6">
        {club.coverImage && (
          <img
            src={club.coverImage}
            alt={club.name}
            className="w-full lg:w-64 h-48 object-cover rounded-xl border border-line"
          />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2.5 mb-2 flex-wrap">
            <h3 className="font-display uppercase text-2xl text-ink">{club.name}</h3>
            {featured && (
              <span className="px-2 py-0.5 bg-brand text-white rounded-full text-[11px] font-bold inline-flex items-center gap-1">
                <BadgeCheck size={12} /> VERIFIED
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-soft mb-4">
            <span className="inline-flex items-center gap-1.5 capitalize">
              <ActivityIcon type={club.activity_type} size={14} className="text-muted" /> {club.activity_type}
            </span>
            <span className="inline-flex items-center gap-1.5"><MapPin size={14} className="text-muted" /> {club.location}</span>
            <span className="inline-flex items-center gap-1.5"><Users size={14} className="text-muted" /> {club.member_count || 1} members</span>
          </div>
          <p className="text-muted mb-4 line-clamp-2">{club.description}</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/club/${club.id}`);
            }}
            className="bg-brand text-white px-6 py-2 rounded-lg hover:bg-brand-hover font-semibold transition"
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
      <div className="grid gap-6">
        {[0, 1].map((i) => (
          <div key={i} className="skeleton h-44 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (clubs.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-line p-8 md:p-12 text-center">
        <p className="text-muted text-base md:text-lg">No clubs available yet. Be the first to create one!</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Featured Clubs */}
      {featuredClubs.length > 0 && (
        <div>
          <h2 className="font-display uppercase text-2xl text-ink mb-4 inline-flex items-center gap-2">
            <Sparkles size={19} className="text-brand" /> Featured Clubs
          </h2>
          <div className="grid gap-6">
            {featuredClubs.map((club) => (
              <ClubCard key={club.id} club={club} featured />
            ))}
          </div>
        </div>
      )}

      {/* All Clubs */}
      <div>
        <h2 className="font-display uppercase text-2xl text-ink mb-4">
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
