'use client';
import { useRouter } from 'next/navigation';
import { getActivityEmoji, getIntensityColor } from '@/lib/sessionUi';

function SessionBadges({ session, sizeClass = 'px-3 md:px-4 py-1 text-xs md:text-sm' }) {
  return (
    <>
      <span className={`${sizeClass} rounded-full font-semibold border ${getIntensityColor(session.intensity)}`}>
        {session.intensity}
      </span>
      {session.isPrivate && (
        <span className={`${sizeClass} rounded-full font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30`}>
          🔒 Private
        </span>
      )}
      {session.girlsOnly && (
        <span className={`${sizeClass} rounded-full font-semibold bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/50 text-pink-400`}>
          👭 Girls Only
        </span>
      )}
    </>
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
      className={`bg-gray-900 rounded-xl border p-4 md:p-8 hover:border-orange-500/50 transition cursor-pointer ${
        isSelected ? 'border-orange-500' : 'border-gray-800'
      }`}
      onClick={() => router.push(`/session/${session.id}`)}
    >
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4 flex-wrap">
            <span className="text-3xl md:text-4xl">{getActivityEmoji(session.activity_type)}</span>
            <h2 className="text-xl md:text-3xl font-bold text-white">{session.title}</h2>
            <SessionBadges session={session} />
          </div>

          <p className="text-gray-400 mb-3 md:mb-4 text-sm md:text-lg">{session.description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 text-sm md:text-base text-gray-300 mb-3 md:mb-4">
            <div>📅 <strong>Date:</strong> {session.date}</div>
            <div>🕐 <strong>Time:</strong> {session.time}</div>
            <div className="sm:col-span-2">📍 <strong>Location:</strong> {session.location}</div>
            {session.distance && <div>📏 <strong>Distance:</strong> {session.distance}</div>}
          </div>

          {/* Host Profile */}
          <div
            className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4 hover:bg-gray-800 p-2 md:p-3 rounded-lg inline-flex transition"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/profile/${session.host_user_id}`);
            }}
          >
            {hostProfile?.profileImage ? (
              <img
                src={hostProfile.profileImage}
                alt={hostProfile.displayName}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-orange-500"
              />
            ) : (
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-800 flex items-center justify-center text-lg md:text-xl border-2 border-orange-500">
                👤
              </div>
            )}
            <div>
              <p className="text-xs md:text-sm font-semibold text-white">
                Hosted by {hostProfile?.displayName || session.host_email}
              </p>
              {hostProfile?.fitnessLevel && (
                <p className="text-xs text-gray-500 capitalize">{hostProfile.fitnessLevel}</p>
              )}
            </div>
          </div>

          {/* Participants */}
          <div className="mb-2">
            <p className="text-xs md:text-sm font-semibold text-gray-300 mb-2 md:mb-3">
              👥 {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
              {session.max_participants && ` (max: ${session.max_participants})`}
            </p>
            {participantCount > 0 && (
              <div className="flex flex-wrap gap-2">
                {session.participants?.slice(0, 5).map((participantId) => {
                  const profile = profiles[participantId];
                  return (
                    <div
                      key={participantId}
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/profile/${participantId}`);
                      }}
                      className="cursor-pointer hover:scale-110 transition"
                      title={profile?.displayName || 'User'}
                    >
                      {profile?.profileImage ? (
                        <img
                          src={profile.profileImage}
                          alt={profile.displayName}
                          className="rounded-full object-cover border-2 border-gray-700 hover:border-orange-500"
                          style={{ width: '2rem', height: '2rem', minWidth: '2rem', minHeight: '2rem' }}
                        />
                      ) : (
                        <div className="rounded-full bg-gray-800 flex items-center justify-center text-xs md:text-sm border-2 border-gray-700 hover:border-orange-500"
                             style={{ width: '2rem', height: '2rem', minWidth: '2rem', minHeight: '2rem' }}>
                          👤
                        </div>
                      )}
                    </div>
                  );
                })}
                {participantCount > 5 && (
                  <div className="rounded-full bg-gray-800 flex items-center justify-center text-xs font-semibold text-gray-400 border-2 border-gray-700"
                       style={{ width: '2rem', height: '2rem', minWidth: '2rem', minHeight: '2rem' }}>
                    +{participantCount - 5}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Join/Leave Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onJoin(session.id, session.participants || []);
          }}
          disabled={!isParticipant && session.max_participants && participantCount >= session.max_participants}
          className={`w-full md:w-auto md:ml-6 px-6 md:px-8 py-3 rounded-lg font-semibold transition ${
            isParticipant
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-green-500 text-white hover:bg-green-600 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed'
          }`}
        >
          {isParticipant ? 'Leave' : 'Join'}
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
      className="bg-gradient-to-r from-orange-500/10 to-pink-500/10 rounded-xl border-2 border-orange-500/50 p-4 md:p-6 hover:border-orange-500 transition cursor-pointer"
      onClick={() => router.push(`/session/${session.id}`)}
    >
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 md:gap-3 mb-3 flex-wrap">
            <span className="text-2xl md:text-3xl">{getActivityEmoji(session.activity_type)}</span>
            <h3 className="text-lg md:text-xl font-bold text-white">{session.title}</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getIntensityColor(session.intensity)}`}>
              {session.intensity}
            </span>
            <span className="px-3 py-1 bg-orange-500 text-white rounded-full text-xs font-bold">
              MATCH
            </span>
            {session.isPrivate && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                🔒 Private
              </span>
            )}
            {session.girlsOnly && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/50 text-pink-400">
                👭 Girls Only
              </span>
            )}
          </div>

          <p className="text-gray-300 mb-3 text-sm line-clamp-2">{session.description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-300 mb-3">
            <div>📅 {session.date}</div>
            <div>🕐 {session.time}</div>
            <div className="sm:col-span-2">📍 {session.location}</div>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>👥 {participantCount} joined</span>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onJoin(session.id, session.participants || []);
          }}
          disabled={!isParticipant && session.max_participants && participantCount >= session.max_participants}
          className={`w-full md:w-auto md:ml-6 px-6 py-3 rounded-lg font-semibold transition ${
            isParticipant
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-orange-500 text-white hover:bg-orange-600 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed'
          }`}
        >
          {isParticipant ? 'Leave' : 'Join'}
        </button>
      </div>
    </div>
  );
}
