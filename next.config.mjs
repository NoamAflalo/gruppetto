/** @type {import('next').NextConfig} */
const nextConfig = {
  // Serve Firebase's auth helper from our own domain so the Google sign-in
  // popup is same-origin. Chrome's third-party storage partitioning breaks
  // the popup handshake when authDomain is <project>.firebaseapp.com.
  // https://firebase.google.com/docs/auth/web/redirect-best-practices
  async rewrites() {
    return [
      {
        source: '/__/auth/:path*',
        destination: 'https://workout-9ed5f.firebaseapp.com/__/auth/:path*',
      },
      {
        source: '/__/firebase/:path*',
        destination: 'https://workout-9ed5f.firebaseapp.com/__/firebase/:path*',
      },
    ];
  },
};

export default nextConfig;
