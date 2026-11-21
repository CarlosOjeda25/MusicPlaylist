import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { Sliders, Compass, ShieldCheck, Activity, Disc } from 'lucide-react';
import { SpotifyIcon, YouTubeIcon } from '@/components/Icons';
import { VuMeter } from '@/components/StudioUI';

export const metadata: Metadata = {
  title: 'RADAR • Music Intelligence Console',
  description: 'Curaduría analógica y filtrado semántico de IA sobre tu catálogo musical propio.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body
        className="bg-[#0b0c10] text-[#e4e7ee] flex flex-col min-h-screen selection:bg-amber-500/30 selection:text-amber-200 studio-grid"
        suppressHydrationWarning
      >
        {/* Warm Ambient Studio Glow */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-gradient-to-b from-amber-500/[0.04] via-rose-500/[0.02] to-transparent rounded-full blur-3xl" />
        </div>

        {/* Studio Top Control Rack */}
        <header className="relative z-40 border-b border-white/[0.08] bg-[#101217]/90 backdrop-blur-xl sticky top-0 shadow-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Brand / Logo */}
            <div className="flex items-center space-x-6">
              <Link href="/" className="flex items-center space-x-3 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 border border-white/10 flex items-center justify-center shadow-lg group-hover:border-amber-500/40 transition-colors">
                  <Disc className="w-5 h-5 text-amber-400 group-hover:rotate-90 transition-transform duration-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black tracking-widest text-white">
                      RADAR
                    </span>
                    <span className="text-[9px] font-mono tracking-widest uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                      STUDIO
                    </span>
                  </div>
                  <span className="text-[10px] tracking-wider text-zinc-400 font-medium block">
                    Music Intelligence Console
                  </span>
                </div>
              </Link>

              {/* Navigation Tabs */}
              <nav className="hidden sm:flex items-center space-x-1 p-1 bg-black/40 rounded-xl border border-white/[0.06]">
                <Link
                  href="/"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/[0.06] transition flex items-center gap-2"
                >
                  <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Control & Canales</span>
                </Link>
                <Link
                  href="/radar"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/[0.06] transition flex items-center gap-2"
                >
                  <Compass className="w-3.5 h-3.5 text-amber-400" />
                  <span>Radar Semántico</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                </Link>
              </nav>
            </div>

            {/* Right: Master VU Meter & Zero Hallucination Pill */}
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-xl border border-white/[0.07]">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                  MASTER VU
                </span>
                <VuMeter active={true} />
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-white/[0.08] text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-zinc-200 font-semibold text-[11px] tracking-wide">
                  Catálogo Verificado
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Studio Rackmount Footer */}
        <footer className="relative z-10 border-t border-white/[0.07] bg-[#090a0e] py-6 text-xs text-zinc-400">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3 text-zinc-400">
              <Activity className="w-4 h-4 text-amber-400" />
              <span className="font-mono text-zinc-300">RADAR ENGINE v2.4</span>
              <span>•</span>
              <span>Canales de audio aislados por usuario</span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center gap-1.5 text-zinc-400">
                <SpotifyIcon className="w-3.5 h-3.5 text-[#1DB954]" />
                <span className="text-[11px] font-mono">Spotify Channel</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5 text-zinc-400">
                <YouTubeIcon className="w-3.5 h-3.5 text-[#FF0000]" />
                <span className="text-[11px] font-mono">YouTube Channel</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
