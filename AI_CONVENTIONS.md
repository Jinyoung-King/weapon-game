# AI Development Conventions (weapon-game)

이 프로젝트는 고품질 RPG 전투 경험을 제공하는 웹 기반 게임입니다. AI 어시스턴트는 다음 규칙과 컨텍스트를 준수하여 코드를 작성하고 수정해야 합니다.

## 1. 핵심 원칙
- **하위 호환성 유지**: 새로운 기능을 추가하거나 기존 로직을 수정할 때, 이전에 잘 작동하던 기능(저장/불러오기, 전투 루프, 재화 획득 등)이 깨지지 않도록 보장해야 합니다.
- **무결성 우선**: 코드 수정 후에는 항상 전체적인 흐름에 부작용(Side Effects)이 없는지 검토합니다.

## 2. 파일 구조 및 로직 분리 (Architecture)
`useGameLogic.js`는 프로젝트의 메인 오케스트레이터입니다. 파일이 비대해지는 것을 방지하기 위해 다음 규칙을 엄격히 따릅니다.

### A. 상태 분리 (`src/hooks/subhooks/use...State.js`)
- 모든 도메인별 상태(State)는 전용 State 훅에서 관리합니다.
- 예: `useEconomyState`, `useCombatState`, `useUiState` 등.

### B. 로직 분리 (`src/hooks/subhooks/use...Handlers.js`)
- 비즈니스 로직 및 이벤트 핸들러는 전용 Handlers 훅에서 관리합니다.
- 새로운 대형 기능을 추가할 때는 `useGameLogic.js`에 직접 작성하지 않고, 새로운 핸들러 파일을 만들어 분리합니다.
- 핸들러는 `useGameLogic`으로부터 `bundle` 객체(state, setters, utils 포함)를 주입받아 사용합니다.

### C. 메인 허브 (`src/hooks/useGameLogic.js`)
- 각 하위 훅들을 인스턴스화하고, 이들 사이의 데이터 흐름(Orchestration)만 담당합니다.
- 계산된 상태(Memoized States)나 범도메인적인 Effects(게임 루프, 자동 저장 등)만 이곳에 위치합니다.

## 3. 기술 스택 및 라이브러리
- **Framework**: React.js (Hooks 중심)
- **Database**: Firebase / Firestore (클라우드 저장 기능)
- **Styling**: Vanilla CSS (CSS Variables 및 모던 설계 지향)
- **Utilities**: `src/utils/gameUtils.js`에 공통 계산 로직을 모아 관리합니다.

## 4. 코딩 스타일 가이드
- **함수형 컴포넌트**: 모든 UI 및 로직은 Hooks 기반의 함수형으로 설계합니다.
- **명칭**: 
  - 상태 업데이트 함수는 `set...` 접두사를 사용합니다.
  - 이벤트 핸들러는 `handle...` 접두사를 사용합니다.
- **주석**: 복잡한 로직에는 작업의 의도와 동작 방식에 대한 주석을 한국어 또는 영어로 상세히 작성합니다.

## 5. UI/UX 디자인 철학 (Antigravity 전용)
- **Premium Aesthetics**: 단순한 Placeholder 대신 고품질의 그래픽과 애니메이션을 지향합니다.
- **Dynamic Design**: Hover 효과, 마이크로 애니메이션, 세련된 그라데이션 등을 적극 활용하여 사용자에게 '완성도 높은 게임'이라는 느낌을 주어야 합니다.

---
*이 문서는 프로젝트의 일관성을 유지하기 위해 작성되었으며, AI는 모든 제안에서 이 원칙을 최우선으로 고려합니다.*

## 6. Mistake Prevention & Lesson Log (Self-Correction)
AI 어시스턴트는 작업 중 발생한 실수나 사용자로부터 받은 중요한 피드백을 아래에 기록하여 동일한 실수를 반복하지 않도록 합니다.

### [실수 기록 및 교훈]
- *(이곳에 향후 발생한 실수와 예방 수단을 기록합니다)*
- **예시**: 특정 상점 로직 수정 시 무한 재화 획득 버그 발생 -> 이후 밸런스 관련 코드 수정 시 철저한 검증 절차 수행 등.
