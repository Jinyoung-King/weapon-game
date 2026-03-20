# ⚔️ Weapon Game: Infinite Progression RPG

Vite와 React 19를 활용하여 개발된 고성능 웹 기반 방치형 RPG 게임입니다. 복잡한 상태 관리와 실시간 동기화를 통해 사용자에게 끊임없는 성장 경험을 제공합니다.

## 🚀 Key Features

* **강화 시스템 (Enhancement)**: 확률 기반의 장비 강화 로직이 구현되어 있으며, 실패 스택(Fail Stack) 및 파괴/하락 방지 버프 시스템을 포함합니다.
* **장비 감정 (Appraisal)**: 생성된 장비에 대해 등급(Grade)과 랜덤 옵션을 부여하여 아이템의 가치를 차별화합니다.
* **전투 및 스테이지 (Combat & Progression)**: 보스 토벌을 통한 스테이지 진행과 레벨업 시스템, 환생(Rebirth)을 통한 영혼석 획득 메커니즘이 포함되어 있습니다.
* **실시간 PvP 투기장**: Firebase Firestore를 활용하여 다른 유저와 전투력을 비교하고 랭킹 경쟁을 벌일 수 있는 동기화 시스템을 갖추고 있습니다.
* **보안 및 데이터 관리**: PBKDF2 알고리즘 기반의 로컬 PIN 보안 시스템과 Firestore를 이용한 클라우드 세이브/로드 기능을 지원합니다.
* **방치형 보상 (Idle Rewards)**: 오프라인 시간을 계산하여 접속 시 골드, 경험치, 강화석 등의 보상을 자동으로 지급합니다.

## 🛠 Tech Stack

* **Frontend**: React 19, Vite, Tailwind CSS
* **Backend/BaaS**: Firebase (Auth, Firestore)
* **Icons**: Lucide React
* **State Management**: Custom Hooks (`useGameLogic`)를 통한 중앙 집중형 상태 관리

## 📦 Getting Started

### Prerequisites
* Node.js (최신 안정 버전 권장)
* npm 또는 yarn

### Installation
```bash
# 의존성 설치
npm install

# 로컬 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
```

## 🏗 Architecture & Code Quality

이 프로젝트는 유지보수성과 확장성을 위해 다음과 같은 원칙을 준수합니다.

* **Separation of Concerns**: 비즈니스 로직(`useGameLogic.js`)과 UI 컴포넌트(`AppView.jsx`)를 엄격히 분리하여 설계되었습니다.
* **Custom Hooks**: 복잡한 게임 상태(세션, 게임 데이터, 전투, PvP, UI)를 체계적으로 관리하기 위해 도메인별로 캡슐화된 커스텀 훅을 사용합니다.
* **Security**: 유저의 민감한 데이터 보호를 위해 `cryptoUtils`를 통한 PIN 암호화 및 검증 로직을 구현했습니다.

## 📝 License
이 프로젝트는 개인 학습 및 포트폴리오 목적으로 제작되었습니다.
