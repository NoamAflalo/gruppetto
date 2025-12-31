import "./globals.css";
import { GoogleAnalytics } from '@next/third-parties/google';
import Footer from './components/Footer';

export const metadata = {
  title: 'Gruppetto - Find Training Partners in London',
  description: 'Join running, cycling, and swimming sessions with athletes in London. Connect with local training partners and level up your fitness.',
  keywords: 'running, cycling, swimming, training partners, London, fitness, workout buddy, run club, cycling club',
  authors: [{ name: 'Gruppetto' }],
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
  return (
    <html lang="en">
      <body className="antialiased" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div style={{ flex: 1 }}>
          {children}
        </div>
        <Footer />
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
      </body>
    </html>
  );
}