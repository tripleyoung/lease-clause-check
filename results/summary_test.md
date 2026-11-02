# 평가 결과 (test, 20건)

- 모델: gemini:gemini-flash-lite-latest
- 실행: 2026-11-02T16:00:38.469Z
- 채점 단위: 항목(케이스 × 그 팩의 점검 항목). 정답 표는 data/cases_test.jsonl

| 버전 | 위험 재현율(놓치지 않음) | 위험 정밀도(헛경고 없음) | 전체 정확도 | 빠진 항목 | 자동 판정 실패 | 평균 시간 |
|---|---|---|---|---|---|---|
| v0 | 87.5% | 87.5% | 92.6% | 7 | 0 | 1.4초 |
| v1 | 91.7% | 95.7% | 94.1% | 7 | 0 | 1.4초 |
| v2 | 95.8% | 95.8% | 94.7% | 7 | 0 | 2.4초 |

## 팩별

| 버전 | 팩 | 위험 재현율 | 위험 정밀도 | 전체 정확도 |
|---|---|---|---|---|
| v0 | lease | 93.8% | 93.8% | 98.5% |
| v0 | gym | 75.0% | 75.0% | 78.6% |
| v1 | lease | 93.8% | 100.0% | 98.5% |
| v1 | gym | 87.5% | 87.5% | 83.9% |
| v2 | lease | 100.0% | 100.0% | 99.2% |
| v2 | gym | 87.5% | 87.5% | 83.9% |

## 놓친 위험 (v별)

- v0: test-06/restoration, test-18/price_basis, test-18/ad_mismatch
- v1: test-06/restoration, test-18/ad_mismatch
- v2: test-18/ad_mismatch

## 헛경고 (v별)

- v0: test-06/deposit_return, test-18/refund_allowed, test-19/business_fault
- v1: test-18/refund_allowed
- v2: test-18/refund_allowed
