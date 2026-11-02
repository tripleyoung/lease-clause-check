import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export interface OnyulProfile {
  id: string;
  name: string;
  topic: 'lease' | 'gym' | 'tax';
  filerType: 'wage_earner' | 'freelancer' | 'individual_biz';
  memo: string;
  isDefault?: boolean;
}

export interface SerializedTurnRecord {
  id: string;
  question: string;
  speech: string;
  mood: 'calm' | 'thinking' | 'joy' | 'worry' | 'surprise' | 'mystic';
  mode: 'check' | 'consult' | 'tax';
  maskedSummary?: string;
  followups: string[];
  cached?: boolean;
  // Payload snapshots to reconstruct VisualDeck cards when reopening history
  checkPayload?: {
    result: unknown;
    lawData: unknown;
    sampleDocId?: string;
    uploadedImageUrl?: string;
  };
  consultPayload?: {
    result: unknown;
  };
  taxPayload?: {
    result: unknown;
  };
}

export interface SavedConversation {
  id: string;
  profileId: string;
  profileName: string;
  topic: 'lease' | 'gym' | 'tax';
  title: string;
  updatedAt: string;
  turns: SerializedTurnRecord[];
}

export interface UserAccountInfo {
  userId: string;
  name: string;
  email?: string;
  provider: 'ugot' | 'google' | 'quick';
}

interface UserDataBucket {
  account: UserAccountInfo;
  profiles: OnyulProfile[];
  conversations: SavedConversation[];
}

const STORE_FILE = path.join(process.cwd(), '.data', 'user-store.json');
const USERINFO_URL = 'https://auth.ugot.uk/userinfo';
const TOKEN_URL = 'https://auth.ugot.uk/oauth2/token';

const DEFAULT_PROFILES: OnyulProfile[] = [
  {
    id: 'prof-lease-default',
    name: '주택 전월세·특약',
    topic: 'lease',
    filerType: 'wage_earner',
    memo: '전월세 보증금·수선비·근저당·인상률 특약 맞춤 점검',
    isDefault: true,
  },
  {
    id: 'prof-gym-default',
    name: '헬스장·PT 환불',
    topic: 'gym',
    filerType: 'wage_earner',
    memo: '피트니스·PT 중도해지 위약금 10% 상한 및 잔여환불 계산',
  },
  {
    id: 'prof-tax-default',
    name: '월세·영수증 세무',
    topic: 'tax',
    filerType: 'wage_earner',
    memo: '무주택 직장인 월세 세액공제 · 프리랜서·사업자 경비 판정',
  },
];

