import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

// Daily Vercel cron (see vercel.json) that keeps a rolling window of future
// occurrences generated from each active recurring-session template. Each
// generated doc is a normal `sessions` document — join/chat/rules/reminders
// all apply unchanged, tagged only by `recurringSessionId`.

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const WEEKS_AHEAD = 6;

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const templatesSnap = await db.collection('recurringSessions').where('active', '==', true).get();

    let created = 0;
    const results = [];

    for (const templateDoc of templatesSnap.docs) {
      const template = templateDoc.data();
      const weekdayIdx = WEEKDAYS.indexOf(template.weekday);
      if (weekdayIdx === -1) continue;

      const targetDates = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (let i = 1; i <= WEEKS_AHEAD * 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        if (d.getDay() === weekdayIdx) targetDates.push(toDateStr(d));
      }

      // Small per-series volume (a handful of docs) — fetch all and filter
      // in JS rather than a composite ==+in query that would need an index.
      const existingSnap = await db.collection('sessions')
        .where('recurringSessionId', '==', templateDoc.id)
        .get();
      const existingDates = new Set(existingSnap.docs.map((d) => d.data().date));

      let createdForTemplate = 0;
      for (const dateStr of targetDates) {
        if (existingDates.has(dateStr)) continue;

        const sessionData = {
          title: template.title,
          description: template.description,
          activity_type: template.activity_type,
          date: dateStr,
          time: template.time,
          location: template.location,
          meetingPoint: template.meetingPoint,
          destination: template.destination || '',
          intensity: template.intensity,
          distance: template.distance,
          max_participants: template.max_participants,
          isPrivate: template.isPrivate,
          girlsOnly: template.girlsOnly,
          host_user_id: template.host_user_id,
          host_email: template.host_email,
          participants: [template.host_user_id],
          recurringSessionId: templateDoc.id,
          created_at: new Date(),
        };
        if (template.isPrivate) sessionData.joinRequests = [];
        if (template.club_id) {
          sessionData.club_id = template.club_id;
          sessionData.is_club_session = true;
        }

        await db.collection('sessions').add(sessionData);
        created++;
        createdForTemplate++;
      }
      results.push({ templateId: templateDoc.id, title: template.title, created: createdForTemplate });
    }

    return NextResponse.json({ templatesProcessed: templatesSnap.size, sessionsCreated: created, results });
  } catch (error) {
    console.error('Recurring generation cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
