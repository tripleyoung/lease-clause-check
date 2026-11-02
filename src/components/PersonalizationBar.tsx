import { useState, type FormEvent } from 'react';
import { IconClose, IconHistory } from '@montage-ui/icon';

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

export interface SavedConversationSummary {
  id: string;
  profileId: string;
  profileName: string;
  topic: 'lease' | 'gym' | 'tax';
  title: string;
  updatedAt: string;
  turnCount: number;
}

export interface SavedConversationFull extends Omit<SavedConversationSummary, 'turnCount'> {
  turns: SerializedTurnRecord[];
}

export interface OnyulSession {
  token: string;
  userId: string;
  name: string;
  email?: string;
  provider: 'ugot' | 'quick';
}

const SESSION_KEY = 'onyul.session.v1';
const LOCAL_CONVS_KEY = 'onyul.conversations.v1';
const LOCAL_PROFILES_KEY = 'onyul.profiles.v1';
const CLIENT_CACHE_KEY = 'onyul.response-cache.v1';
const PKCE_KEY = 'onyul.oauth.pkce';
const AUTH_BASE = 'https://auth.ugot.uk';
const CLIENT_ID = import.meta.env.VITE_OAUTH_CLIENT_ID ?? 'saju-ai';

export const DEFAULT_LOCAL_PROFILES: OnyulProfile[] = [
  {
    id: 'prof-lease-default',
    name: '주택 전월세·특약',
    topic: 'lease',
    filerType: 'wage_earner',
    memo: '무주택 임차인 · 보증금 및 수선비·인상률 특약 점검',
    isDefault: true,
  },
  {
    id: 'prof-gym-default',
    name: '헬스장·PT 환불',
    topic: 'gym',
    filerType: 'wage_earner',
    memo: '피트니스·PT 중도해지 위약금 10% 상한 점검',
  },
  {
    id: 'prof-tax-default',
    name: '월세·영수증 세무',
    topic: 'tax',
    filerType: 'wage_earner',
    memo: '무주택 직장인 월세 세액공제 · 프리랜서·사업자 경비 판정',
  },
];

// ============================================================================
// 1. 클라이언트 + 세션 스토리지 응답 캐시 (0ms 즉시 복원)
// ============================================================================
const memoryCache = new Map<string, unknown>();
let clientCacheHits = 0;

function makeCacheKey(body: Record<string, unknown>): string {
  const { bypassCache: _, ...rest } = body;
  const sorted = Object.keys(rest)
    .sort()
    .reduce<Record<string, unknown>>((acc, k) => {
      acc[k] = rest[k];
      return acc;
    }, {});
  return JSON.stringify(sorted);
}

