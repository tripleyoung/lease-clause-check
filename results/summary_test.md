# 평가 결과 (test, 20건)

- 모델: gemini:gemini-3.1-flash-lite
- 실행: 2026-11-02T01:41:16.717Z
- 채점 단위: 항목(케이스 × 그 팩의 점검 항목). 정답 표는 data/cases_test.jsonl

| 버전 | 위험 재현율(놓치지 않음) | 위험 정밀도(헛경고 없음) | 전체 정확도 | 빠진 항목 | 자동 판정 실패 | 평균 시간 |
|---|---|---|---|---|---|---|
| v0 | 58.3% | 63.6% | 83.5% | 7 | 55 | 1.5초 |
| v1 | 33.3% | 100.0% | 82.4% | 7 | 105 | 1.0초 |
| v2 | 20.8% | 100.0% | 77.7% | 7 | 159 | 0.6초 |

## 팩별

| 버전 | 팩 | 위험 재현율 | 위험 정밀도 | 전체 정확도 |
|---|---|---|---|---|
| v0 | lease | 50.0% | 66.7% | 87.1% |
| v0 | gym | 75.0% | 60.0% | 75.0% |
| v1 | lease | 37.5% | 100.0% | 87.9% |
| v1 | gym | 25.0% | 100.0% | 69.6% |
| v2 | lease | 31.3% | 100.0% | 84.8% |
| v2 | gym | 0.0% | — | 60.7% |

## 놓친 위험 (v별)

- v0: test-01/no_new_mortgage, test-01/move_in_and_fixed_date, test-01/deposit_return, test-01/restoration, test-04/term_two_years, test-04/renewal_right, test-04/rent_increase, test-04/repair_duty, test-18/price_basis, test-18/ad_mismatch
- v1: test-01/no_new_mortgage, test-01/move_in_and_fixed_date, test-01/deposit_return, test-01/restoration, test-06/restoration, test-10/rent_increase, test-11/no_new_mortgage, test-11/landlord_info, test-12/early_exit, test-12/restoration, test-13/penalty_rate, test-14/refund_allowed, test-14/before_start, test-18/penalty_rate, test-18/price_basis, test-18/ad_mismatch
- v2: test-04/term_two_years, test-04/renewal_right, test-04/rent_increase, test-04/repair_duty, test-08/repair_duty, test-08/owner_change, test-10/rent_increase, test-11/no_new_mortgage, test-11/landlord_info, test-12/early_exit, test-12/restoration, test-13/penalty_rate, test-14/refund_allowed, test-14/before_start, test-17/gift_return, test-18/penalty_rate, test-18/price_basis, test-18/ad_mismatch, test-20/refund_allowed

## 헛경고 (v별)

- v0: test-06/early_exit, test-07/restoration, test-09/deposit_return, test-12/renewal_right, test-16/price_basis, test-17/price_basis, test-19/business_fault, test-20/before_start
- v1: 없음
- v2: 없음
