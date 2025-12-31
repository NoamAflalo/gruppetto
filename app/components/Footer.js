'use client';

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid #374151',
      background: '#000',
      marginTop: 'auto'
    }}>
      <div style={{
        maxWidth: '80rem',
        margin: '0 auto',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        alignItems: 'center',
        textAlign: 'center'
      }}
      className="footer-content"
      >
        <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
          © 2025 Gruppetto. All rights reserved.
        </p>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <a 
            href="/terms" 
            style={{ 
              color: '#9ca3af', 
              fontSize: '0.875rem',
              textDecoration: 'none',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.color = '#f97316'}
            onMouseLeave={(e) => e.target.style.color = '#9ca3af'}
          >
            Terms & Conditions
          </a>
          <a 
            href="/privacy" 
            style={{ 
              color: '#9ca3af', 
              fontSize: '0.875rem',
              textDecoration: 'none',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.color = '#f97316'}
            onMouseLeave={(e) => e.target.style.color = '#9ca3af'}
          >
            Privacy Policy
          </a>
        </div>
      </div>

      <style jsx>{`
        @media (min-width: 768px) {
          .footer-content {
            flex-direction: row !important;
            justify-content: space-between !important;
            text-align: left !important;
          }
        }
      `}</style>
    </footer>
  );
}