'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Disc,
  ArrowRight,
  Radio,
  Lock,
} from 'lucide-react';
import { SpotifyIcon, YouTubeIcon } from '@/components/Icons';
import { VuMeter } from '@/components/StudioUI';

interface SessionInfo {
  user: { id: string; name: string; email: string };
  connected: { spotify: boolean; google: boolean };
  tracks_count: number;
}

export default function HomePage() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      if (res.ok && data?.user) {
        setSession(data);
      } else {
        console.error('Session load error:', data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const connected = params.get('connected');
      const err = params.get('error');
      if (connected === 'spotify') {
        setSyncMessage({ text: '¡Canal de Spotify conectado exitosamente!' });
      } else if (connected === 'google') {
        setSyncMessage({ text: '¡Canal de YouTube conectado exitosamente!' });
      } else if (err) {
        setSyncMessage({ text: `Error en autenticación: ${err}`, error: true });
      }
    }
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncMessage({
          text: `Sincronización master completada: ${data.new_tracks} pistas nuevas indexadas. Total en radar: ${data.synced_total}.`,
        });
        await fetchSession();
      } else {
        setSyncMessage({
          text: `Error en la sincronización: ${data.error || 'Respuesta inválida'}`,
          error: true,
        });
      }
    } catch (err: any) {
      setSyncMessage({
        text: `Error de bus: ${err.message}`,
        error: true,
      });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Disc className="w-8 h-8 text-amber-500 animate-spin" />
        <span className="font-mono text-xs text-zinc-400 tracking-widest uppercase">
          Inicializando Consola de Canales...
        </span>
      </div>
    );
  }

  const activeChannels =
    (session?.connected?.spotify ? 1 : 0) + (session?.connected?.google ? 1 : 0);

  return (
    <div className="space-y-8 pb-16">
      {/* Rack Unit 1: Master Deck Console */}
      <div className="rounded-2xl bg-[#12141a] border border-white/[0.08] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle screw details on rack corners */}
        <div className="absolute top-3 left-3 w-2 h-2 rounded-full border border-white/20 bg-zinc-800" />
        <div className="absolute top-3 right-3 w-2 h-2 rounded-full border border-white/20 bg-zinc-800" />
        <div className="absolute bottom-3 left-3 w-2 h-2 rounded-full border border-white/20 bg-zinc-800" />
        <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full border border-white/20 bg-zinc-800" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>CANAL MASTER • SINCRONIZACIÓN EN TIEMPO REAL</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Consola de Integración & Audio
            </h1>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
              Enlazá tus canales de streaming, sincronizá tus listas de reproducción y operá con el
              motor de filtrado semántico sin inventar canciones externas.
            </p>
          </div>

          {/* Master Readout HUD */}
          <div className="bg-[#090a0d] p-5 rounded-xl border border-white/[0.08] flex items-center justify-between sm:justify-start gap-6 shadow-inner shrink-0">
            <div>
              <div className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider flex items-center gap-2">
                <span>Total Pistas</span>
                <VuMeter active={syncing} />
              </div>
              <div className="text-3xl sm:text-4xl font-mono font-black text-amber-400 mt-1">
                {String(session?.tracks_count || 0).padStart(3, '0')}
              </div>
              <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                {activeChannels}/2 canales activos
              </div>
            </div>

            <Link
              href="/radar"
              className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-5 py-3 rounded-xl text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 group shrink-0 font-mono"
            >
              <span>Abrir Radar</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Sync Status Feedback Alert */}
      {syncMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 shadow-lg ${
            syncMessage.error
              ? 'bg-rose-950/40 border-rose-500/30 text-rose-200'
              : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {syncMessage.error ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <span className="text-xs sm:text-sm font-mono">{syncMessage.text}</span>
          </div>
          <button
            onClick={() => setSyncMessage(null)}
            className="text-xs px-2 py-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Dual Channel Strips (Spotify & YouTube) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Channel Strip A: Spotify */}
        <div className="bg-[#12141a] border border-white/[0.08] rounded-2xl p-6 sm:p-7 flex flex-col justify-between space-y-6 shadow-xl relative overflow-hidden group hover:border-[#1DB954]/40 transition-colors">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-[#1DB954]/10 border border-[#1DB954]/30 flex items-center justify-center text-[#1DB954] shadow-lg shadow-[#1DB954]/10 group-hover:scale-105 transition-transform">
                <SpotifyIcon className="w-8 h-8" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#1DB954] font-bold">
                  CANAL 01
                </div>
                <h3 className="font-extrabold text-white text-lg tracking-tight">Spotify</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Playlists personales y canciones guardadas
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              <span
                className={`text-[11px] font-mono px-2.5 py-0.5 rounded-md font-bold border flex items-center gap-1.5 ${
                  session?.connected?.spotify
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    session?.connected?.spotify ? 'bg-emerald-400' : 'bg-zinc-500'
                  }`}
                />
                <span>{session?.connected?.spotify ? 'ONLINE' : 'OFFLINE'}</span>
              </span>
              <VuMeter active={!!session?.connected?.spotify} />
            </div>
          </div>

          <div className="bg-[#090a0d] p-3.5 rounded-xl border border-white/[0.05] space-y-1.5 text-xs font-mono text-zinc-400">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">Protocolo</span>
              <span className="text-zinc-300">OAuth 2.0 PKCE</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">Cifrado de token</span>
              <span className="text-amber-400 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>AES-GCM-256</span>
              </span>
            </div>
          </div>

          <div>
            {session?.connected?.spotify ? (
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Canal enlazado y listo para lectura</span>
                </span>
                <a
                  href="/api/auth/spotify"
                  className="text-xs font-mono text-zinc-400 hover:text-white underline"
                >
                  Reconectar
                </a>
              </div>
            ) : (
              <a
                href="/api/auth/spotify"
                className="w-full inline-flex items-center justify-center gap-2 bg-[#1DB954] hover:bg-[#1aa34a] text-black font-bold py-3 px-5 rounded-xl text-sm transition shadow-lg shadow-[#1DB954]/20 font-mono"
              >
                <SpotifyIcon className="w-4 h-4" />
                <span>Vincular Canal Spotify</span>
              </a>
            )}
          </div>
        </div>

        {/* Channel Strip B: YouTube Music */}
        <div className="bg-[#12141a] border border-white/[0.08] rounded-2xl p-6 sm:p-7 flex flex-col justify-between space-y-6 shadow-xl relative overflow-hidden group hover:border-[#FF0000]/40 transition-colors">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-[#FF0000]/10 border border-[#FF0000]/30 flex items-center justify-center text-[#FF0000] shadow-lg shadow-[#FF0000]/10 group-hover:scale-105 transition-transform">
                <YouTubeIcon className="w-8 h-8" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#FF0000] font-bold">
                  CANAL 02
                </div>
                <h3 className="font-extrabold text-white text-lg tracking-tight">YouTube Music</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Playlists públicas y privadas vía Google
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              <span
                className={`text-[11px] font-mono px-2.5 py-0.5 rounded-md font-bold border flex items-center gap-1.5 ${
                  session?.connected?.google
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    session?.connected?.google ? 'bg-rose-400' : 'bg-zinc-500'
                  }`}
                />
                <span>{session?.connected?.google ? 'ONLINE' : 'OFFLINE'}</span>
              </span>
              <VuMeter active={!!session?.connected?.google} />
            </div>
          </div>

          <div className="bg-[#090a0d] p-3.5 rounded-xl border border-white/[0.05] space-y-1.5 text-xs font-mono text-zinc-400">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">Protocolo</span>
              <span className="text-zinc-300">Google OAuth 2.0</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">Cifrado de token</span>
              <span className="text-amber-400 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>AES-GCM-256</span>
              </span>
            </div>
          </div>

          <div>
            {session?.connected?.google ? (
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-rose-400 flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Canal enlazado y listo para lectura</span>
                </span>
                <a
                  href="/api/auth/google"
                  className="text-xs font-mono text-zinc-400 hover:text-white underline"
                >
                  Reconectar
                </a>
              </div>
            ) : (
              <a
                href="/api/auth/google"
                className="w-full inline-flex items-center justify-center gap-2 bg-[#FF0000] hover:bg-[#d60000] text-white font-bold py-3 px-5 rounded-xl text-sm transition shadow-lg shadow-[#FF0000]/20 font-mono"
              >
                <YouTubeIcon className="w-4 h-4" />
                <span>Vincular Canal YouTube</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Master Bus Synchronization Trigger */}
      <div className="bg-[#12141a] border border-white/[0.08] rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
            <Radio className="w-3.5 h-3.5" />
            <span>Sincronización Idempotente</span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Descarga & Indexación de Bibliotecas
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl">
            Ejecuta un barrido de tus listas en ambos canales y actualiza tu base de datos local sin
            duplicar pistas ya existentes.
          </p>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className={`shrink-0 px-6 py-3.5 rounded-xl font-mono font-bold text-xs sm:text-sm transition-all flex items-center gap-2.5 shadow-lg ${
            syncing
              ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed border border-white/[0.05]'
              : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'
          }`}
        >
          {syncing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-black" />
              <span>Sincronizando bus de audio...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 text-black" />
              <span>Sincronizar Canales Ahora</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
