/**
 * AI 제공사는 LLM_PROVIDER(gemini | openai) 하나로 고른다. 키와 모델은 서버 환경 변수에만 둔다.
 * Gemini 3.8 Flash 를 1순위로 시도하고, 지연/장애 시 Gemini 3.6 Flash 로 자동 폴백한다.
 * (다온 사주 apps/saju-ai/server/claude-cli.ts 와 동일한 Fallback Pool 구조)
 */
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import { CheckError } from './errors.js';
import { getGeminiWifApiKey } from './wif.js';

export const CALL_TIMEOUT_MS = 25_000;
export const MAX_RETRIES = 1;

export const GEMINI_FALLBACK_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-flash-latest',
] as const;

const PROVIDERS = {
  gemini: { keyEnv: 'GEMINI_API_KEY', modelEnv: 'GEMINI_MODEL', defaultModel: 'gemini-3.8-flash' },
  openai: { keyEnv: 'OPENAI_API_KEY', modelEnv: 'OPENAI_MODEL', defaultModel: 'gpt-4o-mini' },
} as const;

export function getModel(
  env: Record<string, string | undefined> = process.env,
  overrideKey?: string,
  overrideModelId?: string,
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
  const modelId = overrideModelId?.trim() || env[p.modelEnv]?.trim() || p.defaultModel;
  const model = provider === 'gemini' ? createGoogleGenerativeAI({ apiKey: key })(modelId) : createOpenAI({ apiKey: key })(modelId);
  return { model, name: `${provider}:${modelId}` };
}

export async function resolveModel(
  env: Record<string, string | undefined> = process.env,
  overrideModelId?: string,
): Promise<{ model: LanguageModel; name: string }> {
  const provider = (env.LLM_PROVIDER ?? 'gemini').trim().toLowerCase();
  if (provider === 'gemini') {
    const explicitKey = env.GEMINI_API_KEY?.trim();
    if (explicitKey) {
      return getModel(env, explicitKey, overrideModelId);
    }
    // WIF 발급 시도
    if (env.ANTHROPIC_WIF_CLIENT_SECRET) {
      try {
        const dynamicKey = await getGeminiWifApiKey();
        if (dynamicKey) {
          const configuredModel = overrideModelId?.trim() || env.GEMINI_MODEL?.trim();
          return getModel(env, dynamicKey, configuredModel || 'gemini-3.8-flash');
        }
      } catch (err) {
        console.error('[WIF] Dynamic Gemini API key acquisition failed:', err);
      }
    }
  }
  return getModel(env, undefined, overrideModelId);
}
