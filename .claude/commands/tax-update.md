---
description: 조세법령정보시스템 신규 해석례·판례·결정례를 수집→요약→리포트(MD+Notion)까지 실행
argument-hint: "[--from YYYYMMDD --to YYYYMMDD]"
---

조세법령정보시스템 신규 자료 모니터링을 3단계로 실행한다. 각 단계는 서브에이전트에게 맡기고, 너는 순서·분기·결과 전달만 담당한다. 저장소 루트는 `C:\Users\tax52\TUTORIAL`이다.

추가 인자: $ARGUMENTS

## 0. 밀린 Notion 업로드 확인
`node tax-monitor/scripts/state.mjs pending`을 실행해 이전 실행 중 Notion 업로드가 남은 runDate 목록을 기억해 둔다.

## 1단계: 자료조사
`tax-collector` 에이전트를 호출한다. 인자가 있으면 그대로 전달한다.
- 상태가 FAILED면 이후 단계를 건너뛰고 실패 사유를 보고한 뒤 종료한다(상태 기록 없음 → 다음 실행에서 같은 기간을 다시 수집).
- 보고에서 `runDate`와 신규 건수를 확인한다.

## 2단계: 내용요약 (신규 1건 이상일 때)
1. `node tax-monitor/scripts/merge-summaries.mjs <runDate> --batches 12`로 docId 배치 목록을 얻는다.
2. 배치마다 `tax-summarizer` 에이전트를 호출한다. 프롬프트에 `runDate`, `part`(1부터), `docIds`를 적는다. 배치는 한 메시지에서 최대 4개씩 병렬로 호출한다.
3. 모두 끝나면 `node tax-monitor/scripts/merge-summaries.mjs <runDate>`로 병합한다. `missing`이 있으면 그 docId들만 묶어 `tax-summarizer`를 1회 더 호출(새 part 번호)하고 다시 병합한다.

## 3단계: 리포트 작성
`tax-reporter` 에이전트를 호출한다. 대상은 이번 `runDate`(신규 0건이어도 호출: 빈 리포트 + commit)와 0단계의 밀린 runDate들(Notion 업로드만, commit 생략)이다.

## 최종 보고
다음만 간단히 출력한다.
```
[세법 모니터링 <runDate>]
수집: <기간>, 신규 <n>건 (해석례 a / 판례 b / 심판·심사례 c), 중요 <h>건
오늘의 핵심: (리포트의 '오늘의 핵심' 최대 5줄)
리포트: tax-monitor/reports/<runDate>.md
Notion: <URL 또는 실패 사유>
경고: <있으면>
```
