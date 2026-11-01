-- Migration: 0001_init_d1_storage.sql
-- Description: Initialize payment-free Cloudflare D1 Unified Storage tables for Ravi Dasari Portfolio
-- Target Database: ravi-portfolio-db (43cb626e-017f-4b4b-b563-e9c5308c5b27)

-- 1. Table for structured JSON documents (content, auth credentials, challenges, backups)
CREATE TABLE IF NOT EXISTS portfolio_documents (
  key TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  etag TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 2. Table for binary media assets metadata (profile photos, project screenshots, resume PDFs)
CREATE TABLE IF NOT EXISTS portfolio_media (
  key TEXT PRIMARY KEY,
  mime_type TEXT NOT NULL,
  total_size INTEGER NOT NULL,
  chunk_count INTEGER NOT NULL,
  checksum TEXT NOT NULL,
  etag TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'complete', -- 'uploading' | 'complete'
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 3. Table for binary media chunks (512 KB per chunk for files up to 10 MB)
CREATE TABLE IF NOT EXISTS portfolio_media_chunks (
  media_key TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_size INTEGER NOT NULL,
  data BLOB NOT NULL,
  PRIMARY KEY (media_key, chunk_index),
  FOREIGN KEY (media_key) REFERENCES portfolio_media(key) ON DELETE CASCADE
);

-- 4. Indexes for rapid lookups and prefix queries
CREATE INDEX IF NOT EXISTS idx_docs_updated_at ON portfolio_documents(updated_at);
CREATE INDEX IF NOT EXISTS idx_media_updated_at ON portfolio_media(updated_at);
CREATE INDEX IF NOT EXISTS idx_media_status ON portfolio_media(status);

