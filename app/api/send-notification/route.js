import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { verifyFirebaseToken, rateLimit } from '@/lib/serverAuth';
import { buildEmail, EMAIL_FROM } from '@/lib/emailTemplates';

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  try {
    const user = await verifyFirebaseToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!rateLimit(`notify:${user.uid}`, { limit: 60, windowMs: 60 * 60 * 1000 })) {
      return NextResponse.json(
        { error: 'Too many requests, try again later' },
        { status: 429 }
      );
    }

    const { type, to, data } = await request.json();

    if (!to || typeof to !== 'string' || !EMAIL_REGEX.test(to)) {
      return NextResponse.json({ error: 'Invalid recipient' }, { status: 400 });
    }

    console.log('📬 Email API called:', { type, to });

    const email = buildEmail(type, data);
    if (!email) {
      return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });
    }

    const { data: emailData, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject: email.subject,
      html: email.html,
    });

    if (error) {
      console.error('📧 Email send error:', error);
      return NextResponse.json({ error }, { status: 400 });
    }

    console.log('✅ Email sent successfully to:', to);
    return NextResponse.json({ success: true, data: emailData });
  } catch (error) {
    console.error('❌ Email API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
