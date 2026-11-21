'use client';

import { useState, useEffect } from 'react';
import { UserTrack } from '@/lib/types';
import Link from 'next/link';
import {
  Search,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Download,
  Trash2,
  ListMusic,
  Check,
  X,
  Disc,
  Radio,
  Sparkles,
  Key,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { SpotifyIcon, YouTubeIcon } from '@/components/Icons';
import { VuMeter, VinylRecord, RadarScanner } from '@/components/StudioUI';

export default function RadarPage() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'text' | 'ai'>('ai');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UserTrack[]>([]);
  const [searchReason, setSearchReason] = useState<string | null>(null);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);

  // BYOK Gemini API Key
  const [geminiKey, setGeminiKey] = useState<string>('');
  const [keyInput, setKeyInput] = useState<string>('');
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [keySavedFeedback, setKeySavedFeedback] = useState<boolean>(false);

  // Selected songs for the temporary playlist builder
  const [selectedTracks, setSelectedTracks] = useState<UserTrack[]>([]);
  const [copied, setCopied] = useState(false);

  // Load all tracks and stored Gemini key initially
  useEffect(() => {
    loadAllTracks();
    const stored = localStorage.getItem('gemini_user_api_key');
    if (stored) {
      setGeminiKey(stored);
      setKeyInput(stored);
    }
  }, []);

  const loadAllTracks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tracks');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setResults(data.tracks || []);
      setSearchMessage(`Catálogo completo cargado: ${data.total || 0} pistas indexadas.`);
    } catch (e: any) {
      console.error(e);
      setSearchMessage(`Error al cargar pistas: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKey = () => {
    const trimmed = keyInput.trim();
    if (trimmed) {
      localStorage.setItem('gemini_user_api_key', trimmed);
      setGeminiKey(trimmed);
    } else {
      localStorage.removeItem('gemini_user_api_key');
      setGeminiKey('');
    }
    setKeySavedFeedback(true);
    setTimeout(() => {
      setKeySavedFeedback(false);
      setShowKeyModal(false);
    }, 1200);
  };

  const handleRemoveKey = () => {
    localStorage.removeItem('gemini_user_api_key');
    setGeminiKey('');
    setKeyInput('');
    setShowKeyModal(false);
  };

  const handleSearch = async (e?: React.FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();
    const effectiveQuery = (overrideQuery !== undefined ? overrideQuery : query).trim();
    if (!effectiveQuery) {
      loadAllTracks();
      return;
    }

    setLoading(true);
    setSearchReason(null);
    setSearchMessage(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (geminiKey) {
        headers['x-gemini-key'] = geminiKey;
      }

      const res = await fetch('/api/search', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: effectiveQuery, mode, userApiKey: geminiKey || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSearchMessage(`Error en la búsqueda (${res.status}): ${data.error || 'Fallo en el servidor'}`);
        setResults([]);
        return;
      }

      setResults(data.tracks || []);
      setSearchReason(data.reason || null);
      setSearchMessage(data.message || null);
    } catch (err: any) {
      setSearchMessage(`Error en el barrido: ${err.message}`);
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

  const copyPlaylistText = async () => {
    const text = selectedTracks
      .map((t, idx) => `${idx + 1}. ${t.artist} - ${t.title} [${t.source.toUpperCase()}]`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard copy error:', err);
    }
  };

  const sanitizeCsvCell = (val: string) => {
    let str = val || '';
    // Prevent CSV formula injection if cell begins with =, +, -, or @
    if (/^[=+\-@]/.test(str)) {
      str = `'${str}`;
    }
    return `"${str.replace(/"/g, '""')}"`;
  };

  const downloadCSV = () => {
    const header = 'ID,Title,Artist,Playlist,Source,ExternalID\n';
    const rows = selectedTracks
      .map(
        (t) =>
          `${sanitizeCsvCell(t.id)},${sanitizeCsvCell(t.title)},${sanitizeCsvCell(t.artist)},${sanitizeCsvCell(t.playlist_name)},${sanitizeCsvCell(t.source)},${sanitizeCsvCell(t.external_id)}`
      )
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `radar-master-tape-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const frequencyPresets = [
    { label: 'Electro Funk & Groove', query: 'electro funk y dance' },
    { label: 'Synthwave Night Drive', query: 'synthwave ochentoso para manejar' },
    { label: 'Indie & Psicodelia', query: 'indie rock y psicodelia chill' },
    { label: 'Late Night Noir Jazz', query: 'jazz nocturno y piano clásico' },
    { label: 'Deep Ambient Focus', query: 'música tranquila para concentrarse' },
  ];

  return (
    <div className="space-y-6 pb-36">
      {/* Studio Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#12141a] border border-white/[0.08] p-5 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-4">
          <RadarScanner />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-amber-400 uppercase tracking-widest">
                RADAR SEMÁNTICO // ESCANER DE AUDIO
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
              Consola de Curaduría & Barrido
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Filtrado semántico cerrado: la IA solo evalúa temas que posees en tu biblioteca.
            </p>
          </div>
        </div>

        <Link
          href="/"
          className="self-start sm:self-auto inline-flex items-center gap-2 text-xs font-mono font-bold text-zinc-300 hover:text-white px-4 py-2.5 rounded-xl bg-black/50 border border-white/[0.08] hover:border-amber-500/40 transition group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          <span>Canales & Sincronización</span>
        </Link>
      </div>

      {/* Frequency Tuning Console */}
      <div className="bg-[#12141a] border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl relative overflow-hidden">
        {/* Tuner Mode Switch & BYOK Key Button */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 p-1 bg-black/60 rounded-xl w-fit border border-white/[0.06]">
            <button
              onClick={() => setMode('ai')}
              className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition flex items-center gap-2 ${
                mode === 'ai'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>SINTONIZADOR IA (VIBE / ESTILO)</span>
            </button>
            <button
              onClick={() => setMode('text')}
              className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition flex items-center gap-2 ${
                mode === 'text'
                  ? 'bg-zinc-800 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>BÚSQUEDA DIRECTA (TXT)</span>
            </button>
          </div>

          {/* Gemini BYOK Config Button */}
          <button
            type="button"
            onClick={() => setShowKeyModal(true)}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 border ${
              geminiKey
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50'
                : 'bg-zinc-900 border-amber-500/30 text-amber-300 hover:bg-amber-950/40'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>{geminiKey ? 'GEMINI KEY: CONECTADA ✓' : 'CONECTAR TU GEMINI KEY'}</span>
          </button>
        </div>

        {/* Dial Search Form */}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
              <Radio className="w-4 h-4 text-amber-400" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                mode === 'ai'
                  ? 'Frecuencia o estilo (ej: "groove con bajo marcado", "piano nocturno melancólico")...'
                  : 'Filtrar por artista, canción o lista de origen...'
              }
              className="w-full bg-[#090a0d] border border-white/[0.08] focus:border-amber-500/80 rounded-xl pl-11 pr-10 py-3.5 text-sm font-mono text-white placeholder-zinc-500 focus:outline-none transition shadow-inner"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  loadAllTracks();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold px-6 py-3.5 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>BARRIDO EN CURSO...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4 stroke-[2.5]" />
                <span>INICIAR BARRIDO</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Frequency Dials (Presets) */}
        <div className="pt-2">
          <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span>DIALES DE SINTONÍA RÁPIDA:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {frequencyPresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setQuery(preset.query);
                  setMode('ai');
                  handleSearch(undefined, preset.query);
                }}
                className="text-xs font-mono px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-white/[0.06] hover:border-amber-500/50 text-zinc-400 hover:text-white transition"
              >
                #{preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AI Curator Reasoning Monitor */}
      {searchReason && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-start space-x-3 text-amber-200 text-xs font-mono">
          <Sparkles className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold text-amber-400 uppercase tracking-wide block mb-0.5">
              INFORME DE CURADURÍA SEMÁNTICA:
            </span>
            <span>{searchReason}</span>
          </div>
        </div>
      )}

      {/* Results Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="text-xs font-mono text-zinc-400 flex items-center gap-2">
          <span>{searchMessage || `Mostrando ${results.length} temas`}</span>
        </div>

        {results.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
            <button
              onClick={selectAllResults}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/[0.08] hover:border-zinc-700 text-zinc-300 hover:text-white transition flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Seleccionar todos</span>
            </button>
          </div>
        )}
      </div>

      {/* Track Grid */}
      <div>
        {results.length === 0 ? (
          <div className="bg-[#12141a] border border-white/[0.06] rounded-2xl p-12 text-center space-y-3">
            <Radio className="w-10 h-10 text-zinc-600 mx-auto" />
            <div className="text-white font-mono font-bold">Frecuencia muda / Sin señales</div>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto font-mono">
              No se detectaron pistas con esta sintonía en tu biblioteca. Prueba con otra frecuencia o sincroniza más listas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {results.map((track) => {
              const isSelected = selectedTracks.some((t) => t.id === track.id);
              return (
                <div
                  key={track.id}
                  onClick={() => toggleSelectTrack(track)}
                  className={`group relative p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between select-none ${
                    isSelected
                      ? 'bg-amber-950/20 border-amber-500/60 shadow-lg shadow-amber-500/10'
                      : 'bg-[#12141a] border-white/[0.06] hover:border-white/[0.15] hover:bg-[#151820]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="font-bold text-sm text-white group-hover:text-amber-400 transition truncate">
                        {track.title}
                      </div>
                      <div className="text-xs text-zinc-400 truncate">{track.artist}</div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition ${
                        isSelected
                          ? 'bg-amber-500 border-amber-400 text-black'
                          : 'border-zinc-700 bg-black/40 text-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-mono text-zinc-500">
                    <span className="truncate max-w-[140px] text-zinc-400" title={track.playlist_name}>
                      📁 {track.playlist_name}
                    </span>
                    <span className="flex items-center gap-1 uppercase">
                      {track.source === 'spotify' ? (
                        <>
                          <SpotifyIcon className="w-3 h-3" />
                          <span>SPOTIFY</span>
                        </>
                      ) : (
                        <>
                          <YouTubeIcon className="w-3 h-3" />
                          <span>YOUTUBE</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BYOK Google Gemini Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#12141a] border border-amber-500/40 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl animate-slideUp">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono">
                    Conectar Google Gemini API Key
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Modo BYOK (Bring Your Own Key) — Costo cero para ti
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tutorial Step-by-Step */}
            <div className="bg-black/50 border border-white/[0.06] rounded-xl p-4 space-y-3 font-mono text-xs">
              <div className="font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>¿Cómo obtener tu clave gratuita en 1 minuto?</span>
              </div>
              <ol className="list-decimal list-inside space-y-2 text-zinc-300">
                <li>
                  Ingresa a{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 underline font-bold inline-flex items-center gap-1 hover:text-amber-300"
                  >
                    Google AI Studio — API Keys
                    <ExternalLink className="w-3 h-3 inline" />
                  </a>
                </li>
                <li>Inicia sesión con tu cuenta de Google y haz clic en <strong>"Create API key"</strong>.</li>
                <li>Copia la clave y pégala aquí abajo.</li>
              </ol>
              <div className="text-[11px] text-zinc-500 border-t border-white/[0.06] pt-2">
                🔒 <strong>Privacidad total:</strong> Tu clave se guarda exclusivamente en el almacenamiento local de tu navegador (<code className="text-amber-400">localStorage</code>) y se envía directamente por encabezado seguro para resolver tus búsquedas.
              </div>
            </div>

            {/* Key Input */}
            <div className="space-y-2">
              <label className="block text-xs font-mono font-bold text-zinc-300">
                Tu Clave de Gemini:
              </label>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-[#090a0d] border border-white/[0.1] focus:border-amber-500 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-zinc-600 focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              {geminiKey ? (
                <button
                  type="button"
                  onClick={handleRemoveKey}
                  className="text-xs font-mono text-red-400 hover:text-red-300 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar clave guardada</span>
                </button>
              ) : (
                <span className="text-[11px] font-mono text-zinc-500">
                  Sin clave: se usará el filtro heurístico local
                </span>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveKey}
                  className="px-5 py-2.5 rounded-xl text-xs font-mono font-bold bg-amber-500 hover:bg-amber-400 text-black transition flex items-center gap-1.5"
                >
                  {keySavedFeedback ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>¡Guardada!</span>
                    </>
                  ) : (
                    <span>Guardar Clave</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Master Tape Deck: Selected Tracks Dock */}
      {selectedTracks.length > 0 && (
        <div className="fixed bottom-6 left-4 right-4 max-w-3xl mx-auto bg-[#101217]/95 backdrop-blur-2xl border border-amber-500/30 p-4 sm:p-5 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 z-50 animate-slideUp">
          <div className="flex items-center space-x-4">
            <div className="w-11 h-11 rounded-xl bg-amber-500 text-black font-mono font-black flex items-center justify-center text-sm shadow-lg shadow-amber-500/20">
              {String(selectedTracks.length).padStart(2, '0')}
            </div>
            <div>
              <div className="font-mono font-bold text-white text-sm flex items-center gap-2">
                <span>MASTER TAPE EN MEMORIA</span>
                <VuMeter active={true} />
              </div>
              <div className="text-xs font-mono text-zinc-400">
                {selectedTracks.length} pista(s) seleccionadas para exportación
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto font-mono">
            <button
              onClick={copyPlaylistText}
              className="flex-1 sm:flex-initial bg-amber-500 hover:bg-amber-400 text-black font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>¡COPIADO!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>COPIAR LISTA</span>
                </>
              )}
            </button>

            <button
              onClick={downloadCSV}
              className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs border border-white/[0.08] transition flex items-center gap-1.5"
              title="Descargar como CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            <button
              onClick={clearSelected}
              className="text-zinc-400 hover:text-white p-2.5 rounded-xl hover:bg-zinc-800 transition"
              title="Limpiar cinta"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
