# 계약서 특약 점검기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 계약·약관 문구를 붙여 넣으면 점검팩(임대차 특약, 헬스장·PT 환불)의 항목마다 보호됨·언급 없음·위험을 근거 인용·물어볼 질문·수정 요구 대안 문구와 함께 보여 주고, v0→v1→v2 개선을 같은 정답 표로 잰 웹 앱을 Vercel에 올린다.

**Architecture:** 다온 사주(`monorepo/apps/saju-ai`)와 같은 구조. React + Vite 화면(`src/`), Vercel 함수 입구(`api/*.ts`)는 한 줄로 `server/*.ts` 처리기에 넘긴다. 점검 엔진은 `server/`에서 입력 검사 → 개인정보 가림 → (v2) 규칙 검사 → AI 판정 → 결과 보정 순으로 돈다. 근거 문서는 다온의 사주 위키처럼 `knowledge/*.md`로 두고, AI는 `knowledge` 도구로 절을 열어 `knowledge/<page>.md#<제목>` 형식으로 인용한다. 개발 서버는 vite 플러그인이 `/api/*`를 같은 처리기로 보낸다.

**Tech Stack:** TypeScript 5.9, React 19, Vite 7, Vercel AI SDK(`ai` + `@ai-sdk/google` · `@ai-sdk/openai`), zod 4, node 내장 테스트(`node --experimental-strip-types --test`), Playwright(화면 확인), Vercel

**Spec:** `docs/superpowers/specs/2026-11-02-design.md`

## Global Constraints

- 판정은 정확히 세 값: `보호됨`, `언급 없음`, `위험`. 팩의 모든 점검 항목이 결과에 한 번씩 나온다.
- 개인정보(주민번호, 전화번호, 계좌번호, 동·호수 상세 주소)는 AI 호출 **전에** 서버에서 가린다.
- `위험`·`보호됨` 판정의 근거는 (1) 원문에서 그대로 인용한 문장과 (2) `knowledge/` 절 인용 두 가지다. 원문 인용이 원문에 없으면 판정을 `언급 없음` + `autoFailed`로 바꾼다.
- `knowledge/*.md`는 실제로 열어 읽은 공개 문서의 발췌만 담고, 각 파일 머리에 출처 URL과 확인 날짜를 적는다.
- 법률 판단을 단정하는 문구를 화면에 쓰지 않는다. 화면 문구는 해요체. 맨 아래 "법률 자문이 아니에요. 계약 전 전문가에게 확인하세요."
- 제공사는 `LLM_PROVIDER`(gemini | openai) 하나로 고르고 키·모델은 서버 환경 변수(`GEMINI_API_KEY`/`GEMINI_MODEL`, `OPENAI_API_KEY`/`OPENAI_MODEL`)에만 둔다. 한 번 호출 25초, 재시도 1번, Vercel 함수 `maxDuration` 60.
- 시험 자료는 직접 만든 문장만. 발표 숫자는 `data/cases_test.jsonl`(20건)로만 내고, 조정은 `data/cases_dev.jsonl`(10건)만 쓴다.

## Review Focus

1. 모델이 스키마에 안 맞거나 일부 항목만 줄 때 → 화면이 멈추지 않고 빠진 항목은 `언급 없음`+`autoFailed`("자동 판정 실패, 직접 확인"). (Task 6 `missing items are filled`)
2. 가림 표시(`[주민번호]`)가 판정을 바꾸지 않아야 함 → 원문과 가린 글의 규칙 검사 결과가 같다. (Task 5 `rules are the same after masking`)
3. 금액 표기("일억원", "1억 2천만원", "120,000,000원", "월 55만원")를 계좌번호로 가리지 않음. (Task 3 `amounts are not masked`)
4. 계약·약관이 아닌 글(뉴스, 영어 문단) → 판정을 돌리지 않고 안내만. (Task 3 `non-contract text is rejected`)
5. 키 없음·시간 초과 → 원인과 할 일 한 문장, 입력은 그대로. (Task 7 `api returns key message`)

---

### Task 1: 프로젝트 틀, 근거 문서, 점검팩

