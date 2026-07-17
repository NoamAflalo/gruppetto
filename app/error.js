'use client';

export default function Error({ error, reset }) {
  console.error('Page error:', error);

  return (
    <div className="min-h-screen bg-ground flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <h1 className="font-display uppercase text-4xl text-ink mb-3">
          Something broke<span className="text-brand">.</span>
        </h1>
        <p className="text-muted mb-6">
          Sorry about that — it&apos;s on us. Try again, and if it keeps happening,
          come back in a few minutes.
        </p>
        <button
          onClick={reset}
          className="bg-brand text-white px-6 py-3 rounded-lg hover:bg-brand-hover font-semibold transition"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
