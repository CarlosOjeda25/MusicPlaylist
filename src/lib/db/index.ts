import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { User, ConnectedAccount, UserTrack, Provider } from '../types';
import crypto from 'crypto';

interface StorageData {
  users: User[];
  connected_accounts: ConnectedAccount[];
  user_tracks: UserTrack[];
}

class DatabaseService {
  private pool: Pool | null = null;
  private isPgAvailable = false;
  private localFilePath: string;

  constructor() {
    this.localFilePath = path.join(process.cwd(), 'data', 'storage.json');
    this.init();
  }

  private async init() {
    // If DATABASE_URL is set, attempt PostgreSQL connection
    if (process.env.DATABASE_URL) {
      try {
        this.pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
        });
        const client = await this.pool.connect();
        client.release();
        this.isPgAvailable = true;
        console.log('[DB] Connected to PostgreSQL successfully.');
        await this.runPgMigrations();
        return;
      } catch (err) {
        console.warn('[DB] Could not connect to PostgreSQL. Falling back to local storage.', err);
        this.isPgAvailable = false;
      }
    }
    // Fallback to local JSON storage
    this.ensureLocalFile();
  }

  private ensureLocalFile() {
    const dir = path.dirname(this.localFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.localFilePath)) {
      const initial: StorageData = {
        users: [
          {
            id: 'user_alex',
            email: 'alex@radar.music',
            name: 'Alex Rivera',
            created_at: new Date().toISOString(),
          },
          {
            id: 'user_beatriz',
            email: 'beatriz@radar.music',
            name: 'Beatriz Gomez',
            created_at: new Date().toISOString(),
          },
        ],
        connected_accounts: [],
        user_tracks: [],
      };
      fs.writeFileSync(this.localFilePath, JSON.stringify(initial, null, 2), 'utf8');
      this.seedInitialCatalog(initial);
    }
  }

  private seedInitialCatalog(data: StorageData) {
    // Sample catalog for Alex Rivera (Electronic, Indie, Synthwave, Rock)
    const alexTracks: Omit<UserTrack, 'id'>[] = [
      { user_id: 'user_alex', title: 'Get Lucky', artist: 'Daft Punk ft. Pharrell Williams', playlist_name: 'Electro Funk Classics', source: 'spotify', external_id: 'sp_101', synced_at: new Date().toISOString() },
      { user_id: 'user_alex', title: 'Harder, Better, Faster, Stronger', artist: 'Daft Punk', playlist_name: 'Electro Funk Classics', source: 'spotify', external_id: 'sp_102', synced_at: new Date().toISOString() },
      { user_id: 'user_alex', title: 'One More Time', artist: 'Daft Punk', playlist_name: 'Dance Party 2000s', source: 'spotify', external_id: 'sp_103', synced_at: new Date().toISOString() },
      { user_id: 'user_alex', title: 'The Less I Know The Better', artist: 'Tame Impala', playlist_name: 'Psychedelic Chill', source: 'spotify', external_id: 'sp_104', synced_at: new Date().toISOString() },
      { user_id: 'user_alex', title: 'Let It Happen', artist: 'Tame Impala', playlist_name: 'Psychedelic Chill', source: 'spotify', external_id: 'sp_105', synced_at: new Date().toISOString() },
      { user_id: 'user_alex', title: 'Midnight City', artist: 'M83', playlist_name: 'Night Drive Synthwave', source: 'yt', external_id: 'yt_106', synced_at: new Date().toISOString() },
      { user_id: 'user_alex', title: 'Resonance', artist: 'HOME', playlist_name: 'Night Drive Synthwave', source: 'yt', external_id: 'yt_107', synced_at: new Date().toISOString() },
      { user_id: 'user_alex', title: 'Do I Wanna Know?', artist: 'Arctic Monkeys', playlist_name: 'Modern Indie Rock', source: 'spotify', external_id: 'sp_108', synced_at: new Date().toISOString() },
      { user_id: 'user_alex', title: 'Weightless', artist: 'Marconi Union', playlist_name: 'Deep Ambient Sleep', source: 'yt', external_id: 'yt_109', synced_at: new Date().toISOString() },
      { user_id: 'user_alex', title: 'Strobe', artist: 'deadmau5', playlist_name: 'Progressive Focus', source: 'spotify', external_id: 'sp_110', synced_at: new Date().toISOString() },
    ];

    // Sample catalog for Beatriz Gomez (Acoustic, Jazz, Classical, Folk)
    const beatrizTracks: Omit<UserTrack, 'id'>[] = [
      { user_id: 'user_beatriz', title: 'So What', artist: 'Miles Davis', playlist_name: 'Late Night Jazz', source: 'spotify', external_id: 'sp_201', synced_at: new Date().toISOString() },
      { user_id: 'user_beatriz', title: 'Blue in Green', artist: 'Miles Davis', playlist_name: 'Late Night Jazz', source: 'spotify', external_id: 'sp_202', synced_at: new Date().toISOString() },
      { user_id: 'user_beatriz', title: 'Nocturne Op. 9 No. 2', artist: 'Frédéric Chopin', playlist_name: 'Classical Piano Focus', source: 'yt', external_id: 'yt_203', synced_at: new Date().toISOString() },
      { user_id: 'user_beatriz', title: 'Clair de Lune', artist: 'Claude Debussy', playlist_name: 'Classical Piano Focus', source: 'yt', external_id: 'yt_204', synced_at: new Date().toISOString() },
      { user_id: 'user_beatriz', title: 'Holocene', artist: 'Bon Iver', playlist_name: 'Acoustic Morning Vibes', source: 'spotify', external_id: 'sp_205', synced_at: new Date().toISOString() },
      { user_id: 'user_beatriz', title: 'Skinny Love', artist: 'Bon Iver', playlist_name: 'Acoustic Morning Vibes', source: 'spotify', external_id: 'sp_206', synced_at: new Date().toISOString() },
    ];

    data.user_tracks = [
      ...alexTracks.map((t) => ({ ...t, id: crypto.randomUUID() })),
      ...beatrizTracks.map((t) => ({ ...t, id: crypto.randomUUID() })),
    ];
    fs.writeFileSync(this.localFilePath, JSON.stringify(data, null, 2), 'utf8');
  }

  private readLocal(): StorageData {
    this.ensureLocalFile();
    const raw = fs.readFileSync(this.localFilePath, 'utf8');
    return JSON.parse(raw);
  }

  private writeLocal(data: StorageData) {
    fs.writeFileSync(this.localFilePath, JSON.stringify(data, null, 2), 'utf8');
  }

  private async runPgMigrations() {
    if (!this.pool) return;
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await this.pool.query(sql);
    }
  }

  // --- Users ---
  async getUserById(id: string): Promise<User | null> {
    if (this.isPgAvailable && this.pool) {
      const res = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
      return res.rows[0] || null;
    }
    const data = this.readLocal();
    return data.users.find((u) => u.id === id) || null;
  }

  async upsertUser(user: User): Promise<User> {
    if (this.isPgAvailable && this.pool) {
      const query = `
        INSERT INTO users (id, email, name, created_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET email = $2, name = $3
        RETURNING *;
      `;
      const res = await this.pool.query(query, [user.id, user.email, user.name, user.created_at]);
      return res.rows[0];
    }
    const data = this.readLocal();
    const idx = data.users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      data.users[idx] = user;
    } else {
      data.users.push(user);
    }
    this.writeLocal(data);
    return user;
  }

  // --- Connected Accounts ---
  async getConnectedAccounts(userId: string): Promise<ConnectedAccount[]> {
    if (this.isPgAvailable && this.pool) {
      const res = await this.pool.query('SELECT * FROM connected_accounts WHERE user_id = $1', [userId]);
      return res.rows;
    }
    const data = this.readLocal();
    return data.connected_accounts.filter((a) => a.user_id === userId);
  }

  async getConnectedAccount(userId: string, provider: Provider): Promise<ConnectedAccount | null> {
    if (this.isPgAvailable && this.pool) {
      const res = await this.pool.query(
        'SELECT * FROM connected_accounts WHERE user_id = $1 AND provider = $2',
        [userId, provider]
      );
      return res.rows[0] || null;
    }
    const data = this.readLocal();
    return data.connected_accounts.find((a) => a.user_id === userId && a.provider === provider) || null;
  }

  async saveConnectedAccount(account: Omit<ConnectedAccount, 'id'>): Promise<ConnectedAccount> {
    const id = crypto.randomUUID();
    const fullAccount: ConnectedAccount = { ...account, id };

    if (this.isPgAvailable && this.pool) {
      const query = `
        INSERT INTO connected_accounts (id, user_id, provider, access_token_enc, refresh_token_enc, expires_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id, provider) DO UPDATE SET
          access_token_enc = $4,
          refresh_token_enc = $5,
          expires_at = $6,
          updated_at = $7
        RETURNING *;
      `;
      const res = await this.pool.query(query, [
        id,
        account.user_id,
        account.provider,
        account.access_token_enc,
        account.refresh_token_enc,
        account.expires_at,
        account.updated_at,
      ]);
      return res.rows[0];
    }

    const data = this.readLocal();
    const idx = data.connected_accounts.findIndex(
      (a) => a.user_id === account.user_id && a.provider === account.provider
    );
    if (idx >= 0) {
      data.connected_accounts[idx] = { ...data.connected_accounts[idx], ...account };
      this.writeLocal(data);
      return data.connected_accounts[idx];
    } else {
      data.connected_accounts.push(fullAccount);
      this.writeLocal(data);
      return fullAccount;
    }
  }

  // --- User Tracks ---
  async getUserTracks(userId: string): Promise<UserTrack[]> {
    if (this.isPgAvailable && this.pool) {
      const res = await this.pool.query(
        'SELECT * FROM user_tracks WHERE user_id = $1 ORDER BY synced_at DESC',
        [userId]
      );
      return res.rows;
    }
    const data = this.readLocal();
    return data.user_tracks.filter((t) => t.user_id === userId);
  }

  async upsertUserTracks(tracks: Omit<UserTrack, 'id'>[]): Promise<{ inserted: number; total: number }> {
    if (tracks.length === 0) return { inserted: 0, total: 0 };
    const userId = tracks[0].user_id;

    if (this.isPgAvailable && this.pool) {
      let inserted = 0;
      for (const track of tracks) {
        const query = `
          INSERT INTO user_tracks (id, user_id, title, artist, playlist_name, source, external_id, synced_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (user_id, source, external_id, playlist_name) DO UPDATE SET
            title = $3,
            artist = $4,
            synced_at = $8
          RETURNING (xmax = 0) AS is_new;
        `;
        const res = await this.pool.query(query, [
          crypto.randomUUID(),
          track.user_id,
          track.title,
          track.artist,
          track.playlist_name,
          track.source,
          track.external_id,
          track.synced_at,
        ]);
        if (res.rows[0]?.is_new) inserted++;
      }
      const totalRes = await this.pool.query(
        'SELECT COUNT(*) FROM user_tracks WHERE user_id = $1',
        [userId]
      );
      return { inserted, total: parseInt(totalRes.rows[0].count, 10) };
    }

    const data = this.readLocal();
    let newCount = 0;

    for (const track of tracks) {
      const existingIdx = data.user_tracks.findIndex(
        (t) =>
          t.user_id === track.user_id &&
          t.source === track.source &&
          t.external_id === track.external_id &&
          t.playlist_name === track.playlist_name
      );

      if (existingIdx >= 0) {
        data.user_tracks[existingIdx] = {
          ...data.user_tracks[existingIdx],
          title: track.title,
          artist: track.artist,
          synced_at: track.synced_at,
        };
      } else {
        data.user_tracks.push({
          ...track,
          id: crypto.randomUUID(),
        });
        newCount++;
      }
    }

    this.writeLocal(data);
    const total = data.user_tracks.filter((t) => t.user_id === userId).length;
    return { inserted: newCount, total };
  }

  async searchUserTracks(userId: string, query: string): Promise<UserTrack[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    if (this.isPgAvailable && this.pool) {
      const res = await this.pool.query(
        `SELECT * FROM user_tracks
         WHERE user_id = $1
           AND (LOWER(title) LIKE $2 OR LOWER(artist) LIKE $2 OR LOWER(playlist_name) LIKE $2)
         ORDER BY artist ASC, title ASC`,
        [userId, `%${q}%`]
      );
      return res.rows;
    }

    const data = this.readLocal();
    return data.user_tracks.filter(
      (t) =>
        t.user_id === userId &&
        (t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          t.playlist_name.toLowerCase().includes(q))
    );
  }

  async getUserTracksByIds(userId: string, ids: string[]): Promise<UserTrack[]> {
    if (!ids || ids.length === 0) return [];

    if (this.isPgAvailable && this.pool) {
      const res = await this.pool.query(
        `SELECT * FROM user_tracks WHERE user_id = $1 AND id = ANY($2::uuid[])`,
        [userId, ids]
      );
      return res.rows;
    }

    const data = this.readLocal();
    const idSet = new Set(ids);
    return data.user_tracks.filter((t) => t.user_id === userId && idSet.has(t.id));
  }
}

export const db = new DatabaseService();
