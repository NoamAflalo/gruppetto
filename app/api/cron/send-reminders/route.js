import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import { buildEmail, EMAIL_FROM } from '@/lib/emailTemplates';

// Daily Vercel cron (see vercel.json) that emails every participant of
// tomorrow's sessions. Firestore is read with firebase-admin (bypasses
// security rules) via lib/firebaseAdmin.

// Sessions store dates as YYYY-MM-DD in London local time.
function tomorrowInLondon() {
  const now = new Date();
  const london = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
  london.setDate(london.getDate() + 1);
  const y = london.getFullYear();
  const m = String(london.getMonth() + 1).padStart(2, '0');
  const d = String(london.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function GET(request) {
  // Vercel sends "Authorization: Bearer <CRON_SECRET>" when CRON_SECRET is set.
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const resend = new Resend(process.env.RESEND_API_KEY);
    const targetDate = tomorrowInLondon();

    const snapshot = await db
      .collection('sessions')
      .where('date', '==', targetDate)
      .get();

    let sent = 0;
    let failed = 0;
    const processedSessions = [];

    for (const docSnap of snapshot.docs) {
      const session = docSnap.data();

      // Idempotency: skip sessions already reminded (cron retries, redeploys).
      if (session.reminderSentAt) continue;

      const participantIds = session.participants || [];
      const recipients = new Set();
      if (session.host_email) recipients.add(session.host_email);

      // Participant emails come from Firebase Auth (batched, max 100/call)
      if (participantIds.length > 0) {
        const { users } = await getAdminAuth().getUsers(
          participantIds.slice(0, 100).map((uid) => ({ uid }))
        );
        users.forEach((u) => u.email && recipients.add(u.email));
      }

      const email = buildEmail('session_reminder', {
        sessionId: docSnap.id,
        sessionTitle: session.title,
        date: session.date,
        time: session.time,
        location: session.location,
        participantCount: participantIds.length,
      });

      for (const to of recipients) {
        const { error } = await resend.emails.send({
          from: EMAIL_FROM,
          to: [to],
          subject: email.subject,
          html: email.html,
        });
        if (error) {
          console.error(`Reminder to ${to} failed:`, error);
          failed++;
        } else {
          sent++;
        }
      }

      await docSnap.ref.update({ reminderSentAt: new Date().toISOString() });
      processedSessions.push(docSnap.id);
    }

    return NextResponse.json({
      date: targetDate,
      sessions: processedSessions.length,
      emailsSent: sent,
      emailsFailed: failed,
    });
  } catch (error) {
    console.error('Reminder cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
