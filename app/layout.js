import "./globals.css";
import { Barlow, Barlow_Condensed } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Analytics } from '@vercel/analytics/next';
import Footer from './components/Footer';
import { Toaster } from 'react-hot-toast';

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
});

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-display',
});

export const viewport = {
  themeColor: '#0C0B09',
};

export const metadata = {
  // Without this, relative OG/Twitter image paths resolve against localhost
  // and link previews break wherever the site is shared.
  metadataBase: new URL('https://www.getgruppetto.com'),
  title: 'Gruppetto - Find Training Partners in London',
  description: 'Join running, cycling, and swimming sessions with athletes in London. Connect with local training partners and level up your fitness.',
  keywords: 'running, cycling, swimming, training partners, London, fitness, workout buddy, run club, cycling club',
  authors: [{ name: 'Gruppetto' }],
  manifest: '/site.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Gruppetto',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: 'https://www.getgruppetto.com',
    title: 'Gruppetto - Training Partners London',
    description: 'Find and join training sessions with local athletes in London',
    siteName: 'Gruppetto',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gruppetto - Training Partners London',
    description: 'Find and join training sessions with local athletes',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="en" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body className="antialiased font-sans bg-ground text-ink" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#17140F',
              color: '#F2EFE9',
              border: '1px solid #2A251E',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <div style={{ flex: 1 }}>
          {children}
        </div>
        <Footer />
        <Analytics />
        {/* Rendering this without an id emits `gtag/js?id=undefined` and collects
            nothing, so only mount it once the measurement id is actually set. */}
        {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
      </body>
    </html>
  );
}