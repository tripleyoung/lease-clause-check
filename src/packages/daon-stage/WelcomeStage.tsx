import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Mascot, type Mood } from '../../components/Mascot';
import { mountGoogleSignIn } from '../../googleIdentity';
import type { DaonAuthClient } from './auth';

export interface WelcomeFeatureItem {
  num: string;
  title: string;
  detail: string;
}

export interface WelcomeStageProps {
  /** @daon/stage-ui/auth 의 createAuthClient() 인스턴스 */
  auth: DaonAuthClient;
  /** 상단 브랜드 인장(한자 1글자, 예: '溫', '律') */
  brandSeal: string;
  /** 상단 브랜드 타이틀 (예: '온율 · 계약·법률·세무') */
  brandTitle: string;
  /** 왼쪽 캐릭터 배너 배경 이미지 URL (예: '/hero-law.webp', '/hero-night.webp') */
  heroImage?: string;
  /** 왼쪽 캐릭터 기본 표정 */
  mascotMood?: Mood;
  /** 우측 상단 눈썹 문구 */
  eyebrow: string;
  /** 우측 메인 제목 (JSX 허용: <span>하이라이트</span> 포함) */
  headline: ReactNode;
  /** 우측 본문 소개 문구 (JSX 허용: <b>강조</b> 포함) */
  lede: ReactNode;
  /** 一 · 二 · 三 3단 핵심 약속 목록 */
  items: WelcomeFeatureItem[];
  /** 기본 OAuth 계정 로그인 버튼 라벨 (기본값: '계정으로 시작하기') */
  loginButtonLabel?: string;
  /** 빠른 체험/개발 로그인 버튼 라벨 (제공 시 하단 점선 버튼 렌더링) */
  devLoginLabel?: string;
  /** 하단 작은 안내 문구 */
  finePrint?: ReactNode;
  /** 로그인 성공 시 호출되는 콜백 */
  onSignedIn: () => void;
  /** 초기 인증 오류 메시지 */
  initialNotice?: string | null;
}

export function SharedGoogleSignIn({
  auth,
  locale = 'ko',
  onSuccess,
  onError,
}: {
  auth: DaonAuthClient;
  locale?: string;
  onSuccess: () => void;
  onError: () => void;
}) {
  const parent = useRef<HTMLDivElement>(null);
  const handlers = useRef({ onSuccess, onError });
  handlers.current = { onSuccess, onError };
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!parent.current) return;
    let active = true;
    let pending = false;
    const revision = auth.authRevision();
    const dispose = mountGoogleSignIn(
      parent.current,
      locale,
      (credential, nonce, isCurrent) => {
        if (pending) return;
        pending = true;
        setBusy(true);
        void auth
          .finishGoogleLogin(credential, nonce, revision, () => active && isCurrent())
          .then((signedIn) => {
            if (signedIn && active) handlers.current.onSuccess();
          })
          .catch(() => {
            if (active) handlers.current.onError();
          })
          .finally(() => {
            pending = false;
            if (active) setBusy(false);
          });
      },
      () => handlers.current.onError(),
    );
    return () => {
      active = false;
      dispose();
    };
  }, [auth, locale]);

  return (
    <div
      ref={parent}
      aria-busy={busy}
      style={{
        display: 'flex',
        justifyContent: 'center',
        minHeight: 44,
        pointerEvents: busy ? 'none' : undefined,
      }}
    />
  );
}

/**
 * 다온 사주(apps/saju-ai)와 온율 계약·법률·세무(lease-clause-check)가 공통으로 사용하는
 * 첫 화면(2단 히어로 캐릭터 배너 + Google/OAuth2 PKCE 로그인 스테이지) 컴포넌트.
 */
export function WelcomeStage({
  auth,
  brandSeal,
  brandTitle,
  heroImage = '/hero-law.webp',
  mascotMood = 'calm',
  eyebrow,
  headline,
  lede,
  items,
  loginButtonLabel = '계정으로 시작하기',
  devLoginLabel,
  finePrint,
  onSignedIn,
  initialNotice = null,
}: WelcomeStageProps) {
  const [notice, setNotice] = useState<string | null>(initialNotice);

  return (
    <div className="app app--welcome">
      <header className="topbar">
        <span className="brand">
          <span className="brand__seal" aria-hidden="true">
            {brandSeal}
          </span>
          <span>{brandTitle}</span>
        </span>
      </header>
      <section className="welcome">
        <div
          className="welcome__band"
          style={
            heroImage
              ? {
                  backgroundImage: `url('${heroImage}')`,
                }
              : undefined
          }
        >
          <Mascot mood={mascotMood} />
        </div>
        <div className="welcome__body">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{headline}</h1>
          <p className="welcome__lede">{lede}</p>
          <ol className="welcome__list">
            {items.map((item) => (
              <li key={item.num}>
                <span className="welcome__num">{item.num}</span>
                <span>
                  <b>{item.title}</b>
                  <span>{item.detail}</span>
                </span>
              </li>
            ))}
          </ol>
          {notice && <p className="welcome__notice">{notice}</p>}
          <SharedGoogleSignIn
            auth={auth}
            onSuccess={() => {
              setNotice(null);
              onSignedIn();
            }}
            onError={() =>
              setNotice('Google 로그인 중 문제가 생겼어요. 다시 시도해 주세요.')
            }
          />
          <button
            type="button"
            className="welcome__primary-btn"
            onClick={() => {
              setNotice(null);
              void auth.startLogin();
            }}
          >
            {loginButtonLabel}
          </button>
          {devLoginLabel && (
            <button
              type="button"
              className="welcome__dev"
              onClick={() => {
                auth.devLogin();
                onSignedIn();
              }}
            >
              {devLoginLabel}
            </button>
          )}
          {finePrint && <p className="welcome__fine">{finePrint}</p>}
        </div>
      </section>
    </div>
  );
}
