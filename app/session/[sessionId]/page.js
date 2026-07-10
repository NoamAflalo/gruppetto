'use client';
import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { authedFetch } from '@/lib/api';
import { doc, getDoc, collection, onSnapshot, addDoc, serverTimestamp, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter, useParams } from 'next/navigation';
import Navigation from '../../components/navigation';
import SessionMap from '../../components/map';
import Toast from '../../components/Toast';

export default function SessionDetail() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null); // NOUVEAU
  const [session, setSession] = useState(null);
  const [profiles, setProfiles] = useState({});
  const [comments, setComments] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null); // NOUVEAU
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        
        // NOUVEAU - Récupérer le profil de l'utilisateur connecté
        try {
          const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
          if (profileDoc.exists()) {
            setUserProfile(profileDoc.data());
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
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
    const unsubscribe = onSnapshot(sessionRef, async (docSnap) => {
      if (docSnap.exists()) {
        const sessionData = { id: docSnap.id, ...docSnap.data() };
        setSession(sessionData);

        const userIds = new Set();
        if (sessionData.host_user_id) userIds.add(sessionData.host_user_id);
        if (sessionData.participants) {
          sessionData.participants.forEach(id => userIds.add(id));
        }
        // Ajoute les userIds des joinRequests
        if (sessionData.joinRequests) {
          sessionData.joinRequests.forEach(req => userIds.add(req.userId));
        }

        const profilesData = {};
        for (const userId of userIds) {
          const profileDoc = await getDoc(doc(db, 'profiles', userId));
          if (profileDoc.exists()) {
            profilesData[userId] = profileDoc.data();
          }
        }
        setProfiles(profilesData);
      } else {
        router.push('/browse');
      }
    });

    return () => unsubscribe();
  }, [sessionId, router]);

  useEffect(() => {
    if (!sessionId) return;

    const commentsRef = collection(db, 'sessions', sessionId, 'comments');
    const unsubscribe = onSnapshot(commentsRef, async (snapshot) => {
      const commentsData = [];
      
      for (const docSnap of snapshot.docs) {
        const comment = docSnap.data();
        
        if (!comment.userId) {
          console.warn('Comment without userId:', docSnap.id);
          continue;
        }
        
        try {
          const userProfile = await getDoc(doc(db, 'profiles', comment.userId));
          
          commentsData.push({
            id: docSnap.id,
            ...comment,
            userProfile: userProfile.exists() ? userProfile.data() : null,
          });
        } catch (error) {
          console.error('Error fetching user profile for comment:', error);
          commentsData.push({
            id: docSnap.id,
            ...comment,
            userProfile: null,
          });
        }
      }

      commentsData.sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0;
        return a.timestamp.toMillis() - b.timestamp.toMillis();
      });

      setComments(commentsData);
    });

    return () => unsubscribe();
  }, [sessionId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const commentsRef = collection(db, 'sessions', sessionId, 'comments');
      await addDoc(commentsRef, {
        userId: user.uid,
        message: newMessage,
        timestamp: serverTimestamp(),
        readBy: [user.uid],
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleRequestToJoin = async () => {
    if (!user || !session) return;

    // NOUVEAU - Vérification Girls Only pour les requêtes privées
    if (session.girlsOnly) {
      if (!userProfile) {
        setToast({ message: 'Please complete your profile first', type: 'error' });
        return;
      }

      if (!userProfile.gender) {
        setToast({ message: 'Please set your gender in your profile to join this session', type: 'warning' });
        setTimeout(() => router.push('/profile'), 2000);
        return;
      }

      if (userProfile.gender !== 'female') {
        setToast({ message: 'This is a Girls Only session. Only women can join.', type: 'error' });
        return;
      }
    }

    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      const currentProfile = profiles[user.uid] || {};

      // Ajouter une demande de rejoindre
      const newRequest = {
        userId: user.uid,
        userName: currentProfile.displayName || user.email,
        userEmail: user.email,
        requestedAt: new Date().toISOString(),
        status: 'pending'
      };

      await updateDoc(sessionRef, {
        joinRequests: arrayUnion(newRequest)
      });

      setToast({ message: 'Join request sent!', type: 'success' });

      // Envoyer email au créateur
      try {
        await authedFetch('/api/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'join_request',
            to: session.host_email,
            data: {
              sessionId: sessionId,
              sessionTitle: session.title,
              requesterName: currentProfile.displayName || user.email,
              date: session.date,
              time: session.time,
            },
          }),
        });
      } catch (emailError) {
        console.error('Email error:', emailError);
      }

    } catch (error) {
      console.error('Error requesting to join:', error);
      setToast({ message: 'Error sending request', type: 'error' });
    }
  };

  const handleApproveRequest = async (requestUserId) => {
    if (!session || !isHost) return;

    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      
      // Trouve la demande
      const request = session.joinRequests?.find(req => req.userId === requestUserId);
      if (!request) return;

      // Supprime la demande et ajoute aux participants
      await updateDoc(sessionRef, {
        joinRequests: arrayRemove(request),
        participants: arrayUnion(requestUserId)
      });

      setToast({ message: 'Request approved!', type: 'success' });

      // Envoyer email à l'utilisateur approuvé
      try {
        await authedFetch('/api/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'join_request_approved',
            to: request.userEmail,
            data: {
              sessionId: sessionId,
              sessionTitle: session.title,
              date: session.date,
              time: session.time,
              location: session.location,
            },
          }),
        });
      } catch (emailError) {
        console.error('Email error:', emailError);
      }

    } catch (error) {
      console.error('Error approving request:', error);
      setToast({ message: 'Error approving request', type: 'error' });
    }
  };

  const handleRejectRequest = async (requestUserId) => {
    if (!session || !isHost) return;

    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      
      // Trouve la demande
      const request = session.joinRequests?.find(req => req.userId === requestUserId);
      if (!request) return;

      // Supprime la demande
      await updateDoc(sessionRef, {
        joinRequests: arrayRemove(request)
      });

      setToast({ message: 'Request rejected', type: 'success' });

    } catch (error) {
      console.error('Error rejecting request:', error);
      setToast({ message: 'Error rejecting request', type: 'error' });
    }
  };

  const handleJoinSession = async () => {
    if (!user || !session) return;

    // NOUVEAU - Vérification Girls Only
    if (session.girlsOnly && !isParticipant) {
      if (!userProfile) {
        setToast({ message: 'Please complete your profile first', type: 'error' });
        return;
      }

      if (!userProfile.gender) {
        setToast({ message: 'Please set your gender in your profile to join this session', type: 'warning' });
        setTimeout(() => router.push('/profile'), 2000);
        return;
      }

      if (userProfile.gender !== 'female') {
        setToast({ message: 'This is a Girls Only session. Only women can join.', type: 'error' });
        return;
      }
    }

    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      const isParticipant = session.participants?.includes(user.uid);

      if (isParticipant) {
        // Leave session
        await updateDoc(sessionRef, {
          participants: arrayRemove(user.uid)
        });

        setToast({ message: 'You left the session', type: 'success' });
      } else {
        // Join session (session publique uniquement)
        await updateDoc(sessionRef, {
          participants: arrayUnion(user.uid)
        });

        setToast({ message: 'Successfully joined the session!', type: 'success' });

        // Récupère la session MISE À JOUR
        const updatedSessionDoc = await getDoc(sessionRef);
        const updatedSession = updatedSessionDoc.data();

        const currentProfile = profiles[user.uid] || userProfile || {};

        // 1. Send confirmation email to the user joining
        try {
          await authedFetch('/api/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'session_joined_confirmation',
              to: user.email,
              data: {
                sessionId: sessionId,
                sessionTitle: updatedSession.title,
                date: updatedSession.date,
                time: updatedSession.time,
                location: updatedSession.location,
                pace: updatedSession.pace,
                participantCount: updatedSession.participants?.length || 0,
              },
            }),
          });
        } catch (emailError) {
          console.error('Confirmation email error:', emailError);
        }

        // 2. Send email to the host
        if (updatedSession.host_email && updatedSession.host_user_id !== user.uid) {
          try {
            await authedFetch('/api/send-notification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'session_joined',
                to: updatedSession.host_email,
                data: {
                  sessionId: sessionId,
                  sessionTitle: updatedSession.title,
                  participantName: currentProfile.displayName || user.email,
                  date: updatedSession.date,
                  time: updatedSession.time,
                  location: updatedSession.location,
                  participantCount: updatedSession.participants?.length || 0,
                },
              }),
            });
          } catch (emailError) {
            console.error('Host notification email error:', emailError);
          }
        }

        // 3. Send email to ALL other participants
        const otherParticipants = updatedSession.participants?.filter(id => 
          id !== user.uid && id !== updatedSession.host_user_id
        ) || [];
        
        if (otherParticipants.length > 0) {
          for (const participantId of otherParticipants) {
            const participantProfile = profiles[participantId];
            
            if (participantProfile?.email) {
              try {
                await authedFetch('/api/send-notification', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: 'session_joined',
                    to: participantProfile.email,
                    data: {
                      sessionId: sessionId,
                      sessionTitle: updatedSession.title,
                      participantName: currentProfile.displayName || user.email,
                      date: updatedSession.date,
                      time: updatedSession.time,
                      location: updatedSession.location,
                      participantCount: updatedSession.participants?.length || 0,
                    },
                  }),
                });
              } catch (emailError) {
                console.error('Participant notification email error:', emailError);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error joining/leaving session:', error);
      setToast({ message: 'Error processing your request', type: 'error' });
    }
  };

  const handleShareWhatsApp = () => {
    const message = `Join my ${session.activity_type} session!

${session.title}

Date: ${session.date} at ${session.time}
Location: ${session.location}
${session.distance ? `Distance: ${session.distance}` : ''}

Join here: ${window.location.href}`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const messageTime = timestamp.toDate();
    const diffMs = now - messageTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return messageTime.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
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
  const participantCount = session.participants?.length || 0;
  const isFull = session.max_participants && participantCount >= session.max_participants;
  const hostProfile = profiles[session.host_user_id];
  
  // Vérifie si l'utilisateur a déjà une demande en attente
  const hasPendingRequest = session.joinRequests?.some(req => req.userId === user.uid && req.status === 'pending');
  const pendingRequests = session.joinRequests?.filter(req => req.status === 'pending') || [];

  return (
    <div className="min-h-screen bg-black">
      <Navigation user={user} />
      
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push('/browse')}
          className="text-gray-400 hover:text-orange-500 transition mb-4 md:mb-6 flex items-center gap-2 text-sm md:text-base"
        >
          ← Back to Sessions
        </button>

        {/* Session Header */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 md:p-8 mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4 flex-wrap">
                <span className="text-4xl md:text-5xl">{getActivityEmoji(session.activity_type)}</span>
                <h1 className="text-2xl md:text-4xl font-black text-white">{session.title}</h1>
                <span className={`px-3 md:px-4 py-1 rounded-full text-xs md:text-sm font-semibold border ${getIntensityColor(session.intensity)}`}>
                  {session.intensity}
                </span>
                {/* Badge Private */}
                {session.isPrivate && (
                  <span className="px-3 md:px-4 py-1 rounded-full text-xs md:text-sm font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    🔒 Private
                  </span>
                )}
                {/* NOUVEAU - Badge Girls Only */}
                {session.girlsOnly && (
                  <span className="px-3 md:px-4 py-1 rounded-full text-xs md:text-sm font-semibold bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/50 text-pink-400">
                    👭 Girls Only
                  </span>
                )}
              </div>

              {/* NOUVEAU - Encadré Girls Only */}
              {session.girlsOnly && (
                <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/30 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">👭</div>
                    <div>
                      <h3 className="text-pink-400 font-bold text-lg">Girls Only Session</h3>
                      <p className="text-sm text-pink-300/80">This session is exclusively for women</p>
                    </div>
                  </div>
                </div>
              )}
              
              <p className="text-gray-300 mb-4 md:mb-6 text-sm md:text-lg leading-relaxed">{session.description}</p>

              {/* Session Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-6">
                <div className="bg-black rounded-xl p-3 md:p-4 border border-gray-800">
                  <p className="text-gray-500 text-xs md:text-sm mb-1">Date</p>
                  <p className="text-white font-semibold text-sm md:text-base">📅 {session.date}</p>
                </div>
                <div className="bg-black rounded-xl p-3 md:p-4 border border-gray-800">
                  <p className="text-gray-500 text-xs md:text-sm mb-1">Time</p>
                  <p className="text-white font-semibold text-sm md:text-base">🕐 {session.time}</p>
                </div>
                <div className="bg-black rounded-xl p-3 md:p-4 border border-gray-800 sm:col-span-2">
                  <p className="text-gray-500 text-xs md:text-sm mb-1">Location</p>
                  <p className="text-white font-semibold text-sm md:text-base">📍 {session.location}</p>
                </div>
                {session.distance && (
                  <div className="bg-black rounded-xl p-3 md:p-4 border border-gray-800">
                    <p className="text-gray-500 text-xs md:text-sm mb-1">Distance</p>
                    <p className="text-white font-semibold text-sm md:text-base">📏 {session.distance}</p>
                  </div>
                )}
                {session.max_participants && (
                  <div className="bg-black rounded-xl p-3 md:p-4 border border-gray-800">
                    <p className="text-gray-500 text-xs md:text-sm mb-1">Max Participants</p>
                    <p className="text-white font-semibold text-sm md:text-base">👥 {session.max_participants}</p>
                  </div>
                )}
              </div>

              {/* Host Info */}
              <div 
                className="bg-black rounded-xl p-3 md:p-4 border border-gray-800 hover:border-orange-500/50 transition cursor-pointer inline-flex items-center gap-3"
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
                <div>
                  <p className="text-xs md:text-sm text-gray-500">Hosted by</p>
                  <p className="text-white font-semibold text-sm md:text-base">{hostProfile?.displayName || session.host_email}</p>
                  {hostProfile?.fitnessLevel && (
                    <p className="text-xs text-gray-500 capitalize">{hostProfile.fitnessLevel}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 w-full md:w-auto">
              {/* Join/Leave/Request Button */}
              {session.isPrivate && !isParticipant && !isHost ? (
                hasPendingRequest ? (
                  <button
                    disabled
                    className="w-full md:min-w-[200px] px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold text-base md:text-lg bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 cursor-not-allowed"
                  >
                    ⏳ Request Pending
                  </button>
                ) : (
                  <button
                    onClick={handleRequestToJoin}
                    className="w-full md:min-w-[200px] px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold text-base md:text-lg bg-purple-500 text-white hover:bg-purple-600 transition"
                  >
                    🔒 Request to Join
                  </button>
                )
              ) : (
                <button
                  onClick={handleJoinSession}
                  disabled={(!isParticipant && isFull) || isHost}
                  className={`w-full md:min-w-[200px] px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold text-base md:text-lg transition ${
                    isHost
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : isParticipant
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : isFull
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  {isHost ? 'You\'re the Host' : isParticipant ? 'Leave Session' : isFull ? 'Session Full' : 'Join Session'}
                </button>
              )}

              {/* WhatsApp Share Button */}
              <button
                onClick={handleShareWhatsApp}
                className="w-full md:min-w-[200px] px-6 md:px-8 py-3 md:py-4 bg-[#25D366] text-white rounded-xl font-bold text-base md:text-lg hover:bg-[#128C7E] transition flex items-center justify-center gap-2"
              >
                <span>📱</span> Share on WhatsApp
              </button>
            </div>
          </div>
        </div>

        {/* Join Requests (visible uniquement pour le host) */}
        {isHost && pendingRequests.length > 0 && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 md:p-8 mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">
              🔔 Join Requests ({pendingRequests.length})
            </h2>
            <div className="space-y-3">
              {pendingRequests.map((request) => {
                const requesterProfile = profiles[request.userId];
                return (
                  <div key={request.userId} className="bg-black rounded-xl p-4 border border-gray-800 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {requesterProfile?.profileImage ? (
                        <img 
                          src={requesterProfile.profileImage} 
                          alt={requesterProfile.displayName}
                          className="rounded-full object-cover border-2 border-gray-700"
                          style={{ width: '3rem', height: '3rem' }}
                        />
                      ) : (
                        <div className="rounded-full bg-gray-800 flex items-center justify-center text-xl border-2 border-gray-700"
                             style={{ width: '3rem', height: '3rem' }}>
                          👤
                        </div>
                      )}
                      <div>
                        <p className="text-white font-semibold">{request.userName}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(request.requestedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveRequest(request.userId)}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition text-sm"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request.userId)}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition text-sm"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Map */}
        <div className="mb-6 md:mb-8 rounded-2xl overflow-hidden border border-gray-800" style={{ height: '400px' }}>
          <SessionMap sessions={[session]} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Participants */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 md:p-8">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">
              👥 Participants ({participantCount})
            </h2>

            {participantCount === 0 ? (
              <p className="text-gray-500 text-center py-8 text-sm md:text-base">No participants yet. Be the first to join!</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {session.participants?.map((participantId) => {
                  const profile = profiles[participantId];
                  return (
                    <div
                      key={participantId}
                      onClick={() => router.push(`/profile/${participantId}`)}
                      className="bg-black rounded-xl p-3 md:p-4 border border-gray-800 hover:border-orange-500/50 transition cursor-pointer flex items-center gap-3"
                    >
                      {profile?.profileImage ? (
                        <img 
                          src={profile.profileImage} 
                          alt={profile.displayName}
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
                        <p className="text-white font-semibold text-sm md:text-base truncate">
                          {profile?.displayName || 'User'}
                          {participantId === session.host_user_id && (
                            <span className="ml-2 text-xs text-orange-500">HOST</span>
                          )}
                        </p>
                        {profile?.fitnessLevel && (
                          <p className="text-xs text-gray-500 capitalize">{profile.fitnessLevel}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Chat */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 md:p-8">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">💬 Chat</h2>

            {!isParticipant ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4 text-sm md:text-base">Join the session to participate in the chat</p>
              </div>
            ) : (
              <>
                {/* Messages */}
                <div className="space-y-3 md:space-y-4 mb-4 md:mb-6 max-h-[400px] overflow-y-auto">
                  {comments.length === 0 ? (
                    <p className="text-gray-500 text-center py-8 text-sm md:text-base">No messages yet. Start the conversation!</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="flex gap-2 md:gap-3">
                        {comment.userProfile?.profileImage ? (
                          <img 
                            src={comment.userProfile.profileImage} 
                            alt={comment.userProfile.displayName}
                            className="rounded-full object-cover border-2 border-gray-700 flex-shrink-0"
                            style={{ width: '2rem', height: '2rem', minWidth: '2rem', minHeight: '2rem' }}
                          />
                        ) : (
                          <div className="rounded-full bg-gray-800 flex items-center justify-center text-xs border-2 border-gray-700 flex-shrink-0"
                               style={{ width: '2rem', height: '2rem', minWidth: '2rem', minHeight: '2rem' }}>
                            👤
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-white font-semibold text-xs md:text-sm">
                              {comment.userProfile?.displayName || 'User'}
                              {comment.userId === session.host_user_id && (
                                <span className="ml-2 text-xs text-orange-500">HOST</span>
                              )}
                            </p>
                            <span className="text-xs text-gray-500">
                              {formatTime(comment.timestamp)}
                            </span>
                          </div>
                          <p className="text-gray-300 text-sm md:text-base break-words">{comment.message}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="flex gap-2 md:gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 p-3 md:p-4 bg-black border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm md:text-base"
                  />
                  <button
                    type="submit"
                    className="px-4 md:px-6 py-3 md:py-4 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition text-sm md:text-base"
                  >
                    Send
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}