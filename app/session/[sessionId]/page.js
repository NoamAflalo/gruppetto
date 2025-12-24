'use client';
import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, onSnapshot, orderBy, query, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter, useParams } from 'next/navigation';
import Navigation from '../../components/navigation';

export default function SessionDetail() {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hostProfile, setHostProfile] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        router.push('/');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!sessionId) return;

    const sessionRef = doc(db, 'sessions', sessionId);
    const unsubscribe = onSnapshot(sessionRef, async (docSnapshot) => {
      if (docSnapshot.exists()) {
        const sessionData = { id: docSnapshot.id, ...docSnapshot.data() };
        setSession(sessionData);

        const hostDoc = await getDoc(doc(db, 'profiles', sessionData.host_user_id));
        if (hostDoc.exists()) {
          setHostProfile(hostDoc.data());
        }

        if (sessionData.participants) {
          const participantProfiles = [];
          for (const participantId of sessionData.participants) {
            const profileDoc = await getDoc(doc(db, 'profiles', participantId));
            if (profileDoc.exists()) {
              participantProfiles.push({ id: participantId, ...profileDoc.data() });
            }
          }
          setParticipants(participantProfiles);
        }
      }
    });

    return () => unsubscribe();
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    const commentsQuery = query(
      collection(db, 'sessions', sessionId, 'comments'),
      orderBy('created_at', 'asc')
    );

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setComments(commentsData);
    });

    return () => unsubscribe();
  }, [sessionId]);

  const handleJoinSession = async () => {
    if (!user || !session) return;

    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      const isParticipant = session.participants?.includes(user.uid);

      if (isParticipant) {
        await updateDoc(sessionRef, {
          participants: arrayRemove(user.uid)
        });
      } else {
        await updateDoc(sessionRef, {
          participants: arrayUnion(user.uid)
        });

        try {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'session_joined',
              to: session.host_email,
              data: {
                sessionTitle: session.title,
                participantName: user.email,
                date: session.date,
                time: session.time,
                location: session.location,
                participantCount: (session.participants?.length || 0) + 1,
              },
            }),
          });
        } catch (emailError) {
          console.error('Email error:', emailError);
        }
      }
    } catch (error) {
      console.error('Error joining/leaving session:', error);
    }
  };

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    try {
      await addDoc(collection(db, 'sessions', sessionId, 'comments'), {
        text: newComment,
        user_id: user.uid,
        user_email: user.email,
        created_at: new Date(),
      });

      setNewComment('');
    } catch (error) {
      console.error('Error sending comment:', error);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const getActivityEmoji = (type) => {
    switch(type) {
      case 'running': return '🏃';
      case 'cycling': return '🚴';
      case 'swimming': return '🏊';
      default: return '💪';
    }
  };

  const getIntensityColor = (intensity) => {
    switch(intensity) {
      case 'easy': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'moderate': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'hard': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading...</div>;
  }

  const isParticipant = session.participants?.includes(user.uid);
  const isHost = session.host_user_id === user.uid;
  const canAccessChat = isParticipant || isHost;
  const unreadCount = comments.filter(c => c.user_id !== user.uid).length;

  return (
    <div className="min-h-screen bg-black">
      <Navigation user={user} />

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Session Details */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 md:p-8 mb-6 md:mb-8">
          <div className="flex items-start gap-3 md:gap-4 mb-4 md:mb-6 flex-wrap">
            <span className="text-4xl md:text-5xl">{getActivityEmoji(session.activity_type)}</span>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-4xl font-black text-white mb-2 break-words">{session.title}</h1>
              <span className={`inline-block px-3 md:px-4 py-1 rounded-full text-xs md:text-sm font-semibold border ${getIntensityColor(session.intensity)}`}>
                {session.intensity}
              </span>
            </div>
          </div>

          <p className="text-gray-300 mb-6 md:mb-8 text-sm md:text-lg leading-relaxed">{session.description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
            <div className="bg-black rounded-xl p-3 md:p-4 border border-gray-800">
              <p className="text-gray-500 text-xs md:text-sm mb-1">📅 Date</p>
              <p className="text-white font-semibold text-sm md:text-base">{session.date}</p>
            </div>
            <div className="bg-black rounded-xl p-3 md:p-4 border border-gray-800">
              <p className="text-gray-500 text-xs md:text-sm mb-1">🕐 Time</p>
              <p className="text-white font-semibold text-sm md:text-base">{session.time}</p>
            </div>
            <div className="bg-black rounded-xl p-3 md:p-4 border border-gray-800 sm:col-span-2">
              <p className="text-gray-500 text-xs md:text-sm mb-1">📍 Location</p>
              <p className="text-white font-semibold text-sm md:text-base">{session.location}</p>
            </div>
            {session.distance && (
              <div className="bg-black rounded-xl p-3 md:p-4 border border-gray-800">
                <p className="text-gray-500 text-xs md:text-sm mb-1">📏 Distance</p>
                <p className="text-white font-semibold text-sm md:text-base">{session.distance}</p>
              </div>
            )}
            {session.max_participants && (
              <div className="bg-black rounded-xl p-3 md:p-4 border border-gray-800">
                <p className="text-gray-500 text-xs md:text-sm mb-1">👥 Max Participants</p>
                <p className="text-white font-semibold text-sm md:text-base">{session.max_participants}</p>
              </div>
            )}
          </div>

          {/* Host */}
          <div 
            className="bg-black rounded-xl p-3 md:p-4 border border-gray-800 mb-6 md:mb-8 flex items-center gap-3 md:gap-4 cursor-pointer hover:border-orange-500/50 transition"
            onClick={() => router.push(`/profile/${session.host_user_id}`)}
          >
            {hostProfile?.profileImage ? (
              <img 
                src={hostProfile.profileImage} 
                alt={hostProfile.displayName}
                className="rounded-full object-cover border-2 border-orange-500"
                style={{ width: '3rem', height: '3rem', minWidth: '3rem', minHeight: '3rem' }}
              />
            ) : (
              <div className="rounded-full bg-gray-800 flex items-center justify-center text-xl border-2 border-orange-500"
                   style={{ width: '3rem', height: '3rem', minWidth: '3rem', minHeight: '3rem' }}>
                👤
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm text-gray-500 mb-1">Hosted by</p>
              <p className="text-sm md:text-base font-bold text-white truncate">{hostProfile?.displayName || session.host_email}</p>
              {hostProfile?.fitnessLevel && (
                <p className="text-xs text-gray-500 capitalize">{hostProfile.fitnessLevel}</p>
              )}
            </div>
          </div>

          {/* Join/Leave Button */}
          <button
            onClick={handleJoinSession}
            disabled={!isParticipant && session.max_participants && session.participants?.length >= session.max_participants}
            className={`w-full py-3 md:py-4 rounded-xl font-bold text-base md:text-lg transition ${
              isParticipant
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-green-500 text-white hover:bg-green-600 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed'
            }`}
          >
            {isParticipant ? 'Leave Session' : 'Join Session'}
          </button>
        </div>

        {/* Participants */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 md:p-8 mb-6 md:mb-8">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">
            Participants ({participants.length}{session.max_participants ? `/${session.max_participants}` : ''})
          </h2>
          
          {participants.length === 0 ? (
            <p className="text-gray-400 text-center py-8 text-sm md:text-base">No participants yet. Be the first to join!</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="bg-black rounded-xl p-3 md:p-4 border border-gray-800 flex items-center gap-3 cursor-pointer hover:border-orange-500/50 transition"
                  onClick={() => router.push(`/profile/${participant.id}`)}
                >
                  {participant.profileImage ? (
                    <img 
                      src={participant.profileImage} 
                      alt={participant.displayName}
                      className="rounded-full object-cover border-2 border-gray-700"
                      style={{ width: '2.5rem', height: '2.5rem', minWidth: '2.5rem', minHeight: '2.5rem' }}
                    />
                  ) : (
                    <div className="rounded-full bg-gray-800 flex items-center justify-center text-base border-2 border-gray-700"
                         style={{ width: '2.5rem', height: '2.5rem', minWidth: '2.5rem', minHeight: '2.5rem' }}>
                      👤
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm md:text-base font-semibold text-white truncate">
                      {participant.displayName || participant.email}
                      {participant.id === session.host_user_id && (
                        <span className="ml-2 text-xs px-2 py-0.5 bg-orange-500/20 text-orange-500 rounded">Host</span>
                      )}
                    </p>
                    {participant.fitnessLevel && (
                      <p className="text-xs text-gray-500 capitalize">{participant.fitnessLevel}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat Section */}
        {canAccessChat && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 md:p-8">
            <div className="flex justify-between items-center mb-4 md:mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-white">Session Chat</h2>
              <button
                onClick={() => setShowChat(!showChat)}
                className="px-4 md:px-6 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition text-sm md:text-base"
              >
                {showChat ? 'Close Chat' : `Open Chat ${unreadCount > 0 ? `(${unreadCount})` : ''}`}
              </button>
            </div>

            {showChat && (
              <>
                {/* Messages */}
                <div className="bg-black rounded-xl border border-gray-800 p-3 md:p-4 mb-4 max-h-96 overflow-y-auto">
                  {comments.length === 0 ? (
                    <p className="text-gray-500 text-center py-8 text-sm md:text-base">No messages yet. Start the conversation!</p>
                  ) : (
                    <div className="space-y-3 md:space-y-4">
                      {comments.map((comment) => {
                        const participantProfile = participants.find(p => p.id === comment.user_id);
                        return (
                          <div key={comment.id} className="flex gap-2 md:gap-3">
                            {participantProfile?.profileImage ? (
                              <img 
                                src={participantProfile.profileImage} 
                                alt={participantProfile.displayName}
                                className="rounded-full object-cover border-2 border-gray-700 flex-shrink-0"
                                style={{ width: '2rem', height: '2rem', minWidth: '2rem', minHeight: '2rem' }}
                              />
                            ) : (
                              <div className="rounded-full bg-gray-800 flex items-center justify-center text-sm border-2 border-gray-700 flex-shrink-0"
                                   style={{ width: '2rem', height: '2rem', minWidth: '2rem', minHeight: '2rem' }}>
                                👤
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-xs md:text-sm font-semibold text-white">
                                  {participantProfile?.displayName || comment.user_email}
                                </span>
                                {comment.user_id === session.host_user_id && (
                                  <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-500 rounded">Host</span>
                                )}
                                <span className="text-xs text-gray-500">{formatTime(comment.created_at)}</span>
                              </div>
                              <p className="text-sm md:text-base text-gray-300 break-words">{comment.text}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendComment} className="flex gap-2 md:gap-3">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 p-3 md:p-4 bg-black border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm md:text-base"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className="px-4 md:px-6 py-3 md:py-4 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 disabled:bg-gray-700 disabled:cursor-not-allowed transition text-sm md:text-base whitespace-nowrap"
                  >
                    Send
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        {!canAccessChat && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 md:p-12 text-center">
            <p className="text-gray-400 text-sm md:text-lg">Join the session to access the group chat</p>
          </div>
        )}
      </div>
    </div>
  );
}