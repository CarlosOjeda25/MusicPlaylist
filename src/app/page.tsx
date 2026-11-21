'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SessionInfo {
  user: { id: string; name: string; email: string };
  connected: { spotify: boolean; google: boolean };
  tracks_count: number;
  available_users: Array<{ id: string; name: string; email: string }>;
}

export default function HomePage() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      setSession(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const handleSwitchUser = async (userId: string) => {
    setLoading(true);
    await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    await fetchSession();
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncMessage(
          `¡Sincronización completada! ${data.new_tracks} temas nuevos agregados. Total en radar: ${data.synced_total}`
        );
        await fetchSession();
      } else {
        setSyncMessage(`Error al sincronizar: ${data.error || 'Desconocido'}`);
      }
    } catch (err: any) {
      setSyncMessage(`Fallo de conexión: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero / Header */}
      <div className="bg-gradient-to-r from-gray-900 via-[#131726] to-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
              <span>●</span> Catálogo de canciones sincronizado
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Tu Radar Personal de Música
            </h1>
            <p className="text-gray-400 text-sm mt-1 max-w-xl">
              Conectá tus cuentas de streaming, sincronizá las listas que ya escuchás y filtrá con IA
              únicamente sobre tu música real.
            </p>
          </div>

          {/* Quick Stats Banner */}
          <div className="flex items-center gap-4 bg-[#0d101a] p-4 rounded-xl border border-gray-800/80">
            <div>
              <div className="text-xs text-gray-400 font-medium">Canciones en radar</div>
              <div className="text-3xl font-black text-emerald-400">
                {session?.tracks_count || 0}
              </div>
            </div>
            <Link
              href="/radar"
              className="bg-emerald-500 hover:bg-emerald-600 text-gray-950 font-bold px-4 py-2.5 rounded-lg text-sm shadow-lg shadow-emerald-500/20 transition flex items-center gap-1.5"
            >
              <span>Abrir Radar</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* Multi-Tenant Switcher (Testing & Demo) */}
        <div className="mt-6 pt-6 border-t border-gray-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-400">Usuario activo:</span>
            <span className="px-3 py-1 rounded-md bg-gray-800 text-white text-xs font-semibold">
              👤 {session?.user.name} ({session?.user.id})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Cambiar usuario para probar aislamiento:</span>
            <div className="flex gap-1.5">
              {session?.available_users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleSwitchUser(u.id)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                    u.id === session.user.id
                      ? 'bg-emerald-500 text-gray-950 font-bold'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {u.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sync Status Alert */}
      {syncMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-sm flex items-center justify-between animate-fadeIn">
          <span>{syncMessage}</span>
          <button
            onClick={() => setSyncMessage(null)}
            className="text-emerald-400 hover:text-emerald-200 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Connected Accounts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Spotify Card */}
        <div className="bg-[#10131f] border border-gray-800 rounded-2xl p-6 flex flex-col justify-between space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-[#1DB954]/15 border border-[#1DB954]/30 flex items-center justify-center">
                <span className="text-2xl">🟢</span>
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Spotify</h3>
                <p className="text-xs text-gray-400">Sincroniza tus playlists y biblioteca personal</p>
              </div>
            </div>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                session?.connected.spotify
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-gray-800 text-gray-400 border-gray-700'
              }`}
            >
              {session?.connected.spotify ? 'Conectado' : 'No conectado'}
            </span>
          </div>

          <div className="pt-2">
            {session?.connected.spotify ? (
              <div className="text-xs text-emerald-400 flex items-center gap-1.5">
                <span>✓</span> Cuenta vinculada y lista para sincronización
              </div>
            ) : (
              <a
                href="/api/auth/spotify"
                className="w-full inline-flex items-center justify-center gap-2 bg-[#1DB954] hover:bg-[#1aa34a] text-black font-bold py-2.5 px-4 rounded-xl text-sm transition shadow-lg shadow-[#1DB954]/20"
              >
                <span>Conectar con Spotify</span>
              </a>
            )}
          </div>
        </div>

        {/* YouTube / Google Card */}
        <div className="bg-[#10131f] border border-gray-800 rounded-2xl p-6 flex flex-col justify-between space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-[#FF0000]/15 border border-[#FF0000]/30 flex items-center justify-center">
                <span className="text-2xl">🔴</span>
              </div>
              <div>
                <h3 className="font-bold text-white text-base">YouTube (YT Music)</h3>
                <p className="text-xs text-gray-400">Sincroniza tus listas vía YouTube Data API v3</p>
              </div>
            </div>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                session?.connected.google
                  ? 'bg-red-500/10 text-red-400 border-red-500/30'
                  : 'bg-gray-800 text-gray-400 border-gray-700'
              }`}
            >
              {session?.connected.google ? 'Conectado' : 'No conectado'}
            </span>
          </div>

          <div className="pt-2">
            {session?.connected.google ? (
              <div className="text-xs text-red-400 flex items-center gap-1.5">
                <span>✓</span> Cuenta vinculada y lista para sincronización
              </div>
            ) : (
              <a
                href="/api/auth/google"
                className="w-full inline-flex items-center justify-center gap-2 bg-[#FF0000] hover:bg-[#d60000] text-white font-bold py-2.5 px-4 rounded-xl text-sm transition shadow-lg shadow-[#FF0000]/20"
              >
                <span>Conectar con Google</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Big Action: Sync Playlists */}
      <div className="bg-[#10131f] border border-gray-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white">Sincronización de Catálogo</h2>
          <p className="text-sm text-gray-400 max-w-lg">
            Descarga las canciones de tus playlists hacia tu tabla personal. Re-sincronizar no duplica
            canciones ya existentes.
          </p>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className={`px-6 py-3 rounded-xl font-bold text-sm transition flex items-center gap-2 shadow-lg ${
            syncing
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-gray-950 shadow-emerald-500/20'
          }`}
        >
          {syncing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-950 border-t-transparent"></div>
              <span>Sincronizando playlists...</span>
            </>
          ) : (
            <>
              <span>🔄</span>
              <span>Sincronizar playlists ahora</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
