import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    const { type, to, data } = await request.json();
    
    let subject, html;
    
    switch(type) {
      case 'session_joined':
        subject = `Someone joined your session: ${data.sessionTitle}`;
        html = `
          <h2>Great news!</h2>
          <p><strong>${data.participantName}</strong> just joined your training session:</p>
          <h3>${data.sessionTitle}</h3>
          <p><strong>Date:</strong> ${data.date} at ${data.time}</p>
          <p><strong>Location:</strong> ${data.location}</p>
          <p>Total participants: ${data.participantCount}</p>
          <br/>
          <a href="https://grupetto.com/sessions" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">View Session</a>
        `;
        break;
        
      case 'session_created':
        subject = `Session created: ${data.sessionTitle}`;
        html = `
          <h2>Your session is live!</h2>
          <h3>${data.sessionTitle}</h3>
          <p><strong>Date:</strong> ${data.date} at ${data.time}</p>
          <p><strong>Location:</strong> ${data.location}</p>
          <p>Your session is now visible to all Grupetto members.</p>
          <br/>
          <a href="https://grupetto.com/sessions" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">View All Sessions</a>
        `;
        break;
        
      case 'session_reminder':
        subject = `Reminder: ${data.sessionTitle} tomorrow`;
        html = `
          <h2>Don't forget!</h2>
          <p>Your training session is tomorrow:</p>
          <h3>${data.sessionTitle}</h3>
          <p><strong>Date:</strong> ${data.date} at ${data.time}</p>
          <p><strong>Location:</strong> ${data.location}</p>
          <p><strong>Participants:</strong> ${data.participantCount}</p>
          <p>See you there! 💪</p>
        `;
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });
    }
    
    const { data: emailData, error } = await resend.emails.send({
      from: 'Grupetto <onboarding@resend.dev>', // Change this later to your domain
      to: [to],
      subject: subject,
      html: html,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: emailData });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}