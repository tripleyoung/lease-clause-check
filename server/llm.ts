/**
 * AI 제공사는 LLM_PROVIDER(gemini | openai) 하나로 고른다. 키와 모델은 서버 환경 변수에만 둔다.
 * (D10 면접 코치 llm.py 와 같은 규칙: 한 번 25초, 재시도 1번 — Vercel 함수 60초 안)
 */
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import { CheckError } from './errors.ts';

export const CALL_TIMEOUT_MS = 25_000;
export const MAX_RETRIES = 1;

const PROVIDERS = {
  gemini: { keyEnv: 'GEMINI_API_KEY', modelEnv: 'GEMINI_MODEL', defaultModel: 'gemini-3.5-flash-lite' },
  openai: { keyEnv: 'OPENAI_API_KEY', modelEnv: 'OPENAI_MODEL', defaultModel: 'gpt-6-luna' },
} as const;

export function getModel(env: Record<string, string | undefined> = process.env): { model: LanguageModel; name: string } {
  const provider = (env.LLM_PROVIDER ?? 'gemini').trim().toLowerCase();
  if (provider !== 'gemini' && provider !== 'openai') {
    throw new CheckError(500, `LLM_PROVIDER 값 '${provider}'을 모르겠어요. gemini 또는 openai 로 정해 주세요.`);
  }
  const p = PROVIDERS[provider];
  const key = env[p.keyEnv]?.trim();
  if (!key) throw new CheckError(503, `서버에 ${p.keyEnv}가 설정되지 않았어요. 배포 설정의 환경 변수를 확인해 주세요.`);
  const modelId = env[p.modelEnv]?.trim() || p.defaultModel;
  const model = provider === 'gemini' ? createGoogleGenerativeAI({ apiKey: key })(modelId) : createOpenAI({ apiKey: key })(modelId);
  return { model, name: `${provider}:${modelId}` };
}