class UserStore {
  private users = new Map<string, UserDataBucket>();
  private tokenCache = new Map<string, { account: UserAccountInfo; until: number }>();

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (!fs.existsSync(STORE_FILE)) return;
      const raw = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8')) as Record<string, UserDataBucket>;
      for (const [k, v] of Object.entries(raw)) {
        if (v && v.account) {
          this.users.set(k, v);
        }
      }
    } catch {
      // Ignore corrupt file
    }
  }

  private saveToDisk() {
    try {
      const dir = path.dirname(STORE_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const obj = Object.fromEntries(this.users.entries());
      fs.writeFileSync(STORE_FILE, JSON.stringify(obj, null, 2), 'utf8');
    } catch {
      // Ignore read-only serverless fs
    }
  }

  async resolveUserFromAuthHeader(authHeader?: string): Promise<UserAccountInfo> {
    const raw = (authHeader ?? '').trim();
    const token = raw.toLowerCase().startsWith('bearer ') ? raw.slice(7).trim() : raw;
    if (!token) {
      return {
        userId: 'guest-default',
        name: '비로그인 방문자',
        provider: 'quick',
      };
    }

    // Quick personalized login format: "quick:<userId>:<encodedName>:<encodedEmail>"
    if (token.startsWith('quick:')) {
      const parts = token.split(':');
      const userId = parts[1] || 'quick-user';
      const name = decodeURIComponent(parts[2] || '온율 회원');
      const email = parts[3] ? decodeURIComponent(parts[3]) : undefined;
      return {
        userId: `quick-${userId}`,
        name,
        email,
        provider: 'quick',
      };
    }

    const hashKey = createHash('sha256').update(token).digest('hex').slice(0, 24);
    const cached = this.tokenCache.get(hashKey);
    if (cached && cached.until > Date.now()) {
      return cached.account;
    }

    try {
      const res = await fetch(USERINFO_URL, {
        headers: { authorization: `Bearer ${token}` },
        redirect: 'manual',
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const info = (await res.json()) as Record<string, unknown>;
        const sub = String(info.sub ?? info.email ?? hashKey);
        const name = String(info.name ?? info.preferred_username ?? '온율 회원');
        const email = typeof info.email === 'string' ? info.email : undefined;
        const account: UserAccountInfo = {
          userId: `ugot-${sub}`,
          name,
          email,
          provider: 'ugot',
        };
        this.tokenCache.set(hashKey, { account, until: Date.now() + 5 * 60_000 });
        return account;
      }
    } catch {
      // Fallback to deterministic token hash
    }

    return {
      userId: `token-${hashKey}`,
      name: '온율 회원',
      provider: 'quick',
    };
  }

  private ensureBucket(account: UserAccountInfo): UserDataBucket {
    let bucket = this.users.get(account.userId);
    if (!bucket) {
      bucket = {
        account,
        profiles: DEFAULT_PROFILES.map((p) => ({ ...p })),
        conversations: [],
      };
      this.users.set(account.userId, bucket);
      this.saveToDisk();
    } else {
      bucket.account = account;
    }
    return bucket;
  }

  getProfiles(account: UserAccountInfo): OnyulProfile[] {
    return this.ensureBucket(account).profiles;
  }

  saveProfile(
    account: UserAccountInfo,
    profile: Omit<OnyulProfile, 'id'> & { id?: string },
  ): { profiles: OnyulProfile[]; saved: OnyulProfile } {
    const bucket = this.ensureBucket(account);
    const id = profile.id?.trim() || `prof-${Date.now()}`;
    const nextProfile: OnyulProfile = {
      id,
      name: profile.name.trim().slice(0, 24) || '맞춤 프로필',
      topic: profile.topic,
      filerType: profile.filerType || 'wage_earner',
      memo: (profile.memo ?? '').trim().slice(0, 80),
      isDefault: profile.isDefault,
    };
    const idx = bucket.profiles.findIndex((p) => p.id === id);
    if (idx >= 0) {
      bucket.profiles[idx] = nextProfile;
    } else {
      bucket.profiles.push(nextProfile);
    }
    this.saveToDisk();
    return { profiles: bucket.profiles, saved: nextProfile };
  }

  deleteProfile(account: UserAccountInfo, profileId: string): OnyulProfile[] {
    const bucket = this.ensureBucket(account);
    if (bucket.profiles.length <= 1) return bucket.profiles;
    bucket.profiles = bucket.profiles.filter((p) => p.id !== profileId);
    this.saveToDisk();
    return bucket.profiles;
  }

  listConversations(account: UserAccountInfo): Array<Omit<SavedConversation, 'turns'> & { turnCount: number }> {
    const bucket = this.ensureBucket(account);
    return bucket.conversations
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(({ turns, ...rest }) => ({
        ...rest,
        turnCount: turns.length,
      }));
  }

  getConversation(account: UserAccountInfo, convId: string): SavedConversation | null {
    const bucket = this.ensureBucket(account);
    return bucket.conversations.find((c) => c.id === convId) ?? null;
  }

  saveConversation(account: UserAccountInfo, conv: SavedConversation): SavedConversation {
    const bucket = this.ensureBucket(account);
    const normalized: SavedConversation = {
      id: conv.id || `conv-${Date.now()}`,
      profileId: conv.profileId || 'prof-lease-default',
      profileName: conv.profileName || '주택 전월세·특약',
      topic: conv.topic || 'lease',
      title: (conv.title || '계약·법률 상담 내역').slice(0, 80),
      updatedAt: new Date().toISOString(),
      turns: Array.isArray(conv.turns) ? conv.turns.slice(-20) : [],
    };
    const idx = bucket.conversations.findIndex((c) => c.id === normalized.id);
    if (idx >= 0) {
      bucket.conversations[idx] = normalized;
    } else {
      bucket.conversations.unshift(normalized);
      if (bucket.conversations.length > 50) {
        bucket.conversations = bucket.conversations.slice(0, 50);
      }
    }
    this.saveToDisk();
    return normalized;
  }

  deleteConversation(account: UserAccountInfo, convId: string): boolean {
    const bucket = this.ensureBucket(account);
    const before = bucket.conversations.length;
    bucket.conversations = bucket.conversations.filter((c) => c.id !== convId);
    this.saveToDisk();
    return bucket.conversations.length < before;
  }

  async exchangeOAuthToken(formParams: Record<string, string>): Promise<{ status: number; body: unknown }> {
    try {
      const form = new URLSearchParams(formParams);
      const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: form,
        redirect: 'manual',
        signal: AbortSignal.timeout(15_000),
      });
      const text = await res.text();
      return { status: res.status, body: JSON.parse(text) };
    } catch {
      return { status: 502, body: { error: 'auth_unavailable' } };
    }
  }
}

export const userStore = new UserStore();
