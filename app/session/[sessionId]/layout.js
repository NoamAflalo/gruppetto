import { getAdminDb } from '@/lib/firebaseAdmin';

// Server-side metadata so shared session links (WhatsApp, iMessage, …) show
// the real session instead of the generic site preview.
export async function generateMetadata({ params }) {
  const { sessionId } = await params;
  try {
    const snap = await getAdminDb().collection('sessions').doc(sessionId).get();
    if (!snap.exists) return {};
    const s = snap.data();

    const title = `${s.title} — Gruppetto`;
    const description = `${s.date} at ${s.time} · ${s.location}. Join this ${s.activity_type || 'training'} session on Gruppetto.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        url: `https://www.getgruppetto.com/session/${sessionId}`,
        siteName: 'Gruppetto',
        images: ['/og-image.png'],
      },
      twitter: {
        card: 'summary',
        title,
        description,
      },
    };
  } catch (error) {
    console.error('Session metadata error:', error.message);
    return {};
  }
}

export default function SessionLayout({ children }) {
  return children;
}
