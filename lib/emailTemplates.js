// Shared email templates for Gruppetto notifications.
// All user-provided values are HTML-escaped here, so callers can pass raw data.

const BASE_URL = 'https://www.getgruppetto.com';

export const EMAIL_FROM = process.env.EMAIL_FROM || 'Gruppetto <onboarding@resend.dev>';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function button(href, label, color = '#f97316') {
  return `<a href="${href}" style="background-color: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">${label}</a>`;
}

/**
 * Builds { subject, html } for a notification type, or null for unknown types.
 * `rawData` fields: sessionId, sessionTitle, date, time, location, pace,
 * participantCount, participantName, requesterName (per type).
 */
export function buildEmail(type, rawData) {
  const d = Object.fromEntries(
    Object.entries(rawData || {}).map(([k, v]) => [k, escapeHtml(v)])
  );
  const sessionUrl = `${BASE_URL}/session/${encodeURIComponent(String(rawData?.sessionId ?? ''))}`;

  switch (type) {
    case 'session_joined_confirmation':
      return {
        subject: `You joined: ${d.sessionTitle}`,
        html: `
          <h2>You're all set!</h2>
          <p>You successfully joined this training session:</p>
          <h3>${d.sessionTitle}</h3>
          <p><strong>Date:</strong> ${d.date} at ${d.time}</p>
          <p><strong>Location:</strong> ${d.location}</p>
          <p><strong>Pace:</strong> ${d.pace || 'Not specified'}</p>
          <p><strong>Total participants:</strong> ${d.participantCount}</p>
          <p>We'll send you a reminder the day before. See you there! 💪</p>
          <br/>
          ${button(sessionUrl, 'View Session Details')}
        `,
      };

    case 'session_joined':
      return {
        subject: `Someone joined your session: ${d.sessionTitle}`,
        html: `
          <h2>Great news!</h2>
          <p><strong>${d.participantName}</strong> just joined your training session:</p>
          <h3>${d.sessionTitle}</h3>
          <p><strong>Date:</strong> ${d.date} at ${d.time}</p>
          <p><strong>Location:</strong> ${d.location}</p>
          <p>Total participants: ${d.participantCount}</p>
          <br/>
          ${button(sessionUrl, 'View Session')}
        `,
      };

    case 'session_created':
      return {
        subject: `Session created: ${d.sessionTitle}`,
        html: `
          <h2>Your session is live!</h2>
          <h3>${d.sessionTitle}</h3>
          <p><strong>Date:</strong> ${d.date} at ${d.time}</p>
          <p><strong>Location:</strong> ${d.location}</p>
          <p>Your session is now visible to all Gruppetto members.</p>
          <br/>
          ${button(sessionUrl, 'View Session')}
        `,
      };

    case 'session_reminder':
      return {
        subject: `Reminder: ${d.sessionTitle} tomorrow`,
        html: `
          <h2>Don't forget!</h2>
          <p>Your training session is tomorrow:</p>
          <h3>${d.sessionTitle}</h3>
          <p><strong>Date:</strong> ${d.date} at ${d.time}</p>
          <p><strong>Location:</strong> ${d.location}</p>
          <p><strong>Participants:</strong> ${d.participantCount}</p>
          <p>See you there! 💪</p>
          <br/>
          ${button(sessionUrl, 'View Session Details')}
        `,
      };

    case 'join_request':
      return {
        subject: `Join Request: ${d.sessionTitle}`,
        html: `
          <h2>🔔 New Join Request</h2>
          <p><strong>${d.requesterName}</strong> wants to join your private session:</p>
          <h3>${d.sessionTitle}</h3>
          <p><strong>Date:</strong> ${d.date} at ${d.time}</p>
          <p>Go to your session to approve or reject this request.</p>
          <br/>
          ${button(sessionUrl, 'View Requests', '#a855f7')}
        `,
      };

    case 'join_request_approved':
      return {
        subject: `Request Approved: ${d.sessionTitle}`,
        html: `
          <h2>🎉 Your request was approved!</h2>
          <p>You've been accepted to join this training session:</p>
          <h3>${d.sessionTitle}</h3>
          <p><strong>Date:</strong> ${d.date} at ${d.time}</p>
          <p><strong>Location:</strong> ${d.location}</p>
          <p>We'll send you a reminder the day before. See you there! 💪</p>
          <br/>
          ${button(sessionUrl, 'View Session Details')}
        `,
      };

    default:
      return null;
  }
}
