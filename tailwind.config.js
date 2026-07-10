/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Night Ride palette — warm charcoals, orange as the single brand voice
        ground: '#0C0B09',   // page background
        card: '#17140F',     // raised surfaces
        card2: '#211D17',    // hover / secondary surfaces
        line: '#2A251E',     // hairline borders
        ink: '#F2EFE9',      // primary text
        soft: '#C9C4B9',     // secondary text
        muted: '#A39E93',    // tertiary text / labels
        brand: {
          DEFAULT: '#F97316',
          hover: '#EA580C',
          soft: '#FFB380',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', '"Arial Narrow"', 'sans-serif'],
        sans: ['var(--font-body)', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
