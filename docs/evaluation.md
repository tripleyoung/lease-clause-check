# 평가

**상태: 실측 전.** API 키가 아직 없어 숫자가 없습니다. 아래 명령으로 측정한 결과(`results/summary_test.md`)를 이 문서에 옮기고, 놓친 위험 사례를 직접 열어 분석합니다.

```bash
npm run eval -- --version all --split dev    # 조정
npm run eval -- --version all --split test   # 발표 숫자(한 번)
```

- 정답 표 봉인 커밋: `c5ee656` (규칙·프롬프트 커밋보다 앞섬)
- 채점 단위: 항목. 시험용 20건 = 임대차 12건 × 11항목 + 헬스장 8건 × 7항목 = 188개 판정
