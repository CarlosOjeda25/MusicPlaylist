'use client';

import React from 'react';
import { SpotifyIcon, YouTubeIcon } from './Icons';

// Tactile Audio VU Meter with multi-segment LEDs
export function VuMeter({
  active = true,
  className = '',
}: {
  active?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex items-end gap-[3px] h-6 px-1.5 py-1 bg-black/60 rounded-md border border-white/[0.08] shadow-inner ${className}`}
      aria-hidden="true"
    >
      <div className="w-[3px] bg-zinc-800 rounded-full h-full flex flex-col justify-end overflow-hidden">
        <div
          className={`w-full rounded-full bg-gradient-to-t from-emerald-500 via-amber-400 to-rose-500 ${
            active ? 'animate-vu-1' : 'h-[15%] opacity-30'
          }`}
        />
      </div>
      <div className="w-[3px] bg-zinc-800 rounded-full h-full flex flex-col justify-end overflow-hidden">
        <div
          className={`w-full rounded-full bg-gradient-to-t from-emerald-500 via-amber-400 to-rose-500 ${
            active ? 'animate-vu-2' : 'h-[25%] opacity-30'
          }`}
        />
      </div>
      <div className="w-[3px] bg-zinc-800 rounded-full h-full flex flex-col justify-end overflow-hidden">
        <div
          className={`w-full rounded-full bg-gradient-to-t from-emerald-500 via-amber-400 to-rose-500 ${
            active ? 'animate-vu-3' : 'h-[10%] opacity-30'
          }`}
        />
      </div>
      <div className="w-[3px] bg-zinc-800 rounded-full h-full flex flex-col justify-end overflow-hidden">
        <div
          className={`w-full rounded-full bg-gradient-to-t from-emerald-500 via-amber-400 to-rose-500 ${
            active ? 'animate-vu-1' : 'h-[20%] opacity-30'
          }`}
        />
      </div>
    </div>
  );
}

// Studio Vinyl Record with Grooves and Center Label
export function VinylRecord({
  title,
  artist,
  size = 'md',
  spinning = false,
}: {
  title: string;
  artist: string;
  size?: 'sm' | 'md' | 'lg';
  spinning?: boolean;
}) {
  const hash = (title + artist)
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const colors = [
    'bg-amber-600',
    'bg-rose-600',
    'bg-indigo-600',
    'bg-teal-600',
    'bg-violet-600',
    'bg-orange-600',
  ];
  const labelColor = colors[hash % colors.length];

  const dimensions = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }[size];

  return (
    <div
      className={`relative shrink-0 ${dimensions} rounded-full bg-[#111216] border border-white/10 shadow-lg flex items-center justify-center overflow-hidden transition-transform duration-500 ${
        spinning ? 'animate-spin' : 'group-hover:rotate-45'
      }`}
      style={{ animationDuration: '4s' }}
      aria-hidden="true"
    >
      {/* Vinyl Grooves Texture */}
      <div className="absolute inset-1 rounded-full border border-white/[0.06]" />
      <div className="absolute inset-2 rounded-full border border-white/[0.04]" />
      <div className="absolute inset-3 rounded-full border border-white/[0.08]" />

      {/* Center Record Label */}
      <div
        className={`w-4 h-4 rounded-full ${labelColor} flex items-center justify-center shadow-inner border border-black/40`}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-black/90" />
      </div>
    </div>
  );
}

// Radar Sweep Graphic Component
export function RadarScanner() {
  return (
    <div className="relative w-16 h-16 rounded-full border border-amber-500/30 bg-amber-500/[0.03] flex items-center justify-center overflow-hidden shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.08)]">
      {/* Concentric rings */}
      <div className="absolute inset-2 rounded-full border border-amber-500/20" />
      <div className="absolute inset-4 rounded-full border border-amber-500/20" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
      </div>

      {/* Sweep cone */}
      <div className="absolute inset-0 origin-center animate-radar-sweep">
        <div className="w-1/2 h-1/2 bg-gradient-to-br from-amber-400/40 via-amber-500/10 to-transparent rounded-tl-full" />
      </div>
    </div>
  );
}
