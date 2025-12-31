import "./globals.css";
import { GoogleAnalytics } from '@next/third-parties/google';

export const metadata = {
  title: 'Gruppetto - Find Training Partners in London',
  description: 'Join running, cycling, and swimming sessions with athletes in London. Connect with local training partners and level up your fitness.',
  keywords: 'running, cycling, swimming, training partners, London, fitness, workout buddy, run club, cycling club',
  authors: [{ name: 'Gruppetto' }],
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: 'https://www.getgruppetto.com',
    title: 'Gruppetto - Training Partners London',
    description: 'Find and join training sessions with local athletes in London',
    siteName: 'Gruppetto',
    // images: ['/og-image.png'], // Décommente quand tu auras créé l'image
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gruppetto - Training Partners London',
    description: 'Find and join training sessions with local athletes',
    // images: ['/og-image.png'], // Décommente quand tu auras créé l'image
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
      </body>
    </html>
  );
}