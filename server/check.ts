/**
 * 점검 한 번: 입력 검사 → 개인정보 가림 → (v2) 규칙 검사 → AI 판정 → 결과 보정.
 * 엔진은 계약 종류를 모른다. 팩이 없으면 참고용(referenceOnly)으로 v0만 돌린다.
 */
import { generateText, Output, type LanguageModel } from 'ai';
import { z } from 'zod';
import { VERDICTS, type CheckResult, type ItemResult, type Pack, type Verdict, type Version } from '../shared/types.js';
import { CheckError } from './errors.js';
import { CALL_TIMEOUT_MS, MAX_RETRIES, getModel, resolveModel } from './llm.js';
import { getPack } from './packs.js';
import { maskPii } from './pii.js';
import { promptV0, promptV1, promptV2 } from './prompts.js';
import { ruleScan } from './rules.js';
import { validateInput } from './validate.js';

export type CheckInput = { text: string; pack: string; version?: Version };

const schemaFor = (pack: Pack) =>
  z.object({
    items: z.array(
      z.object({
        itemId: z.enum(pack.items.map((i) => i.id) as [string, ...string[]]),
        verdict: z.enum(VERDICTS as unknown as [Verdict, ...Verdict[]]),
        quote: z.string(),
      }),
    ),
  });

const norm = (s: string) => s.replace(/\s+/g, '');

/** AI 출력을 팩 항목 순서대로 맞추고, 빠진 항목은 '언급 없음'+autoFailed 로 채운다. v2는 원문에 없는 인용을 걷어 낸다. */
export function repair(pack: Pack, version: Version, maskedText: string, raw: { itemId: string; verdict: Verdict; quote: string }[] | null): ItemResult[] {
  const byId = new Map((raw ?? []).map((r) => [r.itemId, r]));
  return pack.items.map((item) => {
    const got = byId.get(item.id);
    const base = {
      itemId: item.id,
      title: item.title,
      knowledge: item.knowledge,
      question: item.question,
      fixText: item.fixText,
      riskReason: item.riskReason,
      riskConsequence: item.riskConsequence,
    };
    if (!got) return { ...base, verdict: '언급 없음', quote: '', autoFailed: true };
    if (version === 'v2' && got.verdict !== '언급 없음' && (!got.quote.trim() || !norm(maskedText).includes(norm(got.quote)))) {
      return { ...base, verdict: '언급 없음', quote: '', autoFailed: true };
    }
    return { ...base, verdict: got.verdict, quote: got.verdict === '언급 없음' ? '' : got.quote, autoFailed: false };
  });
}

export async function check(input: CheckInput, deps: { model?: LanguageModel } = {}): Promise<CheckResult> {
  const valid = validateInput(input.text ?? '');
  if (!valid.ok) throw new CheckError(400, valid.message);
  const masked = maskPii(input.text).masked;
  const pack = getPack(input.pack);
  const model = deps.model ?? (await resolveModel()).model;
  const started = Date.now();
  const common = { model, temperature: 0, maxRetries: MAX_RETRIES, abortSignal: AbortSignal.timeout(CALL_TIMEOUT_MS) };

  if (!pack) {
    const res = await call(() =>
      generateText({ ...common, system: '다음 계약·약관 문구에서 나에게 불리할 수 있는 조항을 쉬운 말로 짚어 줘. 법률 판단을 단정하지 마.', prompt: masked }),
    );
    return { pack: input.pack, version: 'v0', items: [], elapsedMs: Date.now() - started, referenceOnly: true, note: res.text };
  }

  const version: Version = input.version ?? 'v2';
  const p = version === 'v0' ? promptV0(pack, masked) : version === 'v1' ? promptV1(pack, masked) : promptV2(pack, masked, ruleScan(masked, pack));
  let raw: { itemId: string; verdict: Verdict; quote: string }[] | null = null;
  try {
    const res = await call(() => generateText({ ...common, ...p, output: Output.object({ schema: schemaFor(pack) }) }));
    raw = res.output.items;
  } catch (e) {
    if (!deps.model) {
      try {
        const fallback = await resolveModel(process.env, 'gemini-3.6-flash');
        const res = await call(() => generateText({ ...common, model: fallback.model, ...p, output: Output.object({ schema: schemaFor(pack) }) }));
        raw = res.output.items;
      } catch (e2) {
        if (e2 instanceof CheckError) throw e2;
        raw = null;
      }
    } else {
      if (e instanceof CheckError) throw e;
      raw = null;
    }
  }
  return { pack: pack.id, version, items: repair(pack, version, masked, raw), elapsedMs: Date.now() - started, referenceOnly: false };
}

/** 제공사 오류를 화면용 문장으로 바꾼다. 모양 오류(스키마)는 그대로 던져 위에서 autoFailed 처리. */
async function call<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    const name = (e as Error)?.name ?? '';
    const msg = String((e as Error)?.message ?? '');
    if (/NoObjectGenerated|NoOutputGenerated/i.test(name)) throw e;
    if (name === 'TimeoutError' || name === 'AbortError' || /timeout|aborted/i.test(msg)) {
      throw new CheckError(504, 'AI 응답이 늦어요. 잠시 뒤 다시 눌러 주세요. 입력한 문구는 그대로 있어요.');
    }
    if (/API key|api_key|401|403|PERMISSION|invalid.*key/i.test(msg)) {
      throw new CheckError(503, 'AI 서비스 키가 맞지 않아요. 배포 설정의 API 키를 확인해 주세요.');
    }
    // 모양 오류를 먼저 본다: 이 오류 문장에는 'generated'가 들어 있어 아래 사용량 검사와 헷갈린다
    if (/NoObjectGenerated|NoOutputGenerated|parse|schema|JSON/i.test(name + msg)) throw e;
    if (/\b429\b|quota|rate.?limit|RESOURCE_EXHAUSTED/i.test(msg)) throw new CheckError(503, 'AI 사용량이 잠시 몰렸어요. 1분 뒤 다시 눌러 주세요.');
    throw new CheckError(502, 'AI 서비스에 연결하지 못했어요. 잠시 뒤 다시 눌러 주세요.');
  }
}
