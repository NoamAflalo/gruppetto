import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/profile?strava_error=denied', request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/profile?strava_error=no_code', request.url));
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Strava token error:', tokenData);
      return NextResponse.redirect(new URL('/profile?strava_error=token_failed', request.url));
    }

    // Build redirect URL with athlete data
    const params = new URLSearchParams({
      strava_id: tokenData.athlete.id,
      strava_username: tokenData.athlete.username || tokenData.athlete.firstname + tokenData.athlete.lastname,
      strava_firstname: tokenData.athlete.firstname || '',
      strava_lastname: tokenData.athlete.lastname || '',
    });

    return NextResponse.redirect(new URL(`/profile?${params.toString()}`, request.url));
  } catch (error) {
    console.error('Strava OAuth error:', error);
    return NextResponse.redirect(new URL('/profile?strava_error=server_error', request.url));
  }
}