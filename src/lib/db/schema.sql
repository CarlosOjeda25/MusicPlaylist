-- ==============================================================================
-- Database Schema for Radar de Playlists (PostgreSQL / Supabase)
-- ==============================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(128) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Connected Accounts Table (OAuth tokens encrypted at rest)
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

-- 3. User Tracks Table (Exclusively synced user songs)
CREATE TABLE IF NOT EXISTS user_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(512) NOT NULL,
    artist VARCHAR(512) NOT NULL,
    playlist_name VARCHAR(512) NOT NULL,
    source VARCHAR(16) NOT NULL CHECK (source IN ('spotify', 'yt')),
    external_id VARCHAR(255) NOT NULL,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT unique_user_track_playlist UNIQUE(user_id, source, external_id, playlist_name)
);

-- Indexes for performance and multi-tenant security enforcement
CREATE INDEX IF NOT EXISTS idx_user_tracks_user_id ON user_tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tracks_search ON user_tracks(user_id, artist, title);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_user_id ON connected_accounts(user_id);
