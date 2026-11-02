/**
 * 계약서 및 약관 사진(이미지)에서 특약사항 문구를 추출하는 Gemini Multimodal Vision OCR 모듈.
 * WIF 기반 Gemini 3.8 Flash / 3.6 Flash 모델을 활용하여 한글 계약서 이미지를 정밀 판독한다.
 */
import { generateText } from 'ai';
import { resolveModel } from './llm.js';
import { CheckError } from './errors.js';

const OCR_PROMPT = `당신은 부동산 계약서 및 시설 이용 약관 전문 OCR 판독 전문가입니다.
제공된 사진에서 '특약사항', '특별약정', 또는 '주요 이용 약관 조항' 텍스트를 정확하게 추출해 주세요.

규칙:
1. 계약서에 적힌 특약사항 문구(예: 1. ..., 2. ...)를 원문 그대로 빠짐없이 옮겨 적어 주세요.
2. 부동산 표시(소재지, 면적)나 불필요한 계약서 양식 문구는 제외하고, 실제 당사자 간의 권리·의무를 정한 특약 및 약관 조항 위주로 추출해 주세요.
3. 인쇄된 텍스트뿐만 아니라 수기(자필)로 추가된 특약도 정확하게 판독해 주세요.
4. 설명이나 서론, 결론 없이 오직 추출된 조항 문장들만 줄바꿈하여 출력해 주세요.`;

export async function extractTextFromImage(imageDataUrl: string): Promise<string> {
  if (!imageDataUrl || typeof imageDataUrl !== 'string') {
    throw new CheckError(400, '이미지 데이터가 올바르지 않아요.');
  }

  // data URL 또는 base64 검증
  const cleanUrl = imageDataUrl.trim();
  if (!cleanUrl.startsWith('data:image/') && !cleanUrl.startsWith('http')) {
    throw new CheckError(400, '지원하는 이미지 형식(data:image/...)이 아니에요.');
  }

  // mimeType 추출 (기본값 image/jpeg)
  const mimeMatch = cleanUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
  const mediaType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

  const tryCall = async (modelId: string, timeoutMs: number) => {
    const { model } = await resolveModel(process.env, modelId);
    return generateText({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: OCR_PROMPT },
            { type: 'file', data: cleanUrl, mediaType },
          ],
        },
      ],
      temperature: 0.1,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(timeoutMs),
    });
  };

  const models = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.1-flash-lite', 'gemini-flash-lite-latest'];
  let res;
  for (const m of models) {
    try {
      res = await tryCall(m, m.includes('lite') ? 12_000 : 4_000);
      if (res?.text?.trim()) break;
    } catch (err) {
      console.warn(`[OCR] ${m} delayed/failed, trying next fallback:`, (err as Error)?.message);
    }
  }

  if (!res?.text?.trim()) {
    throw new CheckError(502, '사진을 분석하는 중 일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.');
  }

  const text = res.text.trim();
  if (text.length < 5) {
    throw new CheckError(422, '사진에서 계약서 특약 조항 문구를 식별하지 못했어요. 조항 부분이 잘 보이도록 다시 찍어 주세요.');
  }
  return text;
}
