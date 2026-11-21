# 📡 Radar de Playlists con IA (MVP Web Monolito)

Aplicación web full-stack que permite a los usuarios conectar sus cuentas de **Spotify** y **YouTube (YouTube Music)**, sincronizar las canciones de sus playlists a su propio catálogo aislado y buscar dentro de **exclusivamente sus canciones guardadas** (por texto o mediante IA por género, estilo, estado de ánimo o temática) para armar nuevas listas.

---

## 🔒 Regla Central del Producto (Non-Negotiable)
> **La IA nunca inventa canciones externas ni recomienda fuera del catálogo sincronizado del usuario.**  
> Solo filtra y devuelve coincidencias reales de las playlists del usuario autenticado, indicando título, artista, playlist de origen y plataforma (`spotify` | `yt`).

---

## 🏛️ Arquitectura del Monolito

- **Framework:** Next.js (App Router, Route Handlers, Server/Client Components).
- **Estilos:** Tailwind CSS con diseño moderno responsivo en modo oscuro.
- **Base de Datos Híbrida Resiliente:**
  - **Producción:** PostgreSQL (Supabase / Neon / Docker) mediante `pg.Pool` con esquema relacional indexado.
  - **Desarrollo Local:** Almacenamiento JSON persistente automático en `./data/storage.json` con catálogo demo inicial precargado, permitiendo ejecutar y evaluar la app de inmediato sin configurar un servidor de base de datos.
- **Seguridad y Cifrado:**
  - Tokens de acceso y refresco OAuth cifrados en reposo utilizando **AES-256-GCM** nativo de Node.js (`src/lib/crypto.ts`).
  - Todas las consultas de lectura, sincronización y búsqueda están **estrictamente filtradas por `user_id`**.
- **Cero Alucinaciones en IA:**
  - El servicio de IA (`src/lib/services/ai.ts`) envía **únicamente** los IDs y metadatos de las canciones del usuario actual con un prompt de salida estructurada JSON (`matched_ids`).
  - Validación *Defense in Depth*: el backend verifica que cada ID devuelto exista físicamente en la tabla `user_tracks` del usuario antes de retornar la respuesta.

---

## 📂 Modelo de Datos (3 Tablas)

El esquema SQL completo se encuentra en [`src/lib/db/schema.sql`](src/lib/db/schema.sql):

1. **`users`**:
   - `id VARCHAR(128) PRIMARY KEY`
   - `email VARCHAR(255) UNIQUE NOT NULL`
   - `name VARCHAR(255) NOT NULL`
   - `created_at TIMESTAMP WITH TIME ZONE`

2. **`connected_accounts`**:
   - `id UUID PRIMARY KEY`
   - `user_id VARCHAR(128) NOT NULL REFERENCES users(id)`
   - `provider VARCHAR(32) NOT NULL` (`spotify` | `google`)
   - `access_token_enc TEXT NOT NULL` (AES-256-GCM)
   - `refresh_token_enc TEXT NOT NULL` (AES-256-GCM)
   - `expires_at BIGINT NOT NULL`
   - `updated_at TIMESTAMP WITH TIME ZONE`
   - `UNIQUE(user_id, provider)`

3. **`user_tracks`**:
   - `id UUID PRIMARY KEY`
   - `user_id VARCHAR(128) NOT NULL REFERENCES users(id)`
   - `title VARCHAR(512) NOT NULL`
   - `artist VARCHAR(512) NOT NULL`
   - `playlist_name VARCHAR(512) NOT NULL`
   - `source VARCHAR(16) NOT NULL` (`spotify` | `yt`)
   - `external_id VARCHAR(255) NOT NULL`
   - `synced_at TIMESTAMP WITH TIME ZONE`
   - `CONSTRAINT unique_user_track_playlist UNIQUE(user_id, source, external_id, playlist_name)` *(Garantiza que re-sincronizar no duplique temas)*

---

## ⚙️ Variables de Entorno (`.env`)

Copia el archivo de ejemplo para configurar tus credenciales:

```bash
cp .env.example .env.local
```

### Detalle de Variables:

| Variable | Requerido | Descripción |
|---|---|---|
| `DATABASE_URL` | Opcional | Connection string de PostgreSQL / Supabase. Si se omite, usa `./data/storage.json`. |
| `ENCRYPTION_KEY` | Recomendado | Clave de 32 bytes (o 64 caracteres hex) para cifrar los tokens OAuth en AES-256-GCM. |
| `SPOTIFY_CLIENT_ID` | Para OAuth | Client ID de tu aplicación en [Spotify Developer Dashboard](https://developer.spotify.com/dashboard). |
| `SPOTIFY_CLIENT_SECRET` | Para OAuth | Client Secret de Spotify. |
| `SPOTIFY_REDIRECT_URI` | Para OAuth | `http://localhost:3000/api/auth/spotify/callback` |
| `GOOGLE_CLIENT_ID` | Para OAuth | Client ID OAuth 2.0 de [Google Cloud Console](https://console.cloud.google.com/apis/credentials). |
| `GOOGLE_CLIENT_SECRET` | Para OAuth | Client Secret de Google Cloud. |
| `GOOGLE_REDIRECT_URI` | Para OAuth | `http://localhost:3000/api/auth/google/callback` |
| `GEMINI_API_KEY` | Para IA | API Key de Google AI Studio ([aistudio.google.com](https://aistudio.google.com/)). Si se omite, se activa el motor heurístico local. |

---

## 🚀 Puesta en Marcha

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 🧪 Verificación de Criterios de Aceptación

1. **Aislamiento Multi-usuario (Criterio 1):**
   - En la pantalla principal (`/`), puedes alternar entre **Alex Rivera** y **Beatriz Gomez**.
   - Alex tiene canciones de *Daft Punk, Tame Impala, M83, Arctic Monkeys*.
   - Beatriz tiene canciones de *Miles Davis, Chopin, Debussy, Bon Iver*.
   - Al buscar en `/radar`, Alex **nunca** verá canciones de Beatriz ni viceversa.
2. **100% canciones existentes en catálogo (Criterio 2):**
   - Si buscas `"Daft Punk"` en modo texto o `"música tranquila para concentrarse"` en modo IA, todas las canciones devueltas tienen su ID, playlist y procedencia de la base de datos del usuario actual.
3. **No duplicación al re-sincronizar (Criterio 3):**
   - Al presionar **"Sincronizar playlists ahora"**, el sistema realiza un `upsert` basado en la clave única `(user_id, source, external_id, playlist_name)`.
4. **Respuestas vacías sin alucinaciones (Criterio 4):**
   - Si buscas un término no presente en el catálogo (ej: `"reggaeton fiesta"` en el catálogo de Beatriz), el sistema devuelve una lista vacía con un mensaje explicativo claro, sin inventar recomendaciones externas.
