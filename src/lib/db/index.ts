import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { User, ConnectedAccount, UserTrack, Provider } from '../types';
import crypto from 'crypto';

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<any[]>;
  exec(query: string): Promise<any>;
}

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  all<T = any>(): Promise<{ results?: T[]; success: boolean; error?: string }>;
  run<T = any>(): Promise<{ success: boolean; meta?: any }>;
  first<T = any>(colName?: string): Promise<T | null>;
}

const PG_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(128) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS connected_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL CHECK (provider IN ('spotify', 'google')),
    access_token_enc TEXT NOT NULL,
    refresh_token_enc TEXT NOT NULL,
    expires_at BIGINT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT unique_user_provider UNIQUE(user_id, provider)
);

CREATE TABLE IF NOT EXISTS user_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    playlist_name TEXT NOT NULL,
    source VARCHAR(16) NOT NULL CHECK (source IN ('spotify', 'yt')),
    external_id VARCHAR(255) NOT NULL,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT unique_user_track_playlist UNIQUE(user_id, source, external_id, playlist_name)
);

CREATE INDEX IF NOT EXISTS idx_user_tracks_user_id ON user_tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tracks_search ON user_tracks(user_id, artist, title);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_user_id ON connected_accounts(user_id);
`;

interface StorageData {
  users: User[];
  connected_accounts: ConnectedAccount[];
  user_tracks: UserTrack[];
}

export class DatabaseService {
  private pool: Pool | null = null;
  private d1: D1Database | null = null;
  private isPgAvailable = false;
  private isD1Available = false;
  private localFilePath: string;
  private initPromise: Promise<void>;
  private memoryData: StorageData = {
    users: [
      {
        id: 'user_main',
        email: 'user@radar.audio',
        name: 'Usuario Principal',
        created_at: new Date().toISOString(),
      },
    ],
    connected_accounts: [],
    user_tracks: [],
  };

  constructor() {
    this.localFilePath = path.join(process.cwd(), 'data', 'storage.json');
    this.initPromise = this.init();
  }

  public async ready(): Promise<void> {
    await this.initPromise;
    if (!this.d1) {
      await this.resolveD1();
    }
  }

  private async resolveD1(): Promise<void> {
    // 1. Check globalThis.DB
    const globalD1 = (globalThis as any).DB as D1Database | undefined;
    if (globalD1 && typeof globalD1.prepare === 'function') {
      this.d1 = globalD1;
      this.isD1Available = true;
      return;
    }

    // 2. Check process.env.DB
    const processD1 = (process.env as any).DB as D1Database | undefined;
    if (processD1 && typeof processD1.prepare === 'function') {
      this.d1 = processD1;
      this.isD1Available = true;
      return;
    }

    // 3. Check OpenNext getCloudflareContext
    try {
      const { getCloudflareContext } = await import('@opennextjs/cloudflare');
      const ctx = await getCloudflareContext({ async: true });
      const envAny = ctx?.env as any;
      if (envAny?.DB && typeof envAny.DB.prepare === 'function') {
        this.d1 = envAny.DB;
        this.isD1Available = true;
        return;
      }
    } catch {
      // Ignored outside of Cloudflare request context
    }
  }

  private async init(): Promise<void> {
    // 1. Attempt D1 resolution
    await this.resolveD1();
    if (this.isD1Available) {
      console.log('[DB] Connected to Cloudflare D1 database.');
      return;
    }

    // 2. Check for PostgreSQL DATABASE_URL
    if (process.env.DATABASE_URL) {
      try {
        this.pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
        });
        this.pool.on('error', (err) => {
          console.error('[DB] Unexpected error on idle PostgreSQL client', err);
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

    // 3. Fallback to local storage (safe try/catch for edge/worker environments)
    this.ensureLocalFile();
  }

  private ensureLocalFile() {
    try {
      const dir = path.dirname(this.localFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (!fs.existsSync(this.localFilePath)) {
        const initial: StorageData = {
          users: [
            {
              id: 'user_main',
              email: 'user@radar.audio',
              name: 'Usuario Principal',
              created_at: new Date().toISOString(),
            },
          ],
          connected_accounts: [],
          user_tracks: [],
        };
        fs.writeFileSync(this.localFilePath, JSON.stringify(initial, null, 2), 'utf8');
      }
    } catch {
      // Filesystem not writable or not supported in this runtime (e.g. Cloudflare Workers unenv)
    }
  }

  private readLocal(): StorageData {
    try {
      this.ensureLocalFile();
      if (fs.existsSync(this.localFilePath)) {
        const raw = fs.readFileSync(this.localFilePath, 'utf8');
        return JSON.parse(raw);
      }
    } catch {
      // In unenv / workerd, fallback to memory
    }
    return this.memoryData;
  }

  private writeLocal(data: StorageData) {
    try {
      this.ensureLocalFile();
      const tmp = `${this.localFilePath}.${Date.now()}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
      fs.renameSync(tmp, this.localFilePath);
    } catch {
      // In unenv / workerd, fallback to memory
      this.memoryData = data;
    }
  }

  private async runPgMigrations() {
    if (!this.pool) return;
    try {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const sql = fs.existsSync(schemaPath)
        ? fs.readFileSync(schemaPath, 'utf8')
        : PG_SCHEMA_SQL;
      await this.pool.query(sql);
    } catch (err) {
      console.error('[DB Migration Error]', err);
    }
  }

  // --- Users ---
  async getUserById(id: string): Promise<User | null> {
    await this.ready();

    if (this.isD1Available && this.d1) {
      const res = await this.d1.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>();
      return res || null;
    }

    if (this.isPgAvailable && this.pool) {
      const res = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
      return res.rows[0] || null;
    }

    const data = this.readLocal();
    return data.users.find((u) => u.id === id) || null;
  }

  async upsertUser(user: User): Promise<User> {
    await this.ready();

    if (this.isD1Available && this.d1) {
      await this.d1
        .prepare(
          `INSERT INTO users (id, email, name, created_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT (id) DO UPDATE SET email = excluded.email, name = excluded.name`
        )
        .bind(user.id, user.email, user.name, user.created_at)
        .run();
      return user;
    }

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
    await this.ready();

    if (this.isD1Available && this.d1) {
      const res = await this.d1.prepare('SELECT * FROM connected_accounts WHERE user_id = ?').bind(userId).all<ConnectedAccount>();
      return res.results || [];
    }

    if (this.isPgAvailable && this.pool) {
      const res = await this.pool.query('SELECT * FROM connected_accounts WHERE user_id = $1', [userId]);
      return res.rows;
    }

    const data = this.readLocal();
    return data.connected_accounts.filter((a) => a.user_id === userId);
  }

  async getConnectedAccount(userId: string, provider: Provider): Promise<ConnectedAccount | null> {
    await this.ready();

    if (this.isD1Available && this.d1) {
      const res = await this.d1
        .prepare('SELECT * FROM connected_accounts WHERE user_id = ? AND provider = ?')
        .bind(userId, provider)
        .first<ConnectedAccount>();
      return res || null;
    }

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
    await this.ready();
    const id = crypto.randomUUID();
    const fullAccount: ConnectedAccount = { ...account, id };

    if (this.isD1Available && this.d1) {
      await this.d1
        .prepare(
          `INSERT INTO connected_accounts (id, user_id, provider, access_token_enc, refresh_token_enc, expires_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (user_id, provider) DO UPDATE SET
             access_token_enc = excluded.access_token_enc,
             refresh_token_enc = CASE WHEN excluded.refresh_token_enc != '' THEN excluded.refresh_token_enc ELSE connected_accounts.refresh_token_enc END,
             expires_at = excluded.expires_at,
             updated_at = excluded.updated_at`
        )
        .bind(
          id,
          account.user_id,
          account.provider,
          account.access_token_enc,
          account.refresh_token_enc,
          account.expires_at,
          account.updated_at
        )
        .run();
      return fullAccount;
    }

    if (this.isPgAvailable && this.pool) {
      const query = `
        INSERT INTO connected_accounts (id, user_id, provider, access_token_enc, refresh_token_enc, expires_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id, provider) DO UPDATE SET
          access_token_enc = $4,
          refresh_token_enc = CASE WHEN $5 != '' THEN $5 ELSE connected_accounts.refresh_token_enc END,
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
      const existing = data.connected_accounts[idx];
      data.connected_accounts[idx] = {
        ...existing,
        ...account,
        refresh_token_enc: account.refresh_token_enc || existing.refresh_token_enc,
      };
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
    await this.ready();

    if (this.isD1Available && this.d1) {
      const res = await this.d1
        .prepare('SELECT * FROM user_tracks WHERE user_id = ? ORDER BY synced_at DESC')
        .bind(userId)
        .all<UserTrack>();
      return res.results || [];
    }

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
    await this.ready();
    if (tracks.length === 0) return { inserted: 0, total: 0 };

    // Defense in Depth: Deduplicate in memory by conflict key (user_id, source, external_id, playlist_name)
    // Prevents PostgreSQL ERROR 21000 ("ON CONFLICT DO UPDATE command cannot affect row a second time")
    const trackMap = new Map<string, Omit<UserTrack, 'id'>>();
    for (const t of tracks) {
      const key = `${t.user_id}:${t.source}:${t.external_id}:${t.playlist_name}`;
      trackMap.set(key, t);
    }
    const cleanTracks = Array.from(trackMap.values());
    const userId = cleanTracks[0].user_id;

    // 1. Cloudflare D1 batching (in chunks of 50)
    if (this.isD1Available && this.d1) {
      const initialCountRes = await this.d1.prepare('SELECT COUNT(*) as cnt FROM user_tracks WHERE user_id = ?').bind(userId).first<{ cnt: number }>();
      const initialCount = initialCountRes?.cnt || 0;

      const CHUNK_SIZE = 50;
      for (let i = 0; i < cleanTracks.length; i += CHUNK_SIZE) {
        const chunk = cleanTracks.slice(i, i + CHUNK_SIZE);
        const stmts = chunk.map((t) =>
          this.d1!.prepare(
            `INSERT INTO user_tracks (id, user_id, title, artist, playlist_name, source, external_id, synced_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT (user_id, source, external_id, playlist_name) DO UPDATE SET
               title = excluded.title,
               artist = excluded.artist,
               synced_at = excluded.synced_at`
          ).bind(
            crypto.randomUUID(),
            t.user_id,
            t.title,
            t.artist,
            t.playlist_name,
            t.source,
            t.external_id,
            t.synced_at
          )
        );
        await this.d1.batch(stmts);
      }
      const postCountRes = await this.d1.prepare('SELECT COUNT(*) as cnt FROM user_tracks WHERE user_id = ?').bind(userId).first<{ cnt: number }>();
      const postCount = postCountRes?.cnt || initialCount;
      return { inserted: Math.max(0, postCount - initialCount), total: postCount };
    }

    // 2. PostgreSQL batching with multi-row chunks inside transaction
    if (this.isPgAvailable && this.pool) {
      const client = await this.pool.connect();
      let inserted = 0;
      try {
        await client.query('BEGIN');
        const BATCH_SIZE = 50;
        for (let i = 0; i < cleanTracks.length; i += BATCH_SIZE) {
          const batch = cleanTracks.slice(i, i + BATCH_SIZE);
          const valueClauses: string[] = [];
          const params: any[] = [];
          let paramIdx = 1;

          for (const t of batch) {
            valueClauses.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, $${paramIdx + 5}, $${paramIdx + 6}, $${paramIdx + 7})`);
            params.push(crypto.randomUUID(), t.user_id, t.title, t.artist, t.playlist_name, t.source, t.external_id, t.synced_at);
            paramIdx += 8;
          }

          const query = `
            INSERT INTO user_tracks (id, user_id, title, artist, playlist_name, source, external_id, synced_at)
            VALUES ${valueClauses.join(', ')}
            ON CONFLICT (user_id, source, external_id, playlist_name) DO UPDATE SET
              title = EXCLUDED.title,
              artist = EXCLUDED.artist,
              synced_at = EXCLUDED.synced_at
            RETURNING (xmax::text = '0') AS is_new;
          `;
          const res = await client.query(query, params);
          inserted += res.rows.filter((r) => r.is_new).length;
        }
        await client.query('COMMIT');

        const totalRes = await client.query('SELECT COUNT(*) FROM user_tracks WHERE user_id = $1', [userId]);
        return { inserted, total: parseInt(totalRes.rows[0].count, 10) };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // 3. Local JSON storage (with in-memory index for O(1) lookups)
    const data = this.readLocal();
    const existingIndex = new Map<string, number>();
    for (let i = 0; i < data.user_tracks.length; i++) {
      const ut = data.user_tracks[i];
      existingIndex.set(`${ut.user_id}:${ut.source}:${ut.external_id}:${ut.playlist_name}`, i);
    }

    let newCount = 0;
    for (const track of cleanTracks) {
      const key = `${track.user_id}:${track.source}:${track.external_id}:${track.playlist_name}`;
      const existingIdx = existingIndex.get(key);

      if (existingIdx !== undefined) {
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
        existingIndex.set(key, data.user_tracks.length - 1);
        newCount++;
      }
    }

    this.writeLocal(data);
    const total = data.user_tracks.filter((t) => t.user_id === userId).length;
    return { inserted: newCount, total };
  }

  async searchUserTracks(userId: string, query: string): Promise<UserTrack[]> {
    await this.ready();
    const q = query.trim().toLowerCase();
    if (!q) return [];

    if (this.isD1Available && this.d1) {
      const pattern = `%${q}%`;
      const res = await this.d1
        .prepare(
          `SELECT * FROM user_tracks
           WHERE user_id = ?
             AND (LOWER(title) LIKE ? OR LOWER(artist) LIKE ? OR LOWER(playlist_name) LIKE ?)
           ORDER BY artist ASC, title ASC`
        )
        .bind(userId, pattern, pattern, pattern)
        .all<UserTrack>();
      return res.results || [];
    }

    if (this.isPgAvailable && this.pool) {
      const escaped = q.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
      const res = await this.pool.query(
        `SELECT * FROM user_tracks
         WHERE user_id = $1
           AND (LOWER(title) LIKE $2 OR LOWER(artist) LIKE $2 OR LOWER(playlist_name) LIKE $2)
         ORDER BY artist ASC, title ASC`,
        [userId, `%${escaped}%`]
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
    await this.ready();
    if (!ids || ids.length === 0) return [];

    let tracks: UserTrack[] = [];

    if (this.isD1Available && this.d1) {
      const placeholders = ids.map(() => '?').join(',');
      const res = await this.d1
        .prepare(`SELECT * FROM user_tracks WHERE user_id = ? AND id IN (${placeholders})`)
        .bind(userId, ...ids)
        .all<UserTrack>();
      tracks = res.results || [];
    } else if (this.isPgAvailable && this.pool) {
      const res = await this.pool.query(
        `SELECT * FROM user_tracks WHERE user_id = $1 AND id = ANY($2::uuid[])`,
        [userId, ids]
      );
      tracks = res.rows;
    } else {
      const data = this.readLocal();
      const idSet = new Set(ids);
      tracks = data.user_tracks.filter((t) => t.user_id === userId && idSet.has(t.id));
    }

    const idOrder = new Map(ids.map((id, index) => [id, index]));
    return tracks.sort((a, b) => {
      const orderA = idOrder.get(a.id) ?? Infinity;
      const orderB = idOrder.get(b.id) ?? Infinity;
      return orderA - orderB;
    });
  }
}

export const db = new DatabaseService();
