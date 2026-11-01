---
name: tax-infographic
description: Notion에 수집된 세법 해석례·판례 1건을 D2 흐름도와 Vega-Lite 차트로 구성한 1080×1350 인포그래픽 PNG로 만든다. 세법 자료의 인포그래픽, 카드, 도식화 요청에 사용한다.
argument-hint: "[문서ID 또는 Notion URL]"
---

세법 자료 1건을 인포그래픽으로 만든다. 작업은 `tax-infographic` 에이전트에게 맡긴다.

대상: $ARGUMENTS

1. 대상이 비어 있으면 `tax-monitor/config.json`의 `notion.dataSourceId` DB에서 `중요도`가 `중요`인 최근 자료 중, 수치와 절차가 모두 있는 건을 1개 고른다.
2. `tax-infographic` 에이전트를 호출하고 문서ID 또는 Notion URL을 전달한다.
3. 에이전트가 끝나면 `card.png`를 Read로 직접 열어 글자 겹침, 잘림, 수치를 확인한다.
4. 결과 경로, 원문 대조 결과, 렌더링 문제를 사용자에게 보고한다. 사람의 승인 없이 게시하지 않는다.
