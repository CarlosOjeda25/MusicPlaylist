import { UserTrack } from '../types';

interface AISearchResult {
  matchedIds: string[];
  reason: string;
}

const STOP_WORDS = new Set([
  'para', 'por', 'con', 'sin', 'sobre', 'entre', 'hacia', 'hasta', 'desde',
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'del', 'al', 'que',
  'de', 'en', 'y', 'o', 'pero', 'mas', 'como', 'the', 'and', 'or', 'for',
  'with', 'without', 'from', 'to', 'in', 'on', 'at', 'by', 'an', 'a', 'music', 'musica'
]);

/**
 * Executes an AI-powered semantic search over EXCLUSIVELY the provided user catalog.
 * Guarantees zero hallucinations by:
 * 1. Feeding ONLY the user's tracks list with exact internal IDs.
 * 2. Prompting the model with hard constraints to return only IDs from the catalog.
 * 3. Enforcing a post-generation validation step that rejects any ID not in the catalog.
 */
export async function searchWithAI(
  query: string,
  userTracks: UserTrack[],
  userApiKey?: string
): Promise<AISearchResult> {
  if (!query || userTracks.length === 0) {
    return { matchedIds: [], reason: 'Catalog is empty or query is missing.' };
  }

  // Create a fast lookup map of valid IDs
  const validIdMap = new Map<string, UserTrack>();
  for (const track of userTracks) {
    validIdMap.set(track.id, track);
  }

  // Bound catalog size to max 500 candidates to balance latency and comprehensive library coverage
  const candidatePool = userTracks.length > 500 ? userTracks.slice(0, 500) : userTracks;

  // Build condensed catalog representation to minimize token usage
  const compactCatalog = candidatePool.map((t) => ({
    id: t.id,
    title: t.title,
    artist: t.artist,
    playlist: t.playlist_name,
  }));

  const systemPrompt = `You are a music curator assistant for a personal playlist radar.
Your role is to analyze a user's personal song catalog and return ONLY the songs that match their search intent (genre, mood, atmosphere, tempo, era, or theme).

CRITICAL NON-NEGOTIABLE RULES:
1. YOU MUST ONLY SELECT IDs FROM THE PROVIDED USER CATALOG.
2. NEVER INVENT, HALLUCINATE, OR SUGGEST ANY SONG OR ID NOT IN THE LIST.
3. If no songs match the requested mood or style, return an empty array for "matched_ids".
4. You must respond ONLY with a valid JSON object matching this schema:
{
  "matched_ids": ["string (valid ID from catalog)"],
  "reason": "Short explanation of why these songs fit the query"
}`;

  const userPrompt = `User Query: "${query.replace(/"/g, "'")}"

User's Catalog:
${JSON.stringify(compactCatalog, null, 2)}

Filter and return matching IDs in the requested JSON format:`;

  const apiKey = (userApiKey && userApiKey.trim() !== '')
    ? userApiKey.trim()
    : process.env.GEMINI_API_KEY;

  if (apiKey && apiKey !== 'your_gemini_api_key') {
    try {
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      };

      // 1. Try Gemini 3.1 Flash Lite via REST API using secure header
      let res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(payload),
      });

      // 2. Fallback to Gemini 3.8 Flash if lite is unavailable
      if (!res.ok) {
        res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify(payload),
        });
      }

      // 3. Fallback to Gemini Flash Latest
      if (!res.ok) {
        res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        const data = await res.json();
        const rawJsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJsonText) {
          let cleanJson = rawJsonText.trim();
          if (cleanJson.startsWith('```json')) {
            cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
          } else if (cleanJson.startsWith('```')) {
            cleanJson = cleanJson.replace(/^```\s*/, '').replace(/```\s*$/i, '');
          }

          const parsedRaw = JSON.parse(cleanJson);
          const parsed = Array.isArray(parsedRaw) ? parsedRaw[0] : parsedRaw;
          const rawIds: string[] = Array.isArray(parsed?.matched_ids) ? parsed.matched_ids : [];

          // Defense in Depth: strictly filter out any ID that was not in user's original tracks
          const verifiedIds = rawIds.filter((id) => validIdMap.has(id));
          return {
            matchedIds: verifiedIds,
            reason: `[Gemini IA] ${parsed?.reason || 'Canciones seleccionadas con análisis semántico.'}`,
          };
        }
      } else {
        const errText = await res.text();
        console.warn(`[AI Search] Gemini API returned status ${res.status}: ${errText}`);
        if (userApiKey) {
          const fallback = runSmartHeuristicFilter(query, userTracks);
          return {
            matchedIds: fallback.matchedIds,
            reason: `[Filtro de estilo] ${fallback.reason} (Nota: Gemini devolvió código ${res.status})`,
          };
        }
      }
    } catch (err) {
      console.warn('[AI Search] Gemini API call failed. Using fallback filter.', err);
    }
  }

  // Smart Heuristic Fallback (when no API key or on API failure)
  return runSmartHeuristicFilter(query, userTracks);
}

