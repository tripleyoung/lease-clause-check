# 평가 결과 (dev, 10건)

- 모델: gemini:gemini-3.1-flash-lite
- 실행: 2026-11-02T01:40:09.007Z
- 채점 단위: 항목(케이스 × 그 팩의 점검 항목). 정답 표는 data/cases_dev.jsonl

| 버전 | 위험 재현율(놓치지 않음) | 위험 정밀도(헛경고 없음) | 전체 정확도 | 빠진 항목 | 자동 판정 실패 | 평균 시간 |
|---|---|---|---|---|---|---|
| v0 | 100.0% | 76.5% | 95.7% | 0 | 0 | 2.0초 |
| v1 | 92.3% | 100.0% | 97.9% | 0 | 7 | 1.7초 |
| v2 | 23.1% | 60.0% | 77.7% | 0 | 58 | 1.4초 |

## 팩별

| 버전 | 팩 | 위험 재현율 | 위험 정밀도 | 전체 정확도 |
|---|---|---|---|---|
| v0 | lease | 100.0% | 100.0% | 100.0% |
| v0 | gym | 100.0% | 55.6% | 85.7% |
| v1 | lease | 100.0% | 100.0% | 100.0% |
| v1 | gym | 80.0% | 100.0% | 92.9% |
| v2 | lease | 25.0% | 100.0% | 78.8% |
| v2 | gym | 20.0% | 33.3% | 75.0% |

## 놓친 위험 (v별)

- v0: 없음
- v1: dev-07/refund_allowed
- v2: dev-02/deposit_return, dev-02/repair_duty, dev-02/restoration, dev-04/term_two_years, dev-04/early_exit, dev-04/owner_change, dev-08/penalty_rate, dev-08/price_basis, dev-10/business_fault, dev-10/ad_mismatch

## 헛경고 (v별)

- v0: dev-07/before_start, dev-07/business_fault, dev-09/penalty_rate, dev-09/before_start
- v1: 없음
- v2: dev-07/before_start, dev-07/business_fault
