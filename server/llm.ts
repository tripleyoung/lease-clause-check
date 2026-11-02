/**
 * AI 제공사는 LLM_PROVIDER(gemini | openai) 하나로 고른다. 키와 모델은 서버 환경 변수에만 둔다.
 * (D10 면접 코치 llm.py 와 같은 규칙: 한 번 25초, 재시도 1번 — Vercel 함수 60초 안)
 *
 * Gemini 키가 환경 변수에 없을 경우, Google Cloud Workload Identity Federation (WIF)을 통해
 * auth.ugot.uk -> GCP STS -> IAM Service Account Impersonation -> API Key Resource 로 동적 획득한다.
 */
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import { CheckError } from './errors.js';
import { getGeminiWifApiKey } from './wif.js';

export const CALL_TIMEOUT_MS = 25_000;
export const MAX_RETRIES = 1;

const PROVIDERS = {
  gemini: { keyEnv: 'GEMINI_API_KEY', modelEnv: 'GEMINI_MODEL', defaultModel: 'gemini-3.8-flash' },
  openai: { keyEnv: 'OPENAI_API_KEY', modelEnv: 'OPENAI_MODEL', defaultModel: 'gpt-4o-mini' },
} as const;

export function getModel(
  env: Record<string, string | undefined> = process.env,
  overrideKey?: string,
): { model: LanguageModel; name: string } {
  const provider = (env.LLM_PROVIDER ?? 'gemini').trim().toLowerCase();
  if (provider !== 'gemini' && provider !== 'openai') {
    throw new CheckError(500, `LLM_PROVIDER 값 '${provider}'을 모르겠어요. gemini 또는 openai 로 정해 주세요.`);
  }
  const p = PROVIDERS[provider];
  const key = overrideKey?.trim() || env[p.keyEnv]?.trim();
  if (!key) {
    throw new CheckError(503, `서버에 ${p.keyEnv}가 설정되지 않았어요. 배포 설정의 환경 변수를 확인해 주세요.`);
  }
  const modelId = env[p.modelEnv]?.trim() || p.defaultModel;
  const model = provider === 'gemini' ? createGoogleGenerativeAI({ apiKey: key })(modelId) : createOpenAI({ apiKey: key })(modelId);
  return { model, name: `${provider}:${modelId}` };
}

export async function resolveModel(
  env: Record<string, string | undefined> = process.env,
): Promise<{ model: LanguageModel; name: string }> {
  const provider = (env.LLM_PROVIDER ?? 'gemini').trim().toLowerCase();
  if (provider === 'gemini') {
    const explicitKey = env.GEMINI_API_KEY?.trim();
    if (explicitKey) {
      return getModel(env, explicitKey);
    }
    // WIF 발급 시도
    if (env.ANTHROPIC_WIF_CLIENT_SECRET) {
      try {
        const dynamicKey = await getGeminiWifApiKey();
        if (dynamicKey) {
          return getModel(env, dynamicKey);
        }
      } catch (err) {
        console.error('[WIF] Dynamic Gemini API key acquisition failed:', err);
      }
    }
  }
  // 기본 폴백 (키 부재 시 503 에러 발생)
  return getModel(env);
}
