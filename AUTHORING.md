# 활동지 새로 쓰기 지침 (듀오링고식)

고등학교 2학년 자료구조 활동지를 한 화면에 한 걸음씩 푸는 화면으로 **처음부터 다시 쓴다**.
본보기: `pages/week12/student_workbook.html` — 반드시 먼저 끝까지 읽고 같은 수준으로 쓴다.

## 절대 원칙
1. **줄글 금지.** 설명은 한 줄 요점(`ul.x-pts`), 낱말 카드(`.x-cards`), 값 칩(`.x-given`), 규칙 카드(`ol.x-rules`), 그림으로만. 한 항목은 한 줄(대략 40자 안쪽). 설명용 문단 `<p>` 를 쓰지 않는다.
2. **그림으로 보여 준다.** 격자는 `.x-grid`, 그래프는 `.x-graph`(목록·칩으로 대신하지 않는다), 배열은 `.x-arr`, 재귀·분할·호출·탐색 순서는 `ul.x-tree`, 순서는 `.x-flow`, 코드는 `pre.x-code`. 원본의 ASCII 그림(pre)은 전부 이 부품으로 바꾼다. 원본에 없는 그림도 이해에 도움이 되면 넣는다.
3. **맥락을 질문 바로 위에.** 질문에 쓰는 배열·변수·값(예: `a`, `SORTED`, 목표)은 그 화면 안에 다시 보여 준다. 앞 화면을 기억해야만 풀 수 있게 하지 않는다. 기호(a, lo, G1 …)는 처음 나올 때 무엇인지 칩으로 밝힌다.
4. **칸마다 무엇을 어떤 꼴로 쓰는지 분명히.** 이게 가장 중요하다. 학생이 칸을 보고 "뭘 쓰라는 거지?"가 되면 실패다.
   - 모든 칸에 `data-ph` 로 **꼴이 보이는 예**를 준다: "숫자", "예: 인덱스 3 / 없음", "예: [2, 1]", "예: 14>9 → lo=3". 정답 자체는 쓰지 않는다(다른 값으로 든 예).
   - 표의 열 이름에는 `<small>` 로 한 줄 뜻을 붙인다: `<th>판정<small>비교 결과 → 바뀐 값</small></th>`.
   - 칸이 많은 표에는 **예시 줄**을 맨 위에 둔다: `<tr class="x-ex"><td>예</td><td>…</td></tr>` (다른 작은 사례로 채운 읽기 전용 줄).
   - "판정", "결과", "비교", "깊이"처럼 모호한 말은 그 자리에서 정의한다.
   - 질문은 "무엇을 / 몇 개 / 어떤 꼴로"를 다 담는다: "원인 후보 2가지 (서로 다르게, 각 한 문장)".
5. **채점 칸만 빈칸.** 화면의 빈칸은 원본 채점 칸(`data-key`)뿐이어야 한다. 원본의 쓰기형 확인 질문(`.quiz` 안 `.ans` 입력)은 고르기형 `.quiz` 로 바꾸거나 뺀다.
6. **모든 채점 칸을 정확히 한 번씩** `data-bind` 로 넣는다. 빠지거나 두 번이면 안 된다. key 는 바꾸지 않는다. 쓸 일이 없을 수도 있는 칸(추적표 남는 줄 등)은 `tr class="opt"` + `data-ph="안 쓰면 비움"`.
7. **내용·순서는 재구성해도 된다.** 성취기준 문구, 차시 운영 안내, "활동을 마친 뒤 열어 확인" 같은 운영 문구, 반복 설명은 뺀다. 문제가 묻는 내용과 풀이에 필요한 정보는 빠뜨리지 않는다. 채점 칸의 정답을 미리 보여 주지 않는다.
8. 말투는 해요체, 짧게. 이모지 금지.

## 파일 꼴
`pages/weekNN/<원본 파일 이름>.html` 하나. 내용은 아래 틀뿐이다(`<html>`, `<head>` 없음).

```html
<div class="x-page" hidden data-title="12주차 실습 코드 1부 · …" data-lead="한 줄 소개">
  <section class="x-act" data-id="A7" data-title="활동 이름" data-meta="10분 · 개인">
    <ul class="x-pts"><li>이 활동에서 할 일 한 줄</li></ul>      ← 활동 첫 화면(선택)
    <div class="x-screen" data-title="화면 제목"> … </div>       ← 한 화면 = 한 가지 일
  </section>
</div>
```
- 활동마다 화면 3~8개. 한 화면에 질문 1~3개, 스크롤이 길지 않게.
- `data-id` 는 원본 활동 번호(A1, Q1 …). 번호 없는 구역(사용법 등)은 빼거나 필요한 것만 다른 화면에 녹인다.