/**
 * Intelligent deterministic music taxonomy filter used as a dev/offline fallback.
 * Maps moods, styles, and genres to musical keywords and filters the user's catalog.
 */
function runSmartHeuristicFilter(query: string, tracks: UserTrack[]): AISearchResult {
  const q = query.toLowerCase();

  const MOOD_TAXONOMY: Record<string, string[]> = {
    electro: ['electro', 'electronic', 'electrónica', 'edm', 'house', 'techno', 'phonk', 'dance', 'synth', 'synthwave', 'avicii', 'daft punk', 'deadmau5', 'm83', 'bass', 'beat', 'wave', 'dj', 'remix', 'rave', 'club', 'trance', 'dubstep'],
    electrónica: ['electro', 'electronic', 'electrónica', 'edm', 'house', 'techno', 'phonk', 'dance', 'synth', 'synthwave', 'avicii', 'daft punk', 'deadmau5', 'm83', 'bass', 'beat', 'wave', 'dj', 'remix', 'rave', 'club', 'trance', 'dubstep'],
    edm: ['edm', 'dance', 'house', 'avicii', 'festival', 'electro', 'drop', 'remix', 'club', 'dj'],
    phonk: ['phonk', 'drift', 'bass', 'gym', 'wave', 'neon', 'cowbell', 'kordhell', 'moondeity', 'memphis'],
    gym: ['gym', 'phonk', 'workout', 'entrenar', 'entrenamiento', 'harder', 'energy', 'power', 'bass', 'neon', 'kordhell', 'moondeity'],
    entrenar: ['gym', 'phonk', 'workout', 'entrenar', 'entrenamiento', 'harder', 'energy', 'power', 'bass', 'neon', 'kordhell', 'moondeity'],
    dance: ['dance', 'daft punk', 'disco', 'funk', 'electro', 'party', 'avicii', 'house', 'club', 'remix'],
    fiesta: ['party', 'fiesta', 'dance', 'disco', 'funk', 'electro', 'daft punk', 'avicii', 'reggaeton', 'remix', 'club'],
    chill: ['chill', 'ambient', 'sleep', 'weightless', 'piano', 'chopin', 'debussy', 'bon iver', 'acoustic', 'jazz', 'quiet', 'relax', 'calm', 'suave', 'tranquila', 'lo-fi', 'lofi'],
    concentrarse: ['ambient', 'sleep', 'weightless', 'piano', 'chopin', 'debussy', 'focus', 'strobe', 'deadmau5', 'miles davis', 'instrumental', 'lo-fi', 'lofi', 'estudiar'],
    focus: ['ambient', 'focus', 'piano', 'chopin', 'debussy', 'weightless', 'strobe', 'deadmau5', 'miles davis', 'instrumental', 'lo-fi', 'lofi', 'estudiar'],
    rock: ['rock', 'metal', 'guitar', 'arctic monkeys', 'indie', 'tame impala', 'band'],
    indie: ['indie', 'arctic monkeys', 'tame impala', 'bon iver', 'm83', 'folk', 'alternative'],
    jazz: ['jazz', 'miles davis', 'blue', 'trumpet', 'saxophone', 'piano', 'smooth'],
    clasica: ['chopin', 'debussy', 'nocturne', 'clair de lune', 'piano', 'classical', 'orchestra', 'symphony'],
    tranquila: ['tranquila', 'ambient', 'weightless', 'piano', 'chopin', 'debussy', 'bon iver', 'miles davis', 'chill', 'sleep', 'paz', 'relax'],
    noche: ['night', 'midnight', 'noche', 'synthwave', 'm83', 'miles davis', 'nocturne', 'resonance', 'dark'],
  };

  const matchedKeywords = new Set<string>();
  for (const [key, keywords] of Object.entries(MOOD_TAXONOMY)) {
    if (q.includes(key)) {
      keywords.forEach((k) => matchedKeywords.add(k));
    }
  }

  // Extract query words while ignoring stop words
  const queryWords = q
    .split(/\s+/)
    .map((w) => w.replace(/[^a-záéíóúüñ0-9]/gi, '').trim())
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  queryWords.forEach((w) => matchedKeywords.add(w));

  const matchedIds: string[] = [];

  for (const track of tracks) {
    const text = `${track.title} ${track.artist} ${track.playlist_name}`.toLowerCase();
    let isMatch = false;

    for (const kw of matchedKeywords) {
      if (text.includes(kw)) {
        isMatch = true;
        break;
      }
    }

    if (isMatch) {
      matchedIds.push(track.id);
    }
  }

  return {
    matchedIds,
    reason: matchedIds.length > 0
      ? `Found ${matchedIds.length} tracks in your catalog matching "${query}".`
      : `No tracks matching "${query}" were found in your saved library.`,
  };
}
