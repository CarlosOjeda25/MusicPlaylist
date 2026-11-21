'use client';

import { useState, useEffect } from 'react';
import { UserTrack } from '@/lib/types';
import Link from 'next/link';

export default function RadarPage() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'text' | 'ai'>('ai');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UserTrack[]>([]);
  const [searchReason, setSearchReason] = useState<string | null>(null);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);

  // Selected songs for the temporary playlist builder
  const [selectedTracks, setSelectedTracks] = useState<UserTrack[]>([]);
  const [copied, setCopied] = useState(false);

  // Load all tracks initially
  useEffect(() => {
    loadAllTracks();
  }, []);

  const loadAllTracks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tracks');
      const data = await res.json();
      setResults(data.tracks || []);
      setSearchMessage(`Mostrando todo tu catálogo (${data.total || 0} canciones guardadas).`);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) {
      loadAllTracks();
      return;
    }

    setLoading(true);
    setSearchReason(null);
    setSearchMessage(null);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, mode }),
      });
      const data = await res.json();
      setResults(data.tracks || []);
      setSearchReason(data.reason || null);
      setSearchMessage(data.message || null);
    } catch (err: any) {
      setSearchMessage(`Error en la búsqueda: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectTrack = (track: UserTrack) => {
    setSelectedTracks((prev) => {
      const exists = prev.some((t) => t.id === track.id);
      if (exists) {
        return prev.filter((t) => t.id !== track.id);
      } else {
        return [...prev, track];
      }
    });
  };

  const selectAllResults = () => {
    const newItems = results.filter((r) => !selectedTracks.some((s) => s.id === r.id));
    setSelectedTracks((prev) => [...prev, ...newItems]);
  };

  const clearSelected = () => {
    setSelectedTracks([]);
  };

  const copyPlaylistText = () => {
    const text = selectedTracks
      .map((t, idx) => `${idx + 1}. ${t.artist} - ${t.title} [${t.source.toUpperCase()}]`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCSV = () => {
    const header = 'ID,Title,Artist,Playlist,Source,ExternalID\n';
    const rows = selectedTracks
      .map(
        (t) =>
          `"${t.id}","${t.title.replace(/"/g, '""')}","${t.artist.replace(/"/g, '""')}","${t.playlist_name.replace(/"/g, '""')}","${t.source}","${t.external_id}"`
      )
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `radar-playlist-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-32">
      {/* Header & Back link */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>📡</span> Radar de Playlists
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Filtrá exclusivamente sobre tus canciones guardadas. La IA jamás inventará temas externos.
          </p>
        </div>
        <Link
          href="/"
          className="text-xs font-semibold text-gray-400 hover:text-white px-3 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700/60 transition"
        >
          ← Volver a Cuentas
        </Link>
      </div>

      {/* Search Bar & Mode Selector */}
      <div className="bg-[#10131f] border border-gray-800 rounded-2xl p-5 space-y-4 shadow-xl">
        {/* Mode Toggle Tabs */}
        <div className="flex items-center gap-2 p-1 bg-gray-900/90 rounded-xl w-fit border border-gray-800">
          <button
            onClick={() => setMode('ai')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              mode === 'ai'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-gray-950 shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>✨</span>
            <span>Género / Estilo con IA</span>
          </button>
          <button
            onClick={() => setMode('text')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              mode === 'text'
                ? 'bg-gray-700 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>🔍</span>
            <span>Artista / Título (Rápido)</span>
          </button>
        </div>

        {/* Input & Action */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                mode === 'ai'
                  ? 'Ej: "música tranquila para concentrarse", "synthwave ochentoso", "indie acústico"'
                  : 'Buscar por artista o nombre de canción...'
              }
              className="w-full bg-[#0a0d16] border border-gray-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  loadAllTracks();
                }}
                className="absolute right-3 top-3 text-gray-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-sm transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-950 border-t-transparent"></div>
            ) : (
              <span>Buscar</span>
            )}
          </button>
        </form>

        {/* Suggested Quick AI Prompts */}
        {mode === 'ai' && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-gray-400">
            <span className="text-gray-500">Sugerencias:</span>
            {[
              'música tranquila para concentrarse',
              'electro funk bailable',
              'rock indie melancólico',
              'piano clásico nocturno',
            ].map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => {
                  setQuery(sug);
                }}
                className="px-2.5 py-1 rounded-md bg-gray-800/80 hover:bg-gray-700 text-gray-300 border border-gray-700/50 transition"
              >
                {sug}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results Header / Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          {searchMessage && <span className="font-semibold text-gray-300">{searchMessage}</span>}
          {searchReason && (
            <p className="text-emerald-400 mt-1 italic">Razón de la IA: {searchReason}</p>
          )}
        </div>

        {results.length > 0 && (
          <button
            onClick={selectAllResults}
            className="text-emerald-400 hover:text-emerald-300 font-semibold underline self-start sm:self-auto"
          >
            + Seleccionar todas las encontradas
          </button>
        )}
      </div>

      {/* Tracks Results Table */}
      <div className="bg-[#10131f] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
        {results.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <div className="text-3xl">📭</div>
            <p className="font-medium text-white">No se encontraron canciones en tu radar</p>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Recordá que la IA solo filtra dentro de las canciones que tenés sincronizadas de Spotify o
              YouTube.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/60">
            {results.map((track) => {
              const isSelected = selectedTracks.some((t) => t.id === track.id);
              return (
                <div
                  key={track.id}
                  onClick={() => toggleSelectTrack(track)}
                  className={`p-4 flex items-center justify-between gap-4 cursor-pointer transition select-none ${
                    isSelected ? 'bg-emerald-500/10' : 'hover:bg-gray-800/30'
                  }`}
                >
                  <div className="flex items-center space-x-4 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-4 h-4 rounded border-gray-700 text-emerald-500 focus:ring-emerald-400 cursor-pointer"
                    />

                    <div className="min-w-0">
                      <div className="font-semibold text-white text-sm truncate">{track.title}</div>
                      <div className="text-xs text-gray-400 truncate flex items-center gap-2 mt-0.5">
                        <span>{track.artist}</span>
                        <span>•</span>
                        <span className="text-gray-500">📁 {track.playlist_name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                        track.source === 'spotify'
                          ? 'bg-[#1DB954]/10 text-[#1DB954] border-[#1DB954]/30'
                          : 'bg-[#FF0000]/10 text-[#FF0000] border-[#FF0000]/30'
                      }`}
                    >
                      {track.source === 'spotify' ? 'Spotify' : 'YouTube'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Bottom Drawer: Selected Playlist Builder */}
      {selectedTracks.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-4xl mx-auto bg-[#131726]/95 backdrop-blur-md border border-emerald-500/30 p-4 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 z-50 animate-slideUp">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-gray-950 font-bold flex items-center justify-center text-sm">
              {selectedTracks.length}
            </div>
            <div>
              <div className="font-bold text-white text-sm">Lista armada en memoria</div>
              <div className="text-xs text-gray-400">
                {selectedTracks.length} tema(s) seleccionados de tu catálogo
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={copyPlaylistText}
              className="flex-1 sm:flex-initial bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold px-4 py-2 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-1.5"
            >
              <span>📋</span>
              <span>{copied ? '¡Copiado!' : 'Copiar lista armada'}</span>
            </button>

            <button
              onClick={downloadCSV}
              className="bg-gray-800 hover:bg-gray-700 text-white font-semibold px-3 py-2 rounded-xl text-xs border border-gray-700 transition"
              title="Descargar como CSV"
            >
              CSV
            </button>

            <button
              onClick={clearSelected}
              className="text-gray-400 hover:text-white px-2 py-2 text-xs"
              title="Limpiar selección"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