## 부품
```html
<ul class="x-pts"><li><b>lo</b> = 0, <b>hi</b> = 마지막 인덱스</li></ul>
<div class="x-given"><span><b>a</b>[3, 7, 9]</span><span><b>목표</b>14</span></div>
<div class="x-cards"><div><b>이진 탐색</b>가운데와 비교해 절반씩</div></div>
<ol class="x-rules"><li class="r1"><b>이름</b><div class="fx"><code>식</code><span>설명</span></div></li>
  <li class="r3"><b>비교</b><div class="cases"><div class="c-eq"><code>조건</code><i>→</i><span>결과</span></div>
  <div class="c-up">…</div><div class="c-dn">…</div></div></li></ol>          (li 의 r1~r4 는 색)
<div class="x-arr" data-name="SORTED" data-v="2,5,8,12" data-lo="0" data-hi="3" data-mid="1" data-hit="2" data-miss="3" data-label="1단계 설명 한 줄"></div>
<div class="x-arr mini" data-v="…" data-noidx data-cls="0:pivot,1-3:small,4-5:big"></div>   (cls: pivot small big done hit miss)
<div class="x-flow"><span>1000</span><span>500</span><span class="hit">1</span></div>
<ul class="x-tree"><li><span>f(4) <em>1단계</em></span><ul><li><span>f(3)</span></li><li><span>f(2)</span></li></ul></li></ul>
   (span 안에 <i class="pv">피벗</i>, <b class="sm">작은 쪽</b>, <b class="bg">큰 쪽</b>)
<!-- 격자(미로·섬·지도). # 벽, S 시작, E 도착, . 빈칸, 다른 글자는 그대로 표시 -->
<div class="x-grid" data-name="MAZE" data-rc data-rows="S.#..|.##.#|...#E" data-mark="1,0:seen;2,1:cur" data-path="0,0>1,0>2,0>2,1"></div>
   (data-rc 행·열 번호 / data-mark "행,열:종류" 종류 = hit cur seen miss a b / data-path "행,열>행,열" 경로선, 대각선 가능 / data-label 한 줄 설명)
<!-- 그래프. 좌표는 "열,행" 칸 단위(1칸 ≈ 92px). 가중치는 A-B:3 -->
<div class="x-graph" data-name="G1" data-nodes="A:0,1 B:1,0 C:1,2 D:2,1" data-edges="A-B,A-C,B-D,C-D:2" data-start="A" data-done="B" data-hl="C" data-path="A>B>D" data-directed></div>
   (data-start 시작 노드 / data-done 방문함(초록) / data-hl 강조(파랑) / data-path 경로 간선 강조 / data-directed 화살표. 정답이 되는 방문 순서·경로는 칠하지 않는다)
<!-- 학생이 앞 화면에서 쓴 값을 다시 보여 주기(그 값을 근거로 묻는 질문 바로 위에) -->
표에 쓴 값: <span class="x-echo" data-echo="A11.t.r1.c2"></span>
<pre class="x-code">a = [3, 8, 8]
print(a.index(8))   #=> 1</pre>                       (#=> 뒤는 실행 결과 꼬리표. 코드는 보기만 하는 용도)
<div class="quiz" data-answer="2"><p class="q">질문?</p>
  <div class="opts"><button type="button" data-hint="틀렸을 때 힌트">보기1</button><button type="button">보기2</button></div>
  <p class="why">맞힌 뒤 한 줄 설명</p></div>             (data-answer 는 1부터. 예측만 받을 땐 class="quiz predict")
<p class="x-q">질문<small>무엇을 몇 개, 어떤 꼴로</small></p>
<div class="x-line">하나씩 보면 최대 <span class="x-f" data-bind="KEY" data-w="s" data-ph="숫자"></span> 번</div>
표: <table class="x-trace"> (x-scroll 로 감싼다). 긴 칸 td class="wide", 선택 줄 tr class="opt", 예시 줄 tr class="x-ex", 열 설명 th 안 <small>.
```

### 채점 칸 `.x-f[data-bind="KEY"]` (종류는 원본 칸을 보고 자동)
- 한 줄: `<span class="x-f" data-bind="K" data-w="xs|s|m|l|full" data-ph="예: …"></span>`
- 여러 줄: `<div class="x-f" data-bind="K" data-ph="…"></div>`
  - **여러 가지를 써야 하는 서술 칸은 반드시 나눈다**: `data-parts="이름=예: …|이름=예: …"`. 학생은 작은 칸 여러 개에 쓰고, 저장 때 "이름: 값" 줄로 합쳐진다. 원본 칸 안내의 1줄/2줄/①② 구성을 parts 로 옮긴다.
- 라디오·select: `<div class="x-f" data-bind="K"></div>` (원본 보기가 단추로 나온다)
- 체크박스: `<div class="x-f" data-bind="K">체크 문구</div>`
- 코드: `<div class="x-f" data-bind="K"></div>` → 원본 편집기(실행·시작 코드 포함)가 옮겨 온다. 위에 할 일·조건·입출력 예를 요점과 `pre.x-code` 로 먼저 보여 준다.
- 채점 안 되는 연습 편집기: `<div class="x-ed" data-starter="ID"></div>` (원본 `data-starter` 편집기). 필요한 것만.

## 작업 순서
1. `python inspect_page.py weekNN <파일>` 로 원본 내용과 채점 칸 목록(모범답 포함)을 본다. 모범답은 이해용이고 화면에 넣지 않는다.
2. `pages/weekNN/<파일>.html` 을 쓴다.
3. `python build.py --only weekNN/<파일>` 후 `node verify.mjs weekNN/<파일>` → `OK` 또는 `OK~`(코드 칸 순서만 다름)여야 한다. `XX` 면 메시지(화면에 없음/두 번/원본에 없음)를 보고 고친다.
4. 다른 파일·`src/`·`build.py`·`verify.mjs`·`AUTHORING.md` 는 고치지 않는다. 부품이 모자라면 있는 부품을 조합한다.