**Files:**
- Create: `package.json`(scripts: `dev`, `build`, `typecheck`, `test`, `eval`), `tsconfig.json`(다온과 같은 옵션), `vite.config.ts`(다온 `localApi` 플러그인 방식으로 `/api/check`, `/api/packs`를 `server/` 처리기로), `vercel.json`(`framework: vite`, `functions["api/check.ts"]`: maxDuration 60, includeFiles `knowledge/**`), `.env.example`, `.gitignore`, `knowledge/임대차/*.md`, `knowledge/헬스장/*.md`, `server/packs.ts`, `shared/types.ts`
- Test: `server/packs.test.ts`

**Interfaces:**
- Produces (`shared/types.ts`): `type Verdict = '보호됨' | '언급 없음' | '위험'`; `type CheckItem = { id: string; title: string; whatToCheck: string; riskHints: string[]; protectHints: string[]; knowledge: string /* 'knowledge/임대차/표준계약서.md#제목' */; fixText: string /* 수정 요구 대안 문구 */ }`; `type Pack = { id: 'lease' | 'gym'; name: string; items: CheckItem[] }`; `type ItemResult = { itemId: string; verdict: Verdict; quote: string; knowledge: string; question: string; fixText: string; autoFailed: boolean }`; `type CheckResult = { pack: string; version: 'v0' | 'v1' | 'v2'; items: ItemResult[]; elapsedMs: number; referenceOnly: boolean }`
- Produces (`server/packs.ts`): `PACKS: Pack[]`, `getPack(id: string): Pack | undefined`, `openKnowledge(ref: string): { source: string; text: string } | undefined`, `searchKnowledge(query: string, packId: string): { source: string; text: string }[]` (다온 `server/wiki.ts`처럼 `## 제목` 단위 절)

- [ ] **Step 1:** 국토교통부 주택임대차표준계약서, 국토부·HUG 전세사기 예방 안내, 공정위 체육시설 관련 표준약관, 소비자분쟁해결기준(체력단련장업)을 실제로 열어 읽고 필요한 부분만 `knowledge/`에 발췌한다(파일 머리: 출처 URL, 확인 날짜). 읽지 못한 근거는 쓰지 않는다.
- [ ] **Step 2: failing test** `every item points at an existing knowledge section`(모든 `item.knowledge`가 `openKnowledge`로 열림), `item counts`(lease 10~12, gym 6~8), `ids are unique`
- [ ] **Step 3:** `npm test` → FAIL · **Step 4:** `packs.ts`, 팩 데이터 작성 · **Step 5:** `npm test` → PASS
- [ ] **Step 6:** Commit `feat: check packs grounded in verified public documents`

### Task 2: 정답 표 30건 (규칙·프롬프트보다 먼저 봉인)

**Files:**
- Create: `data/cases_dev.jsonl`(10: lease 6, gym 4), `data/cases_test.jsonl`(20: lease 12, gym 8), `data/README.md`, `server/cases.ts`
- Test: `server/cases.test.ts`

**Interfaces:**
- Produces: 한 줄 `{"id": "dev-01", "pack": "lease"|"gym", "kind": "전세"|"반전세"|"월세"|"헬스장"|"PT", "text": string, "labels": {[itemId]: Verdict}}`; `loadCases(split: 'dev' | 'test'): Case[]`

- [ ] **Step 1: failing test** `labels cover every item of the pack`, `split sizes`(dev 10, test 20, 팩 비율 위 숫자), `tricky cases present`(test에 위험 0개 ≥2, 위험 3개 이상 ≥2, 개인정보 포함 ≥3, 부정문 보호 조항 ≥2, gym 숫자 기준 위반 위약금 ≥2)
- [ ] **Step 2:** → FAIL · **Step 3:** 사람이 정답을 정해 30건 작성(가짜 개인정보) · **Step 4:** → PASS
- [ ] **Step 5:** Commit `data: pre-register gold labels (30 cases) before rules and prompts` — 해시를 README·발표에 적는다.

### Task 3: 입력 검사와 개인정보 가림

**Files:** Create `server/validate.ts`, `server/pii.ts` · Test `server/validate.test.ts`, `server/pii.test.ts`

