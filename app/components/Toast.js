'use client';
import { useEffect } from 'react';

export default function Toast({ message, type = 'error', onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // Disparaît après 5 secondes

    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    error: 'bg-red-500/90 border-red-500',
    success: 'bg-green-500/90 border-green-500',
    info: 'bg-blue-500/90 border-blue-500',
    warning: 'bg-yellow-500/90 border-yellow-500',
  };

  const icons = {
    error: '❌',
    success: '✅',
    info: 'ℹ️',
    warning: '⚠️',
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className={`${colors[type]} border-2 rounded-xl p-4 shadow-xl max-w-md`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{icons[type]}</span>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-xl leading-none flex-shrink-0"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}