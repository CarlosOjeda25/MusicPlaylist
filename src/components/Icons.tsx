import React from 'react';

export function SpotifyIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.502 17.306c-.218.358-.684.474-1.042.256-2.856-1.745-6.452-2.14-10.686-1.173-.41.094-.817-.16-.91-.57-.095-.41.16-.817.57-.91 4.636-1.06 8.608-.614 11.812 1.355.358.218.474.684.256 1.042zm1.468-3.262c-.275.448-.86.592-1.308.318-3.27-2.01-8.254-2.593-12.122-1.417-.502.152-1.033-.134-1.185-.636-.152-.502.134-1.033.636-1.185 4.417-1.34 9.907-.69 13.66 1.622.448.275.592.86.319 1.308zm.135-3.396C15.19 8.36 8.73 8.146 4.992 9.281c-.604.183-1.246-.164-1.43-.768-.182-.604.165-1.246.768-1.43 4.298-1.304 11.43-1.053 15.932 1.62.544.323.722 1.03.4 1.574-.323.545-1.03.723-1.557.371z" />
    </svg>
  );
}

export function YouTubeIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export function GoogleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.28-2.09 3.66-5.18 3.66-9.14z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.25 21.36 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.59H1.26C.46 8.2.01 10.04.01 12s.45 3.8 1.25 5.41l4.02-3.13z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.64 1.26 6.59l4.02 3.13c.95-2.83 3.6-4.97 6.72-4.97z"
      />
    </svg>
  );
}

export function SoundWave({
  className = 'h-4',
  barClassName = 'bg-emerald-400',
}: {
  className?: string;
  barClassName?: string;
}) {
  return (
    <div className={`flex items-end gap-[3px] ${className}`} aria-hidden="true">
      <span className={`w-[3px] rounded-full animate-wave-1 ${barClassName}`} />
      <span className={`w-[3px] rounded-full animate-wave-2 ${barClassName}`} />
      <span className={`w-[3px] rounded-full animate-wave-3 ${barClassName}`} />
      <span className={`w-[3px] rounded-full animate-wave-4 ${barClassName}`} />
    </div>
  );
}

// Deterministic aesthetic gradient and vinyl look for tracks
const GRADIENTS = [
  'from-violet-600/80 via-purple-700/60 to-indigo-900',
  'from-emerald-600/80 via-teal-700/60 to-slate-900',
  'from-rose-600/80 via-pink-700/60 to-zinc-900',
  'from-amber-600/80 via-orange-700/60 to-stone-900',
  'from-cyan-600/80 via-blue-700/60 to-slate-950',
  'from-fuchsia-600/80 via-rose-700/60 to-zinc-950',
];

export function TrackCover({
  title,
  artist,
  size = 'md',
}: {
  title: string;
  artist: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  // Simple hash for consistent cover gradient
  const hash = (title + artist)
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradient = GRADIENTS[hash % GRADIENTS.length];

  const sizeClasses = {
    sm: 'w-10 h-10 rounded-lg text-xs',
    md: 'w-12 h-12 rounded-xl text-sm',
    lg: 'w-16 h-16 rounded-2xl text-base',
  }[size];

  const initial = (artist || title).charAt(0).toUpperCase();

  return (
    <div
      className={`relative shrink-0 overflow-hidden bg-gradient-to-br ${gradient} ${sizeClasses} flex items-center justify-center font-bold text-white shadow-md border border-white/10 group-hover:scale-105 transition-transform`}
      aria-hidden="true"
    >
      {/* Vinyl record concentric grooves effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.4)_70%)] opacity-70" />
      <div className="absolute inset-1 rounded-full border border-white/15 opacity-50" />
      <span className="relative z-10 font-semibold tracking-wider opacity-90 drop-shadow">
        {initial}
      </span>
    </div>
  );
}