function readSessionCache(): Record<string, unknown> {
  try {
    const raw = sessionStorage.getItem(CLIENT_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function writeSessionCache(key: string, val: unknown) {
  try {
    const current = readSessionCache();
    current[key] = val;
    const keys = Object.keys(current);
    if (keys.length > 60) {
      delete current[keys[0]];
    }
    sessionStorage.setItem(CLIENT_CACHE_KEY, JSON.stringify(current));
  } catch {
    // ignore storage quota errors
  }
}

export async function cachedCheckPost<T>(
  body: Record<string, unknown>,
  token?: string | null,
): Promise<{ data: T; cached: boolean }> {
  const cacheableActions = new Set(['check', 'consult', 'tax', 'law']);
  const action = String(body.action ?? '');
  const canCache = cacheableActions.has(action) && !body.bypassCache;
  const key = canCache ? makeCacheKey(body) : '';

  if (canCache) {
    if (memoryCache.has(key)) {
      clientCacheHits += 1;
      return { data: memoryCache.get(key) as T, cached: true };
    }
    const sessionStore = readSessionCache();
    if (key in sessionStore) {
      clientCacheHits += 1;
      const val = sessionStore[key] as T;
      memoryCache.set(key, val);
      return { data: val, cached: true };
    }
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch('/api/check', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as T & { cached?: boolean };
  const serverHit = res.headers.get('x-onyul-cache') === 'HIT' || Boolean(data?.cached);

  if (res.ok && canCache) {
    memoryCache.set(key, data);
    writeSessionCache(key, data);
  }
  return { data, cached: serverHit };
}

export function getClientCacheInfo() {
  return {
    entries: memoryCache.size || Object.keys(readSessionCache()).length,
    hits: clientCacheHits,
  };
}

// ============================================================================
// 2. 세션 및 로컬 백업 저장소 (로그인 전/후 모두 이전 대화·맞춤 프로필 유지)
// ============================================================================
export function readSavedSession(): OnyulSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OnyulSession;
  } catch {
    return null;
  }
}

export function writeSavedSession(session: OnyulSession | null) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

export function createQuickSession(name: string, email?: string): OnyulSession {
  const cleanName = name.trim() || '온율 회원';
  const cleanEmail = email?.trim() || undefined;
  const idSeed = (cleanEmail || cleanName).replace(/[^a-zA-Z0-9가-힣_-]/g, '').slice(0, 20) || 'member';
  const token = `quick:${idSeed}:${encodeURIComponent(cleanName)}:${encodeURIComponent(cleanEmail ?? '')}`;
  const session: OnyulSession = {
    token,
    userId: `quick-${idSeed}`,
    name: cleanName,
    email: cleanEmail,
    provider: 'quick',
  };
  writeSavedSession(session);
  return session;
}

export async function startUgotOAuthLogin() {
  const b64url = (bytes: ArrayBuffer | Uint8Array) =>
    btoa(String.fromCharCode(...new Uint8Array(bytes)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  const state = b64url(crypto.getRandomValues(new Uint8Array(16)));
  const redirectUri = `${window.location.origin}/auth/callback`;
  sessionStorage.setItem(PKCE_KEY, JSON.stringify({ verifier, state, redirectUri }));

  const url = new URL(`${AUTH_BASE}/oauth2/authorize`);
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'openid profile email offline_access',
    ui_locales: 'ko',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  }).toString();
  window.location.assign(url.toString());
}

export function readLocalProfiles(): OnyulProfile[] {
  try {
    const raw = localStorage.getItem(LOCAL_PROFILES_KEY);
    if (!raw) return DEFAULT_LOCAL_PROFILES;
    const parsed = JSON.parse(raw) as OnyulProfile[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_LOCAL_PROFILES;
  } catch {
    return DEFAULT_LOCAL_PROFILES;
  }
}

export function writeLocalProfiles(profiles: OnyulProfile[]) {
  try {
    localStorage.setItem(LOCAL_PROFILES_KEY, JSON.stringify(profiles));
  } catch {
    // ignore
  }
}

export function readLocalConversations(): SavedConversationFull[] {
  try {
    const raw = localStorage.getItem(LOCAL_CONVS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedConversationFull[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeLocalConversations(convs: SavedConversationFull[]) {
  try {
    localStorage.setItem(LOCAL_CONVS_KEY, JSON.stringify(convs.slice(0, 40)));
  } catch {
    // ignore
  }
}

export function whenLabel(iso: string | null, now = Date.now()): string {
  if (!iso) return '방금';
  const timestamp = new Date(iso).getTime();
  if (!Number.isFinite(timestamp)) return '방금';
  const diff = now - timestamp;
  if (diff < 60_000) return '방금';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}분 전`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}시간 전`;
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(new Date(timestamp));
}

// ============================================================================
// 3. 지난 대화 서랍 (HistoryDrawer — 다온 사주와 동일한 왼쪽 슬라이드 드로어)
// ============================================================================
export function HistoryDrawer({
  open,
  currentConvId,
  conversations,
  onClose,
  onSelectConversation,
  onDeleteConversation,
  onStartNewConversation,
}: {
  open: boolean;
  currentConvId: string | null;
  conversations: SavedConversationFull[];
  onClose: () => void;
  onSelectConversation: (conv: SavedConversationFull) => void;
  onDeleteConversation: (convId: string) => void;
  onStartNewConversation: () => void;
}) {
  if (!open) return null;

  return (
    <div className="history" role="presentation" data-testid="history-drawer">
      <div className="history__dim" onClick={onClose} aria-hidden="true" />
      <aside className="history__panel" role="dialog" aria-modal="true" aria-label="지난 대화 보관함">
        <header className="history__head">
          <div>
            <h2>지난 대화 보관함</h2>
            <p className="history__sub">점검했던 계약서·법령·세무 대화를 언제든 다시 펼쳐보세요</p>
          </div>
          <button type="button" className="history__close" onClick={onClose} aria-label="닫기">
            <IconClose aria-hidden="true" />
          </button>
        </header>

        <div className="history__new-bar">
          <button
            type="button"
            className="pill-btn pill-btn--primary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => {
              onStartNewConversation();
              onClose();
            }}
          >
            + 새 계약·법률·세무 대화 시작하기
          </button>
        </div>

        {conversations.length === 0 ? (
          <div className="history__empty">
            <p className="history__note">아직 저장된 대화가 없어요.</p>
            <span>계약서 점검이나 법률·세무 질문을 나누면 이곳에 자동으로 저장됩니다.</span>
          </div>
        ) : (
          <ul className="history__list">
            {conversations.map((item) => (
              <li key={item.id} className={item.id === currentConvId ? 'is-current' : undefined}>
                <button
                  type="button"
                  className="history__item"
                  onClick={() => {
                    onSelectConversation(item);
                    onClose();
                  }}
                  data-testid={`history-item-${item.id}`}
                >
                  <span className="history__title">{item.title}</span>
                  <span className="history__meta">
                    {item.profileName} · 대화 {item.turns.length}건 · {whenLabel(item.updatedAt)}
                  </span>
                </button>
                <button
                  type="button"
                  className="history__delete"
                  onClick={() => onDeleteConversation(item.id)}
                  aria-label={`${item.title} 삭제`}
                >
                  <IconClose aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}

// ============================================================================
// 4. 개인화 로그인 & 맞춤 프로필 설정 모달 (LoginAndProfileModal)
// ============================================================================
export function LoginAndProfileModal({
  open,
  session,
  activeProfile,
  savedConvCount,
  cacheStats,
  onClose,
  onSignInQuick,
  onSignOut,
  onSaveProfile,
}: {
  open: boolean;
  session: OnyulSession | null;
  activeProfile: OnyulProfile;
  savedConvCount: number;
  cacheStats: { entries: number; hits: number };
  onClose: () => void;
  onSignInQuick: (name: string, email?: string) => void;
  onSignOut: () => void;
  onSaveProfile: (profile: Omit<OnyulProfile, 'id'> & { id?: string }) => void;
}) {
  const [userName, setUserName] = useState(session?.name ?? '');
  const [userEmail, setUserEmail] = useState(session?.email ?? '');
  const [profName, setProfName] = useState(activeProfile.name);
  const [profTopic, setProfTopic] = useState<'lease' | 'gym' | 'tax'>(activeProfile.topic);
  const [profFiler, setProfFiler] = useState<'wage_earner' | 'freelancer' | 'individual_biz'>(
    activeProfile.filerType,
  );
  const [profMemo, setProfMemo] = useState(activeProfile.memo);

  if (!open) return null;

  const handleLoginSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSignInQuick(userName.trim() || '김율 회원', userEmail.trim() || undefined);
  };

  const handleProfileSubmit = (e: FormEvent, createNew: boolean) => {
    e.preventDefault();
    onSaveProfile({
      id: createNew ? undefined : activeProfile.id,
      name: profName.trim() || '내 맞춤 프로필',
      topic: profTopic,
      filerType: profFiler,
      memo: profMemo.trim(),
    });
    onClose();
  };

  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label="개인화 로그인 및 맞춤 프로필 설정" data-testid="personalization-modal">
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__head">
          <div>
            <span className="visual-card__eyebrow">온율 개인화 · 계정 · 캐시 관리</span>
            <h2 className="sheet__title">내 맞춤 법률·세무 프로필 및 로그인</h2>
          </div>
          <button type="button" className="sheet__close" onClick={onClose} aria-label="닫기">
            <IconClose aria-hidden="true" />
          </button>
        </div>

        {/* 섹션 1: 로그인 / 계정 연동 */}
        <div className="sheet__section">
          <div className="sheet__section-head">
            <strong>👤 계정 로그인 · 동기화</strong>
            {session ? (
              <span className="tax-badge tax-badge--eligible">로그인됨 · {session.name}</span>
            ) : (
              <span className="tax-badge tax-badge--partial">비로그인 (브라우저 자동 저장 중)</span>
            )}
          </div>

          {session ? (
            <div className="account-summary-box">
              <div>
                <strong>{session.name} 님</strong>
                <span>
                  {session.email ? `${session.email} · ` : ''}저장된 대화 {savedConvCount}건 · 응답 캐시 {cacheStats.entries}건 (즉시 복원 {cacheStats.hits}회)
                </span>
              </div>
              <button type="button" className="turn__reset" onClick={onSignOut}>
                로그아웃
              </button>
            </div>
          ) : (
            <form className="quick-login-form" onSubmit={handleLoginSubmit}>
              <div className="quick-login-form__inputs">
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="이름 또는 닉네임 (예: 김율)"
                  aria-label="이름 또는 닉네임"
                  data-testid="login-name-input"
                />
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="이메일 (선택)"
                  aria-label="이메일"
                />
              </div>
              <div className="quick-login-form__btns">
                <button
                  type="submit"
                  className="pill-btn pill-btn--primary"
                  data-testid="quick-login-submit"
                >
                  간편 개인화 로그인 시작
                </button>
                <button
                  type="button"
                  className="pill-btn"
                  onClick={() => void startUgotOAuthLogin()}
                >
                  통합 계정(OAuth) 로그인
                </button>
              </div>
            </form>
          )}
        </div>

        {/* 섹션 2: 맞춤 법률·세무 프로필 설정 */}
        <form className="sheet__section" onSubmit={(e) => handleProfileSubmit(e, false)}>
          <div className="sheet__section-head">
            <strong>⚙️ 현재 맞춤 프로필 설정 ({activeProfile.name})</strong>
            <span>세무 판정·특약 점검 시 아래 조건이 자동으로 반영돼요</span>
          </div>

          <label className="field">
            <span>프로필 이름</span>
            <input
              type="text"
              value={profName}
              maxLength={24}
              onChange={(e) => setProfName(e.target.value)}
              placeholder="예: 마포 오피스텔 전월세, 프리랜서 세무"
              data-testid="profile-name-input"
            />
          </label>

          <div className="field">
            <span>주요 상담 분야</span>
            <div className="segmented" role="radiogroup" aria-label="주요 상담 분야">
              {(
                [
                  ['lease', '주택 전월세'],
                  ['gym', '헬스장·PT'],
                  ['tax', '월세·세무'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={profTopic === key ? 'is-on' : ''}
                  onClick={() => setProfTopic(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span>나의 소득·세무 유형 (세액공제·경비 자동 판정 기준)</span>
            <div className="segmented" role="radiogroup" aria-label="나의 소득·세무 유형">
              {(
                [
                  ['wage_earner', '무주택 직장인'],
                  ['freelancer', '프리랜서(3.3%)'],
                  ['individual_biz', '개인사업자'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={profFiler === key ? 'is-on' : ''}
                  onClick={() => setProfFiler(key)}
                  data-testid={`filer-${key}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="field">
            <span>내 계약·급여 메모 (한결이 상담 시 참고해요)</span>
            <input
              type="text"
              value={profMemo}
              maxLength={80}
              onChange={(e) => setProfMemo(e.target.value)}
              placeholder="예: 보증금 5,000만 / 월세 65만 · 총급여 5,800만 원"
              data-testid="profile-memo-input"
            />
          </label>

          <div className="sheet__actions">
            <button
              type="button"
              className="pill-btn"
              onClick={(e) => handleProfileSubmit(e, true)}
              data-testid="profile-add-new-btn"
            >
              + 새 프로필로 추가
            </button>
            <button
              type="submit"
              className="pill-btn pill-btn--primary"
              data-testid="profile-save-btn"
            >
              현재 프로필 저장하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// 5. 상단 우측 지난 대화 & 로그인·맞춤 설정 액션 바 (TopbarActions)
// ============================================================================
export function TopbarActions({
  session,
  convCount,
  cacheHits,
  onOpenHistory,
  onOpenPersonalization,
}: {
  session: OnyulSession | null;
  convCount: number;
  cacheHits: number;
  onOpenHistory: () => void;
  onOpenPersonalization: () => void;
}) {
  return (
    <div className="topbar__actions">
      {cacheHits > 0 && (
        <span className="cache-pill" title="동일한 법령·계약 점검 결과를 캐시에서 0초 만에 불러왔어요">
          ⚡ 캐시 {cacheHits}
        </span>
      )}
      <button
        type="button"
        className="topbar__btn"
        onClick={onOpenHistory}
        aria-label="지난 대화 보관함 열기"
        data-testid="open-history-btn"
      >
        <IconHistory aria-hidden="true" />
        <span>지난 대화</span>
        {convCount > 0 && <em className="topbar__badge">{convCount}</em>}
      </button>
      <button
        type="button"
        className={session ? 'topbar__btn topbar__btn--signed' : 'topbar__btn topbar__btn--login'}
        onClick={onOpenPersonalization}
        aria-label="로그인 및 맞춤 프로필 설정"
        data-testid="open-personalization-btn"
      >
        <span>{session ? `👤 ${session.name}` : '로그인 · 맞춤설정'}</span>
      </button>
    </div>
  );
}
