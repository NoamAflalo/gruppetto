'use client';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, MapPin, Ruler, Users, User, Lock } from 'lucide-react';
import { getIntensityColor } from '@/lib/sessionUi';
import ActivityIcon from '../../components/ActivityIcon';

function SessionBadges({ session, sizeClass = 'px-3 py-1 text-xs' }) {
  return (
    <>
      <span className={`${sizeClass} rounded-full font-semibold uppercase tracking-wide border ${getIntensityColor(session.intensity)}`}>
        {session.intensity}
      </span>
      {session.isPrivate && (
        <span className={`${sizeClass} rounded-full font-semibold uppercase tracking-wide bg-card2 text-soft border border-line inline-flex items-center gap-1`}>
          <Lock size={11} /> Private
        </span>
      )}
      {session.girlsOnly && (
        <span className={`${sizeClass} rounded-full font-semibold uppercase tracking-wide bg-pink-500/10 border border-pink-500/40 text-pink-400`}>
          Girls only
        </span>
      )}
    </>
  );
}

function MetaItem({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Icon size={15} className="text-muted flex-none" />
      {children}
    </span>
  );
}

function Avatar({ profile, size = 'w-8 h-8', ring = 'border-line' }) {
  return profile?.profileImage ? (
    <img
      src={profile.profileImage}
      alt={profile.displayName || 'User'}
      className={`${size} rounded-full object-cover border-2 ${ring} flex-none`}
    />
  ) : (
    <div className={`${size} rounded-full bg-card2 border-2 ${ring} flex items-center justify-center flex-none`}>
      <User size={14} className="text-muted" />
    </div>
  );
}

// Full session card used in the "All Sessions" list.
export function SessionCard({ session, profiles, userId, isSelected, onJoin }) {
  const router = useRouter();
  const isParticipant = session.participants?.includes(userId);
  const participantCount = session.participants?.length || 0;
  const hostProfile = profiles[session.host_user_id];

  return (
    <div
      id={`session-${session.id}`}
      className={`bg-card rounded-2xl border p-5 md:p-7 hover:border-brand/50 transition cursor-pointer ${
        isSelected ? 'border-brand' : 'border-line'
      }`}
      onClick={() => router.push(`/session/${session.id}`)}
    >
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3 mb-3 md:mb-4">
            <ActivityIcon type={session.activity_type} boxed size={19} boxClass="w-10 h-10 md:w-11 md:h-11" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 md:gap-2.5 flex-wrap">
                <h2 className="font-display uppercase text-xl md:text-2xl text-ink leading-tight">{session.title}</h2>
                <SessionBadges session={session} />
              </div>
            </div>
          </div>

          <p className="text-muted mb-4 text-sm md:text-base">{session.description}</p>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm md:text-[15px] text-soft mb-4">
            <MetaItem icon={Calendar}>{session.date}</MetaItem>
            <MetaItem icon={Clock}>{session.time}</MetaItem>
            <MetaItem icon={MapPin}>{session.location}</MetaItem>
            {session.distance && <MetaItem icon={Ruler}>{session.distance}</MetaItem>}
          </div>

          {/* Host Profile */}
          <div
            className="inline-flex items-center gap-2.5 mb-4 hover:bg-card2 py-1.5 px-2 -mx-2 rounded-lg transition"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/profile/${session.host_user_id}`);
            }}
          >
            <Avatar profile={hostProfile} size="w-9 h-9" ring="border-brand/60" />
            <div>
              <p className="text-xs md:text-sm font-semibold text-ink">
                Hosted by {hostProfile?.displayName || session.host_email}
              </p>
              {hostProfile?.fitnessLevel && (
                <p className="text-xs text-muted capitalize">{hostProfile.fitnessLevel}</p>
              )}
            </div>
          </div>

          {/* Participants */}
          <div className="flex items-center gap-3">
            {participantCount > 0 && (
              <div className="flex -space-x-2">
                {session.participants?.slice(0, 5).map((participantId) => (
                  <div
                    key={participantId}
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/profile/${participantId}`);
                    }}
                    className="cursor-pointer hover:scale-110 hover:z-10 relative transition"
                    title={profiles[participantId]?.displayName || 'User'}
                  >
                    <Avatar profile={profiles[participantId]} size="w-7 h-7" ring="border-card" />
                  </div>
                ))}
                {participantCount > 5 && (
                  <div className="w-7 h-7 rounded-full bg-card2 border-2 border-card flex items-center justify-center text-[10px] font-semibold text-muted relative">
                    +{participantCount - 5}
                  </div>
                )}
              </div>
            )}
            <p className="text-xs md:text-sm text-muted inline-flex items-center gap-1.5">
              <Users size={14} />
              {participantCount} going
              {session.max_participants && ` · max ${session.max_participants}`}
            </p>
          </div>
        </div>

        {/* Join/Leave Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onJoin(session.id, session.participants || []);
          }}
          disabled={!isParticipant && session.max_participants && participantCount >= session.max_participants}
          className={`w-full md:w-auto md:ml-6 px-6 md:px-8 py-3 rounded-lg font-semibold transition flex-none ${
            isParticipant
              ? 'bg-card2 text-soft border border-line hover:border-red-500/50 hover:text-red-400'
              : 'bg-brand text-white hover:bg-brand-hover disabled:bg-card2 disabled:text-muted disabled:cursor-not-allowed'
          }`}
        >
          {isParticipant ? 'Leave' : 'Join session'}
        </button>
      </div>
    </div>
  );
}

// Compact card with MATCH badge used in the "Recommended For You" block.
export function RecommendedSessionCard({ session, userId, onJoin }) {
  const router = useRouter();
  const isParticipant = session.participants?.includes(userId);
  const participantCount = session.participants?.length || 0;

  return (
    <div
      className="bg-gradient-to-r from-brand/10 to-brand/5 rounded-2xl border border-brand/40 p-4 md:p-6 hover:border-brand transition cursor-pointer"
      onClick={() => router.push(`/session/${session.id}`)}
    >
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3 mb-3">
            <ActivityIcon type={session.activity_type} boxed size={17} boxClass="w-9 h-9" />
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <h3 className="font-display uppercase text-lg md:text-xl text-ink leading-tight">{session.title}</h3>
              <span className="px-2.5 py-0.5 bg-brand text-white rounded-full text-[11px] font-bold tracking-wide">
                MATCH
              </span>
              <SessionBadges session={session} sizeClass="px-2.5 py-0.5 text-[11px]" />
            </div>
          </div>

          <p className="text-soft mb-3 text-sm line-clamp-2">{session.description}</p>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-soft mb-3">
            <MetaItem icon={Calendar}>{session.date}</MetaItem>
            <MetaItem icon={Clock}>{session.time}</MetaItem>
            <MetaItem icon={MapPin}>{session.location}</MetaItem>
          </div>

          <p className="text-xs text-muted inline-flex items-center gap-1.5">
            <Users size={13} /> {participantCount} going
          </p>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onJoin(session.id, session.participants || []);
          }}
          disabled={!isParticipant && session.max_participants && participantCount >= session.max_participants}
          className={`w-full md:w-auto md:ml-6 px-6 py-3 rounded-lg font-semibold transition flex-none ${
            isParticipant
              ? 'bg-card2 text-soft border border-line hover:border-red-500/50 hover:text-red-400'
              : 'bg-brand text-white hover:bg-brand-hover disabled:bg-card2 disabled:text-muted disabled:cursor-not-allowed'
          }`}
        >
          {isParticipant ? 'Leave' : 'Join session'}
        </button>
      </div>
    </div>
  );
}