**Interfaces:** `validateInput(text: string): { ok: true } | { ok: false; message: string }` (`MIN_CHARS = 20`, `MAX_CHARS = 4000`); `maskPii(text: string): { masked: string; found: { kind: '주민번호' | '전화번호' | '계좌번호' | '동·호수'; sample: string }[] }`

- [ ] **Step 1: failing tests** `empty is rejected`, `too long is rejected (message mentions 4000)`, `non-contract text is rejected`(계약 관련 낱말 0개), `rrn masked`(`900101-1234567` → `[주민번호]`), `phone masked`, `account masked`(`신한 110-123-456789`), `unit masked`(`101동 1203호` → `[동·호수]`), `amounts are not masked`
- [ ] **Step 2:** → FAIL · **Step 3:** 정규식 구현 · **Step 4:** → PASS · **Step 5:** Commit `feat: input validation and PII masking before any AI call`

### Task 4: 채점과 평가 실행기

**Files:** Create `server/score.ts`, `scripts/eval.mjs` (다온 `scripts/measure-question-cost.mjs`처럼 vite `ssrLoadModule`로 `server/check.ts`를 불러 실제 처리기를 돈다) · Test `server/score.test.ts`

**Interfaces:** `score(results: CheckResult[], cases: Case[]): { riskRecall: number; riskPrecision: number | null; accuracy: number; missingItems: number; autoFailed: number; avgElapsedMs: number }`; CLI `npm run eval -- --version v0|v1|v2|all --split dev|test` → `results/<split>_<version>.json`, `results/summary_<split>.md`(팩별·전체 표)

- [ ] **Step 1: failing tests** `perfect score`, `missed risk halves recall`, `false alarm lowers precision`, `missing item counted`
- [ ] **Step 2:** → FAIL · **Step 3:** 구현(`--split test`일 때만 test 파일을 읽음) · **Step 4:** → PASS · **Step 5:** Commit `feat: scoring and eval runner`

### Task 5: 규칙 검사 (v2 재료)

**Files:** Create `server/rules.ts` · Test `server/rules.test.ts`

**Interfaces:** `ruleScan(text: string, pack: Pack): Record<string, { verdict: Verdict | null; quote: string }>`; gym 팩은 금액·기간을 읽어 소비자분쟁해결기준의 숫자 기준(위약금 상한 등, Task 1 발췌 값 그대로)으로 계산한다.

- [ ] **Step 1: failing tests** `negation is protect`("근저당을 설정하지 않는다"), `risk hint detected`, `unknown returns null`, `gym penalty over the limit is risk`, `rules are the same after masking`(dev 10건)
- [ ] **Step 2:** → FAIL · **Step 3:** 구현(dev 세트만 보고 조정) · **Step 4:** → PASS · **Step 5:** Commit `feat: rule pre-check for v2`

### Task 6: AI 판정 v0·v1·v2와 `check()`

**Files:** Create `server/llm.ts`, `server/prompts.ts`, `server/check.ts` · Test `server/check.test.ts`

**Interfaces:**
- `class CheckError extends Error { status: number }` (메시지는 화면에 그대로)
- `check(input: { text: string; pack: string; version?: 'v0' | 'v1' | 'v2' }, deps?: { model?: LanguageModel }): Promise<CheckResult>` — 내부에서 검사·가림 후 호출. 팩이 없으면 `referenceOnly: true`로 v0만 돈다.
- `llm.ts`: `getModel(): LanguageModel` (`LLM_PROVIDER`로 `@ai-sdk/google` 또는 `@ai-sdk/openai`; 키 없으면 `CheckError(503, '<키 환경 변수 이름>가 설정되지 않았어요…')`)
- v0: `generateText`, 한 줄 지시("다음 계약 문구에서 나에게 불리한 조항을 찾아 줘"), 자유 응답에서 위험으로 언급된 항목만 `위험`, 나머지 `언급 없음`
- v1: `generateObject` + zod 스키마 `items[{itemId, verdict, quote, question}]` + 팩 항목 목록 + "원문 문장을 그대로 인용"
- v2: `generateText` + `knowledge` 도구(다온 `saju_wiki` 방식: page 또는 query, `stopWhen` 4단계) + 규칙 판정을 함께 주고 마지막에 구조화 출력, 이후 보정(빠진 항목 채움, 원문에 없는 quote → `언급 없음`+`autoFailed`, `knowledge`는 실제 연 절만 허용, `fixText`는 팩 값)
- 공통: `temperature: 0`, `abortSignal` 25초, 재시도 1번

