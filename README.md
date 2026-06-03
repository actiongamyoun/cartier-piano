# Kartier Piano Studio

Vite + React + Tone.js 웹 신디사이저.

## 실행
```bash
npm install
npm run dev
```

## 빌드
```bash
npm run build
```

## Vercel 배포
- Framework Preset: **Vite** (자동 감지)
- Build Command: `npm run build`
- Output Directory: `dist`
- 별도 `vercel.json` 불필요

## 구조
- `src/audio/engine.js` — 오디오 엔진 (지연 초기화, 한 번에 한 음색만, 수동 makePoly, 서스테인/메트로놈/마스터볼륨/녹음)
- `src/audio/voices.js` — 11개 음색 + 드럼킷 (모듈 최상단에서 절대 new 하지 않음)
- `src/audio/layout.js` — 24키(2옥타브) 레이아웃 + PC 키매핑
- `src/components/Keyboard.jsx` — 건반/드럼패드 UI
- `src/components/Particles.jsx` — 네온 파티클
- `src/App.jsx` — 화면/컨트롤/입력(터치·마우스·PC·MIDI)

## 핵심 설계 원칙 (기존 버그 회피)
1. 신스는 `Tone.start()` **이후에만** 생성한다.
2. 항상 **하나의 음색만** 살려두고, 전환 시 이전 것을 dispose 한다.
3. 폴리포니는 모노 신스 풀을 돌리는 **수동 makePoly** 로 처리한다.

## 입력
- 흰건반: `Tab Q W E R T Y U I O P [ ] \`
- 검은건반: `2 3 5 6 7 9 0 =`
- `Space` = 서스테인
- 터치 멀티터치 / 마우스 / Web MIDI 지원
