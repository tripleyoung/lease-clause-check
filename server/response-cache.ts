import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export interface CacheEntry<T = unknown> {
  key: string;
  action: string;
  value: T;
  createdAt: number;
  expiresAt: number;
  hits: number;
}

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
const MAX_ENTRIES = 256;
const CACHE_FILE = path.join(process.cwd(), '.data', 'response-cache.json');

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canonicalize(v)]),
    );
  }
  return value;
}

export function fingerprintRequest(action: string, payload: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify({ action, payload: canonicalize(payload) }))
    .digest('hex')
    .slice(0, 32);
}

class ResponseCacheStore {
  private map = new Map<string, CacheEntry>();
  private totalHits = 0;
  private totalMisses = 0;

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (!fs.existsSync(CACHE_FILE)) return;
      const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) as {
        entries?: CacheEntry[];
      };
      const now = Date.now();
      for (const entry of raw.entries ?? []) {
        if (entry && entry.key && entry.expiresAt > now) {
          this.map.set(entry.key, entry);
        }
      }
    } catch {
      // Ignore corrupt cache file
    }
  }

  private saveToDisk() {
    try {
      const dir = path.dirname(CACHE_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const entries = Array.from(this.map.values()).slice(-MAX_ENTRIES);
      fs.writeFileSync(CACHE_FILE, JSON.stringify({ entries }, null, 2), 'utf8');
    } catch {
      // Read-only serverless filesystem fallback
    }
  }

  get<T>(action: string, payload: unknown): { value: T; key: string; hits: number } | null {
    const key = fingerprintRequest(action, payload);
    const existing = this.map.get(key);
    const now = Date.now();
    if (!existing) {
      this.totalMisses += 1;
      return null;
    }
    if (existing.expiresAt <= now) {
      this.map.delete(key);
      this.totalMisses += 1;
      return null;
    }
    existing.hits += 1;
    this.totalHits += 1;
    // Refresh LRU order
    this.map.delete(key);
    this.map.set(key, existing);
    return { value: existing.value as T, key, hits: existing.hits };
  }

  set<T>(action: string, payload: unknown, value: T, ttlMs = DEFAULT_TTL_MS): string {
    const key = fingerprintRequest(action, payload);
    const now = Date.now();
    if (this.map.size >= MAX_ENTRIES) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey) this.map.delete(oldestKey);
    }
    this.map.set(key, {
      key,
      action,
      value,
      createdAt: now,
      expiresAt: now + ttlMs,
      hits: 0,
    });
    this.saveToDisk();
    return key;
  }

  stats() {
    return {
      size: this.map.size,
      totalHits: this.totalHits,
      totalMisses: this.totalMisses,
    };
  }
}

export const responseCache = new ResponseCacheStore();