- [ ] **Step 1: failing tests** (AI SDK의 `MockLanguageModelV2` 같은 가짜 모델로) `v1 parses structured output`, `missing items are filled`, `non-structured response does not throw`, `quote not in text is downgraded (v2)`, `knowledge must be an opened section (v2)`, `missing key raises 503 with env name`, `pii is never sent`(가짜 모델이 받은 프롬프트에 `900101-1234567` 없음), `unknown pack is reference only`
- [ ] **Step 2:** → FAIL · **Step 3:** 구현 · **Step 4:** → PASS · **Step 5:** Commit `feat: v0/v1/v2 checkers with knowledge tool and output repair`

### Task 7: 화면과 API

**Files:** Create `api/check.ts`, `api/packs.ts`(다온 `api/chat.ts`처럼 `POST`/`GET`을 `server/` 처리기에 넘김), `server/http.ts`(`handleCheck(request)`, `handlePacks()`), `index.html`, `src/main.tsx`, `src/App.tsx`, `src/components/ResultCard.tsx`, `src/styles.css`(Montage 디자인 토큰, MIT 표기) · Test `server/http.test.ts`, `tests/ui.spec.ts`(Playwright)

**Interfaces:** `POST /api/check` `{action: 'mask' | 'check', pack, text, version?}` → mask: `{masked, found}`, check: `CheckResult`; 실패 `{error}` + 400/503/504. `GET /api/packs` → `{packs: {id, name, itemCount}[]}`
- 화면: 계약 종류 선택 → 붙여 넣기 → [가린 내용 미리보기] → [점검하기] → 항목 카드(신호등 색, 원문 인용, 근거 링크, 물어볼 질문, 대안 문구 복사) → 법률 자문 아님 안내. 버전 선택은 '개발자 보기' 접힌 칸(기본 v2). 로딩·빈·오류 상태를 모두 그린다.

- [ ] **Step 1: failing tests** `api rejects empty (400)`, `api returns key message (503, env name)`, `api mask returns preview`, `api unknown pack is reference only`; Playwright `page loads`, `empty input shows message`, `preview shows [주민번호]`
- [ ] **Step 2:** → FAIL · **Step 3:** 구현 · **Step 4:** → PASS
- [ ] **Step 5:** `npm run dev`로 띄워 브라우저에서 dev 케이스 1건 확인(키가 있으면 실제 판정까지)
- [ ] **Step 6:** Commit `feat: web UI and API with defenses`

### Task 8: 실측 (API 키 필요)

- [ ] **Step 1:** `npm run eval -- --version all --split dev`로 조정. 프롬프트를 바꿀 때마다 이유와 dev 점수를 `프롬프트.md`에 적는다.
- [ ] **Step 2:** 끝나면 `npm run eval -- --version all --split test` **한 번**. 결과 표와 놓친 위험 사례 분석을 `docs/evaluation.md`에. 표본 판정 몇 개를 직접 열어 실제 출력이 표의 숫자와 맞는지 확인한다.
- [ ] **Step 3:** Commit `docs: held-out evaluation results`

### Task 9: 제출물

- [ ] **Step 1:** README: 문제, 실행 방법(`npm install`, `.env`, `npm run dev`), 평가 재현 명령, 정답 표 커밋 해시, 한계, 법률 자문 아님
- [ ] **Step 2:** `프롬프트.md`: v0→v1→v2 원문, 바꾼 이유, AI가 틀린 사례와 잡은 방법, CLAUDE.md·스킬 사용 내역
- [ ] **Step 3:** 공개 레포 생성·push, Vercel 배포(환경 변수에 키) — 사용자 확인 후
- [ ] **Step 4:** 시연 영상 1~3분(실제 화면 녹화: 핵심 흐름 + 개인정보 가림 + 빈 입력 + 키 없음)
- [ ] **Step 5:** 발표 자료 6장(문제 정의 / 서비스 소개 / 설계 판단 / 평가 리포트 / AI 활용 / 회고), 개발 직군 중심
