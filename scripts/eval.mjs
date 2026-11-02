#!/usr/bin/env node
/**
 * 정답 표로 v0·v1·v2 를 잰다. 앱과 같은 처리기(server/check.ts)를 vite ssrLoadModule 로 불러 그대로 돌린다.
 *
 *   npm run eval -- --version all --split dev     # 프롬프트·규칙을 고칠 때(여러 번)
 *   npm run eval -- --version all --split test    # 발표 숫자(마지막에 한 번)
 *
 * 결과: results/<split>_<version>.json (케이스별 판정 원본), results/summary_<split>.md (표)
 * 키: .env 의 LLM_PROVIDER 와 GEMINI_API_KEY 또는 OPENAI_API_KEY.
 */
import { createServer, loadEnv } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const split = args.split ?? 'dev';
const versions = (args.version ?? 'all') === 'all' ? ['v0', 'v1', 'v2'] : [args.version];
if (!['dev', 'test'].includes(split) || versions.some((v) => !['v0', 'v1', 'v2'].includes(v))) {
  console.error('사용법: npm run eval -- --version v0|v1|v2|all --split dev|test');
  process.exit(2);
}
Object.assign(process.env, loadEnv('production', process.cwd(), ''));

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { check } = await vite.ssrLoadModule('/server/check.ts');
  const { loadCases } = await vite.ssrLoadModule('/server/cases.ts');
  const { score } = await vite.ssrLoadModule('/server/score.ts');
  const { resolveModel } = await vite.ssrLoadModule('/server/llm.ts');
  let model;
  try {
    model = await resolveModel(process.env, process.env.GEMINI_MODEL || 'gemini-flash-lite-latest');
  } catch (e) {
    console.error(`${e.message}\n.env 에 LLM_PROVIDER 와 키를 넣고 다시 실행해 주세요(.env.example 참고).`);
    process.exitCode = 1;
    throw Object.assign(new Error('no-key'), { quiet: true });
  }
  const cases = loadCases(split);
  mkdirSync('results', { recursive: true });

  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  const rows = [];
  for (const version of versions) {
    const results = [];
    for (const c of cases) {
      process.stdout.write(`${version} ${c.id} … `);
      try {
        let r = await check({ text: c.text, pack: c.pack, version }, { model: model.model });
        for (let attempt = 1; attempt <= 4 && r.items.length > 0 && r.items.every((i) => i.autoFailed); attempt++) {
          await sleep(5000 * attempt);
          r = await check({ text: c.text, pack: c.pack, version }, { model: model.model });
        }
        results.push(r);
        console.log(`${(r.elapsedMs / 1000).toFixed(1)}s`);
        await sleep(500);
      } catch (e) {
        // 호출 실패는 결과를 지어내지 않고 '빠진 항목'으로 센다(점수에 그대로 드러난다)
        console.log(`실패: ${e.message}`);
        results.push({ pack: c.pack, version, items: [], elapsedMs: 0, referenceOnly: false, error: e.message });
      }
    }
    const s = score(results, cases);
    writeFileSync(`results/${split}_${version}.json`, JSON.stringify({ split, version, model: model.name, at: new Date().toISOString(), score: s, cases: cases.map((c, i) => ({ id: c.id, labels: c.labels, result: results[i] })) }, null, 2));
    const byPack = Object.fromEntries(['lease', 'gym'].map((p) => {
      const idx = cases.map((c, i) => (c.pack === p ? i : -1)).filter((i) => i >= 0);
      return [p, score(idx.map((i) => results[i]), idx.map((i) => cases[i]))];
    }));
    rows.push({ version, s, byPack });
  }

  const pct = (x) => (x === null ? '—' : `${(x * 100).toFixed(1)}%`);
  const lines = [
    `# 평가 결과 (${split}, ${cases.length}건)`,
    '',
    `- 모델: ${model.name}`,
    `- 실행: ${new Date().toISOString()}`,
    `- 채점 단위: 항목(케이스 × 그 팩의 점검 항목). 정답 표는 data/cases_${split}.jsonl`,
    '',
    '| 버전 | 위험 재현율(놓치지 않음) | 위험 정밀도(헛경고 없음) | 전체 정확도 | 빠진 항목 | 자동 판정 실패 | 평균 시간 |',
    '|---|---|---|---|---|---|---|',
    ...rows.map(({ version, s }) => `| ${version} | ${pct(s.riskRecall)} | ${pct(s.riskPrecision)} | ${pct(s.accuracy)} | ${s.missingItems} | ${s.autoFailed} | ${(s.avgElapsedMs / 1000).toFixed(1)}초 |`),
    '',
    '## 팩별',
    '',
    '| 버전 | 팩 | 위험 재현율 | 위험 정밀도 | 전체 정확도 |',
    '|---|---|---|---|---|',
    ...rows.flatMap(({ version, byPack }) => Object.entries(byPack).map(([p, s]) => `| ${version} | ${p} | ${pct(s.riskRecall)} | ${pct(s.riskPrecision)} | ${pct(s.accuracy)} |`)),
    '',
    '## 놓친 위험 (v별)',
    '',
    ...rows.map(({ version, s }) => `- ${version}: ${s.missedRisks.map((m) => `${m.caseId}/${m.itemId}`).join(', ') || '없음'}`),
    '',
    '## 헛경고 (v별)',
    '',
    ...rows.map(({ version, s }) => `- ${version}: ${s.falseAlarms.map((m) => `${m.caseId}/${m.itemId}`).join(', ') || '없음'}`),
    '',
  ];
  writeFileSync(`results/summary_${split}.md`, lines.join('\n'));
  console.log(`\n${lines.slice(6, 9 + rows.length).join('\n')}\n\nresults/summary_${split}.md 에 저장했어요.`);
} catch (e) {
  if (!e.quiet) throw e;
} finally {
  await vite.close();
}
