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
import ActivityIcon from '../../components/ActivityIcon';
import { getIntensityColor, getWeekdayName } from '@/lib/sessionUi';
import { ArrowLeft, Calendar, Clock, MapPin, Ruler, Users, User, Lock, Hourglass, Share2, Bell, Check, X, MessagesSquare, Repeat } from 'lucide-react';

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

        // Note: we deliberately don't email every existing participant on each
        // join — it doesn't scale (N emails per join) and reads as spam.
      }
    } catch (error) {
      console.error('Error joining/leaving session:', error);
      setToast({ message: 'Error processing your request', type: 'error' });
    }
  };

  const handleStopRecurring = async () => {
    if (!session?.recurringSessionId) return;
    try {
      await updateDoc(doc(db, 'recurringSessions', session.recurringSessionId), { active: false });
      setToast({ message: 'This session will no longer repeat. Already-scheduled sessions are unaffected.', type: 'success' });
    } catch (error) {
      console.error('Error stopping recurring session:', error);
      setToast({ message: 'Error updating the recurring series', type: 'error' });
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

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-ground">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-4">
          <div className="skeleton h-8 w-40" />
          <div className="skeleton h-64 rounded-2xl" />
          <div className="skeleton h-96 rounded-2xl" />
        </div>
      </div>
    );
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
    <div className="min-h-screen bg-ground">
      <Navigation user={user} />
      
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push('/browse')}
          className="text-muted hover:text-brand transition mb-4 md:mb-6 flex items-center gap-2 text-sm md:text-base"
        >
          <ArrowLeft size={16} /> Back to Sessions
        </button>

        {/* Session Header */}
        <div className="bg-card rounded-2xl border border-line p-4 md:p-8 mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-2.5 md:gap-3 mb-3 md:mb-4 flex-wrap">
                <ActivityIcon type={session.activity_type} boxed size={22} boxClass="w-12 h-12" />
                <h1 className="font-display uppercase text-3xl md:text-5xl text-ink leading-tight">{session.title}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border ${getIntensityColor(session.intensity)}`}>
                  {session.intensity}
                </span>
                {session.isPrivate && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-card2 text-soft border border-line inline-flex items-center gap-1">
                    <Lock size={11} /> Private
                  </span>
                )}
                {session.girlsOnly && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-pink-500/10 border border-pink-500/40 text-pink-400">
                    Girls only
                  </span>
                )}
                {session.recurringSessionId && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-brand/10 border border-brand/30 text-brand-soft inline-flex items-center gap-1">
                    <Repeat size={11} /> Repeats every {getWeekdayName(session.date)}
                  </span>
                )}
              </div>

              {session.recurringSessionId && isHost && (
                <button
                  onClick={handleStopRecurring}
                  className="text-xs text-muted hover:text-red-400 transition underline mb-4 -mt-2 inline-block"
                >
                  Stop repeating this session
                </button>
              )}

              {session.girlsOnly && (
                <div className="bg-pink-500/5 border border-pink-500/25 rounded-xl p-4 mb-6">
                  <h3 className="text-pink-400 font-bold">Girls Only Session</h3>
                  <p className="text-sm text-pink-300/80">This session is exclusively for women</p>
                </div>
              )}
              
              <p className="text-soft mb-4 md:mb-6 text-sm md:text-lg leading-relaxed">{session.description}</p>

              {/* Session Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-6">
                <div className="bg-ground rounded-xl p-3 md:p-4 border border-line">
                  <p className="text-muted text-xs md:text-sm mb-1">Date</p>
                  <p className="text-ink font-semibold text-sm md:text-base inline-flex items-center gap-2"><Calendar size={15} className="text-brand" /> {session.date}</p>
                </div>
                <div className="bg-ground rounded-xl p-3 md:p-4 border border-line">
                  <p className="text-muted text-xs md:text-sm mb-1">Time</p>
                  <p className="text-ink font-semibold text-sm md:text-base inline-flex items-center gap-2"><Clock size={15} className="text-brand" /> {session.time}</p>
                </div>
                <div className="bg-ground rounded-xl p-3 md:p-4 border border-line sm:col-span-2">
                  <p className="text-muted text-xs md:text-sm mb-1">Location</p>
                  <p className="text-ink font-semibold text-sm md:text-base inline-flex items-center gap-2"><MapPin size={15} className="text-brand" /> {session.location}</p>
                </div>
                {session.distance && (
                  <div className="bg-ground rounded-xl p-3 md:p-4 border border-line">
                    <p className="text-muted text-xs md:text-sm mb-1">Distance</p>
                    <p className="text-ink font-semibold text-sm md:text-base inline-flex items-center gap-2"><Ruler size={15} className="text-brand" /> {session.distance}</p>
                  </div>
                )}
                {session.max_participants && (
                  <div className="bg-ground rounded-xl p-3 md:p-4 border border-line">
                    <p className="text-muted text-xs md:text-sm mb-1">Max Participants</p>
                    <p className="text-ink font-semibold text-sm md:text-base inline-flex items-center gap-2"><Users size={15} className="text-brand" /> {session.max_participants}</p>
                  </div>
                )}
              </div>

              {/* Host Info */}
              <div 
                className="bg-ground rounded-xl p-3 md:p-4 border border-line hover:border-brand/50 transition cursor-pointer inline-flex items-center gap-3"
                onClick={() => router.push(`/profile/${session.host_user_id}`)}
              >
                {hostProfile?.profileImage ? (
                  <img 
                    src={hostProfile.profileImage} 
                    alt={hostProfile.displayName}
                    className="rounded-full object-cover border-2 border-brand"
                    style={{ width: '3rem', height: '3rem', minWidth: '3rem', minHeight: '3rem' }}
                  />
                ) : (
                  <div className="rounded-full bg-card2 flex items-center justify-center border-2 border-brand"
                       style={{ width: '3rem', height: '3rem', minWidth: '3rem', minHeight: '3rem' }}>
                    <User size={20} className="text-muted" />
                  </div>
                )}
                <div>
                  <p className="text-xs md:text-sm text-muted">Hosted by</p>
                  <p className="text-ink font-semibold text-sm md:text-base">{hostProfile?.displayName || session.host_email}</p>
                  {hostProfile?.fitnessLevel && (
                    <p className="text-xs text-muted capitalize">{hostProfile.fitnessLevel}</p>
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
                    className="w-full md:min-w-[200px] px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold text-base md:text-lg bg-card2 text-soft border border-line cursor-not-allowed"
                  >
                    <Hourglass size={16} className="inline -mt-0.5 mr-1.5" /> Request Pending
                  </button>
                ) : (
                  <button
                    onClick={handleRequestToJoin}
                    className="w-full md:min-w-[200px] px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold text-base md:text-lg bg-brand text-white hover:bg-brand-hover transition"
                  >
                    <Lock size={16} className="inline -mt-0.5 mr-1.5" /> Request to Join
                  </button>
                )
              ) : (
                <button
                  onClick={handleJoinSession}
                  disabled={(!isParticipant && isFull) || isHost}
                  className={`w-full md:min-w-[200px] px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold text-base md:text-lg transition ${
                    isHost
                      ? 'bg-card2 text-muted cursor-not-allowed'
                      : isParticipant
                      ? 'bg-card2 text-soft border border-line hover:border-red-500/50 hover:text-red-400'
                      : isFull
                      ? 'bg-card2 text-muted cursor-not-allowed'
                      : 'bg-brand text-white hover:bg-brand-hover'
                  }`}
                >
                  {isHost ? 'You\'re the Host' : isParticipant ? 'Leave Session' : isFull ? 'Session Full' : 'Join Session'}
                </button>
              )}

              {/* WhatsApp Share Button */}
              <button
                onClick={handleShareWhatsApp}
                className="w-full md:min-w-[200px] px-6 md:px-8 py-3 md:py-4 bg-card2 text-ink border border-line rounded-xl font-bold text-base md:text-lg hover:border-[#25D366]/60 hover:text-[#4AE383] transition flex items-center justify-center gap-2"
              >
                <Share2 size={17} /> Share on WhatsApp
              </button>
            </div>
          </div>
        </div>

        {/* Join Requests (visible uniquement pour le host) */}
        {isHost && pendingRequests.length > 0 && (
          <div className="bg-card rounded-2xl border border-line p-4 md:p-8 mb-6 md:mb-8">
            <h2 className="font-display uppercase text-xl md:text-2xl text-ink mb-4 md:mb-6 flex items-center gap-2">
              <Bell size={19} className="text-brand" /> Join Requests ({pendingRequests.length})
            </h2>
            <div className="space-y-3">
              {pendingRequests.map((request) => {
                const requesterProfile = profiles[request.userId];
                return (
                  <div key={request.userId} className="bg-ground rounded-xl p-4 border border-line flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {requesterProfile?.profileImage ? (
                        <img 
                          src={requesterProfile.profileImage} 
                          alt={requesterProfile.displayName}
                          className="rounded-full object-cover border-2 border-line"
                          style={{ width: '3rem', height: '3rem' }}
                        />
                      ) : (
                        <div className="rounded-full bg-card2 flex items-center justify-center border-2 border-line"
                             style={{ width: '3rem', height: '3rem' }}>
                          <User size={20} className="text-muted" />
                        </div>
                      )}
                      <div>
                        <p className="text-ink font-semibold">{request.userName}</p>
                        <p className="text-xs text-muted">
                          {new Date(request.requestedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveRequest(request.userId)}
                        className="px-4 py-2 bg-brand text-white rounded-lg font-semibold hover:bg-brand-hover transition text-sm inline-flex items-center gap-1.5"
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request.userId)}
                        className="px-4 py-2 bg-card2 text-soft border border-line rounded-lg font-semibold hover:border-red-500/50 hover:text-red-400 transition text-sm inline-flex items-center gap-1.5"
                      >
                        <X size={14} /> Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Map */}
        <div className="mb-6 md:mb-8 rounded-2xl overflow-hidden border border-line" style={{ height: '400px' }}>
          <SessionMap sessions={[session]} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Participants */}
          <div className="bg-card rounded-2xl border border-line p-4 md:p-8">
            <h2 className="font-display uppercase text-xl md:text-2xl text-ink mb-4 md:mb-6 flex items-center gap-2">
              <Users size={19} className="text-brand" /> Participants ({participantCount})
            </h2>

            {participantCount === 0 ? (
              <p className="text-muted text-center py-8 text-sm md:text-base">No participants yet. Be the first to join!</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {session.participants?.map((participantId) => {
                  const profile = profiles[participantId];
                  return (
                    <div
                      key={participantId}
                      onClick={() => router.push(`/profile/${participantId}`)}
                      className="bg-ground rounded-xl p-3 md:p-4 border border-line hover:border-brand/50 transition cursor-pointer flex items-center gap-3"
                    >
                      {profile?.profileImage ? (
                        <img 
                          src={profile.profileImage} 
                          alt={profile.displayName}
                          className="rounded-full object-cover border-2 border-line"
                          style={{ width: '2.5rem', height: '2.5rem', minWidth: '2.5rem', minHeight: '2.5rem' }}
                        />
                      ) : (
                        <div className="rounded-full bg-card2 flex items-center justify-center border-2 border-line"
                             style={{ width: '2.5rem', height: '2.5rem', minWidth: '2.5rem', minHeight: '2.5rem' }}>
                          <User size={17} className="text-muted" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-ink font-semibold text-sm md:text-base truncate">
                          {profile?.displayName || 'User'}
                          {participantId === session.host_user_id && (
                            <span className="ml-2 text-xs text-brand">HOST</span>
                          )}
                        </p>
                        {profile?.fitnessLevel && (
                          <p className="text-xs text-muted capitalize">{profile.fitnessLevel}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Chat */}
          <div className="bg-card rounded-2xl border border-line p-4 md:p-8">
            <h2 className="font-display uppercase text-xl md:text-2xl text-ink mb-4 md:mb-6 flex items-center gap-2">
              <MessagesSquare size={19} className="text-brand" /> Chat
            </h2>

            {!isParticipant ? (
              <div className="text-center py-8">
                <p className="text-muted mb-4 text-sm md:text-base">Join the session to participate in the chat</p>
              </div>
            ) : (
              <>
                {/* Messages */}
                <div className="space-y-3 md:space-y-4 mb-4 md:mb-6 max-h-[400px] overflow-y-auto">
                  {comments.length === 0 ? (
                    <p className="text-muted text-center py-8 text-sm md:text-base">No messages yet. Start the conversation!</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="flex gap-2 md:gap-3">
                        {comment.userProfile?.profileImage ? (
                          <img 
                            src={comment.userProfile.profileImage} 
                            alt={comment.userProfile.displayName}
                            className="rounded-full object-cover border-2 border-line flex-shrink-0"
                            style={{ width: '2rem', height: '2rem', minWidth: '2rem', minHeight: '2rem' }}
                          />
                        ) : (
                          <div className="rounded-full bg-card2 flex items-center justify-center border-2 border-line flex-shrink-0"
                               style={{ width: '2rem', height: '2rem', minWidth: '2rem', minHeight: '2rem' }}>
                            <User size={13} className="text-muted" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-ink font-semibold text-xs md:text-sm">
                              {comment.userProfile?.displayName || 'User'}
                              {comment.userId === session.host_user_id && (
                                <span className="ml-2 text-xs text-brand">HOST</span>
                              )}
                            </p>
                            <span className="text-xs text-muted">
                              {formatTime(comment.timestamp)}
                            </span>
                          </div>
                          <p className="text-soft text-sm md:text-base break-words">{comment.message}</p>
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
                    className="flex-1 p-3 md:p-4 bg-ground border border-line rounded-xl text-ink placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-brand text-sm md:text-base"
                  />
                  <button
                    type="submit"
                    className="px-4 md:px-6 py-3 md:py-4 bg-brand text-white rounded-xl font-semibold hover:bg-brand-hover transition text-sm md:text-base"
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