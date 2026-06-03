import * as Tone from 'tone'

// 각 음색은 "단일(모노) 신스를 만드는 팩토리"만 제공합니다.
// 폴리포니는 engine 의 makePoly 가 풀(pool)을 돌려가며 처리합니다.
// 핵심 원칙: 절대 모듈 최상단에서 new 하지 않는다. create*() 는 Tone.start() 이후에만 호출된다.

export const VOICES = [
  {
    id: 'grand', name: 'Grand', sub: '그랜드 피아노', hue: 45,
    createMono: () => new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.004, decay: 0.5, sustain: 0.08, release: 1.4 },
    }),
  },
  {
    id: 'rhodes', name: 'Rhodes', sub: '일렉트릭 피아노', hue: 28,
    createMono: () => new Tone.FMSynth({
      harmonicity: 3, modulationIndex: 9,
      envelope: { attack: 0.004, decay: 0.35, sustain: 0.2, release: 1.1 },
      modulation: { type: 'sine' },
      modulationEnvelope: { attack: 0.01, decay: 0.25, sustain: 0, release: 0.3 },
    }),
  },
  {
    id: 'lead', name: 'Lead', sub: '소우 리드', hue: 320,
    createMono: () => new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.02, decay: 0.12, sustain: 0.6, release: 0.3 },
    }),
  },
  {
    id: 'pad', name: 'Pad', sub: '웜 패드', hue: 200,
    createMono: () => new Tone.AMSynth({
      harmonicity: 2,
      envelope: { attack: 0.6, decay: 0.3, sustain: 0.85, release: 1.6 },
      modulation: { type: 'sine' },
    }),
  },
  {
    id: 'bass', name: 'Bass', sub: '서브 베이스', hue: 280,
    createMono: () => new Tone.MonoSynth({
      oscillator: { type: 'square' },
      filter: { Q: 2, type: 'lowpass' },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.45, release: 0.3 },
      filterEnvelope: { attack: 0.02, decay: 0.2, sustain: 0.3, baseFrequency: 80, octaves: 3 },
    }),
  },
  {
    id: 'bell', name: 'Bell', sub: '크리스탈 벨', hue: 175,
    createMono: () => new Tone.FMSynth({
      harmonicity: 5, modulationIndex: 12,
      envelope: { attack: 0.001, decay: 1.3, sustain: 0, release: 1.6 },
      modulationEnvelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.5 },
    }),
  },
  {
    id: 'pluck', name: 'Pluck', sub: '플럭 (워클릿)', hue: 95,
    createMono: () => new Tone.PluckSynth({ attackNoise: 1, dampening: 4000, resonance: 0.9 }),
  },
  {
    id: 'organ', name: 'Organ', sub: '오르간', hue: 15,
    createMono: () => new Tone.Synth({
      oscillator: { type: 'fatsawtooth', count: 3, spread: 30 },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.9, release: 0.25 },
    }),
  },
  {
    id: 'strings', name: 'Strings', sub: '스트링', hue: 220,
    createMono: () => new Tone.AMSynth({
      harmonicity: 1.5,
      envelope: { attack: 0.4, decay: 0.2, sustain: 0.9, release: 1.3 },
    }),
  },
  {
    id: 'brass', name: 'Brass', sub: '브라스', hue: 38,
    createMono: () => new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.05, decay: 0.1, sustain: 0.8, release: 0.3 },
    }),
  },
  {
    id: 'glass', name: 'Glass', sub: '글라스', hue: 160,
    createMono: () => new Tone.FMSynth({
      harmonicity: 7, modulationIndex: 5,
      envelope: { attack: 0.005, decay: 0.9, sustain: 0.1, release: 1 },
    }),
  },
]

// UI 라벨용 정적 메타 (createDrumKit 의 pads 순서와 일치)
export const DRUM_META = [
  { name: 'Kick', hue: 0 }, { name: 'Snare', hue: 30 }, { name: 'Hat', hue: 55 }, { name: 'OpHat', hue: 90 },
  { name: 'Tom', hue: 200 }, { name: 'Clap', hue: 320 }, { name: 'Cym', hue: 175 }, { name: 'Rim', hue: 280 },
]

// 드럼킷: 패드 8개. 각 패드는 (master 에 연결된) 인스트루먼트를 만들고 trigger 함수를 노출.
// NoiseSynth/MetalSynth/MembraneSynth 는 워클릿 미사용 계열이라 안전.
export function createDrumKit(dest) {
  const make = (inst) => inst.connect(dest)
  const kick = make(new Tone.MembraneSynth({ octaves: 6, pitchDecay: 0.05 }))
  const snare = make(new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.2, sustain: 0 } }))
  const closedHat = make(new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.1, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 }))
  const openHat = make(new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.5, release: 0.2 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 }))
  const tom = make(new Tone.MembraneSynth({ octaves: 4, pitchDecay: 0.1 }))
  const clap = make(new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.002, decay: 0.15, sustain: 0 } }))
  const cymbal = make(new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 1.2, release: 0.4 }, harmonicity: 3.4, modulationIndex: 40, resonance: 3000, octaves: 2 }))
  const rim = make(new Tone.MembraneSynth({ octaves: 2, pitchDecay: 0.008 }))

  const pads = [
    { name: 'Kick',  hue: 0,   trigger: (t) => kick.triggerAttackRelease('C1', '8n', t) },
    { name: 'Snare', hue: 30,  trigger: (t) => snare.triggerAttackRelease('8n', t) },
    { name: 'Hat',   hue: 55,  trigger: (t) => closedHat.triggerAttackRelease('C5', '32n', t) },
    { name: 'OpHat', hue: 90,  trigger: (t) => openHat.triggerAttackRelease('C5', '8n', t) },
    { name: 'Tom',   hue: 200, trigger: (t) => tom.triggerAttackRelease('G2', '8n', t) },
    { name: 'Clap',  hue: 320, trigger: (t) => clap.triggerAttackRelease('8n', t) },
    { name: 'Cym',   hue: 175, trigger: (t) => cymbal.triggerAttackRelease('C4', '2n', t) },
    { name: 'Rim',   hue: 280, trigger: (t) => rim.triggerAttackRelease('C3', '32n', t) },
  ]

  const dispose = () => {
    [kick, snare, closedHat, openHat, tom, clap, cymbal, rim].forEach((i) => { try { i.dispose() } catch (e) { /* noop */ } })
  }

  return { pads, dispose }
}
