import { UserTrack } from '../types';

interface AISearchResult {
  matchedIds: string[];
  reason: string;
}

/**
 * Executes an AI-powered semantic search over EXCLUSIVELY the provided user catalog.
 * Guarantees zero hallucinations by:
 * 1. Feeding ONLY the user's tracks list with exact internal IDs.
 * 2. Prompting the model with hard constraints to return only IDs from the catalog.
 * 3. Enforcing a post-generation validation step that rejects any ID not in the catalog.
 */
export async function searchWithAI(
  query: string,
  userTracks: UserTrack[]
): Promise<AISearchResult> {
  if (!query || userTracks.length === 0) {
    return { matchedIds: [], reason: 'Catalog is empty or query is missing.' };
  }

  // Create a fast lookup map of valid IDs
  const validIdMap = new Map<string, UserTrack>();
  for (const track of userTracks) {
    validIdMap.set(track.id, track);
  }

  // Build condensed catalog representation to minimize token usage
  const compactCatalog = userTracks.map((t) => ({
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

  const userPrompt = `User Query: "${query}"

User's Catalog:
${JSON.stringify(compactCatalog, null, 2)}

Filter and return matching IDs in the requested JSON format:`;

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey !== 'your_gemini_api_key') {
    try {
      // Call Gemini 2.5 / 1.5 Flash via REST API
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1, // low temperature for strict factual adherence
        },
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const rawJsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJsonText) {
          const parsed = JSON.parse(rawJsonText);
          const rawIds: string[] = Array.isArray(parsed.matched_ids) ? parsed.matched_ids : [];

          // Defense in Depth: strictly filter out any ID that was not in user's original tracks
          const verifiedIds = rawIds.filter((id) => validIdMap.has(id));
          return {
            matchedIds: verifiedIds,
            reason: parsed.reason || 'Songs matching your theme from your radar.',
          };
        }
      } else {
        console.warn(`[AI Search] Gemini API returned status ${res.status}. Falling back to smart semantic filter.`);
      }
    } catch (err) {
      console.warn('[AI Search] Gemini API call failed. Using fallback filter.', err);
    }
  }

  // Smart Heuristic Fallback (when no GEMINI_API_KEY is configured in dev)
  // Ensures developer can test AI mode immediately without an API key!
  return runSmartHeuristicFilter(query, userTracks);
}

/**
 * Intelligent deterministic music taxonomy filter used as a dev fallback.
 * Maps moods, styles, and genres to musical keywords and filters the user's catalog.
 */
function runSmartHeuristicFilter(query: string, tracks: UserTrack[]): AISearchResult {
  const q = query.toLowerCase();

  const MOOD_TAXONOMY: Record<string, string[]> = {
    chill: ['ambient', 'chill', 'sleep', 'weightless', 'piano', 'chopin', 'debussy', 'bon iver', 'acoustic', 'jazz', 'quiet'],
    concentrarse: ['ambient', 'sleep', 'weightless', 'piano', 'chopin', 'debussy', 'focus', 'strobe', 'deadmau5', 'miles davis'],
    focus: ['ambient', 'focus', 'piano', 'chopin', 'debussy', 'weightless', 'strobe', 'deadmau5', 'miles davis', 'instrumental'],
    fiesta: ['daft punk', 'dance', 'lucky', 'harder', 'disco', 'funk', 'party', 'electro'],
    dance: ['daft punk', 'dance', 'lucky', 'harder', 'disco', 'funk', 'electro', 'party'],
    electrónica: ['daft punk', 'deadmau5', 'synthwave', 'm83', 'resonance', 'home', 'electro', 'dance'],
    electro: ['daft punk', 'deadmau5', 'synthwave', 'm83', 'resonance', 'home', 'electro'],
    rock: ['arctic monkeys', 'indie', 'tame impala', 'rock'],
    indie: ['arctic monkeys', 'tame impala', 'bon iver', 'm83', 'indie', 'folk'],
    jazz: ['miles davis', 'jazz', 'blue', 'trumpet'],
    clasica: ['chopin', 'debussy', 'nocturne', 'clair de lune', 'piano', 'classical'],
    tranquila: ['ambient', 'weightless', 'piano', 'chopin', 'debussy', 'bon iver', 'miles davis', 'chill', 'sleep'],
    noche: ['night', 'midnight', 'synthwave', 'm83', 'miles davis', 'nocturne', 'resonance'],
  };

  const matchedKeywords = new Set<string>();
  for (const [key, keywords] of Object.entries(MOOD_TAXONOMY)) {
    if (q.includes(key)) {
      keywords.forEach((k) => matchedKeywords.add(k));
    }
  }

  // Also extract query words directly
  const queryWords = q.split(/\s+/).filter((w) => w.length > 2);
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
