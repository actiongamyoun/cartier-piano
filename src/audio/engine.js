import * as Tone from 'tone'
import { VOICES, createDrumKit } from './voices.js'

// 수동 폴리포니: 모노 신스 풀을 round-robin 으로 돌린다.
// 같은 워클릿 모듈(PluckSynth 등)은 인스턴스를 여러 개 만들어도 모듈은 1회만 등록되므로 안전.
function makePoly(createMono, count, dest, createFx) {
  // 옵션 이펙트: voices → fx → dest
  let target = dest
  let fxNode = null
  if (createFx) {
    fxNode = createFx()
    fxNode.connect(dest)
    target = fxNode
  }
  const voices = []
  for (let i = 0; i < count; i++) {
    const v = createMono()
    v.connect(target)
    voices.push(v)
  }
  const noteToVoice = new Map()
  let next = 0
  return {
    triggerAttack(note, time) {
      // 이미 같은 노트가 울리는 중이면 그 보이스 재사용
      let v = noteToVoice.get(note)
      if (!v) {
        v = voices[next]
        next = (next + 1) % count
        noteToVoice.set(note, v)
      }
      try { v.triggerAttack(note, time) } catch (e) { /* noop */ }
    },
    triggerRelease(note, time) {
      const v = noteToVoice.get(note)
      if (v) {
        noteToVoice.delete(note)
        try { if (v.triggerRelease) v.triggerRelease(time) } catch (e) { /* noop */ }
      }
    },
    releaseAll() {
      noteToVoice.clear()
      voices.forEach((v) => { try { v.triggerRelease && v.triggerRelease() } catch (e) { /* noop */ } })
    },
    dispose() {
      voices.forEach((v) => { try { v.dispose() } catch (e) { /* noop */ } })
      if (fxNode) { try { fxNode.dispose() } catch (e) { /* noop */ } }
    },
  }
}

export class AudioEngine {
  constructor() {
    this.started = false
    this.master = null
    this.reverb = null
    this.poly = null          // 현재 멜로딕 음색 (makePoly)
    this.drum = null          // 현재 드럼킷
    this.mode = 'melodic'     // 'melodic' | 'drum'
    this.currentVoiceId = null
    this.sustain = false
    this.sustained = new Set()
    this.metroSynth = null
    this.metroLoop = null
    this.recording = null     // { startedAt, events: [] }
  }

  async start() {
    if (this.started) return
    await Tone.start()
    this.master = new Tone.Gain(0.8).toDestination()
    this.reverb = new Tone.Reverb({ decay: 1.6, wet: 0.16 }).connect(this.master)
    this.metroSynth = new Tone.MembraneSynth({ octaves: 4, pitchDecay: 0.02, volume: -6 }).connect(this.master)
    this.started = true
  }

  setMasterVolume(v) {
    if (this.master) this.master.gain.rampTo(v, 0.04)
  }

  // 음색 로드: 항상 이전 것을 dispose 한 뒤 새로 만든다 (한 번에 하나만 살아있음)
  loadVoice(voiceId) {
    if (!this.started) return
    this._disposeActive()
    if (voiceId === 'drum') {
      this.mode = 'drum'
      this.drum = createDrumKit(this.master)
      this.currentVoiceId = 'drum'
      return
    }
    const def = VOICES.find((v) => v.id === voiceId) || VOICES[0]
    this.mode = 'melodic'
    const dest = def.dry ? this.master : this.reverb
    this.poly = makePoly(def.createMono, 10, dest, def.createFx)
    this.currentVoiceId = def.id
  }

  _disposeActive() {
    if (this.poly) { this.poly.dispose(); this.poly = null }
    if (this.drum) { this.drum.dispose(); this.drum = null }
    this.sustained.clear()
  }

  noteOn(note) {
    if (this.mode !== 'melodic' || !this.poly) return
    this.poly.triggerAttack(note)
    this.sustained.delete(note)
    this._rec({ k: 'on', note })
  }

  noteOff(note) {
    if (this.mode !== 'melodic' || !this.poly) return
    if (this.sustain) { this.sustained.add(note); return }
    this.poly.triggerRelease(note)
    this._rec({ k: 'off', note })
  }

  drumHit(padIndex) {
    if (this.mode !== 'drum' || !this.drum) return
    const pad = this.drum.pads[padIndex]
    if (pad) { pad.trigger(); this._rec({ k: 'drum', pad: padIndex }) }
  }

  setSustain(on) {
    this.sustain = on
    if (!on && this.poly) {
      this.sustained.forEach((note) => this.poly.triggerRelease(note))
      this.sustained.clear()
    }
  }

  setMetronome(on, bpm) {
    if (!this.started) return
    Tone.getTransport().bpm.value = bpm
    if (on) {
      if (!this.metroLoop) {
        this.metroLoop = new Tone.Loop((time) => {
          this.metroSynth.triggerAttackRelease('C2', '16n', time)
        }, '4n')
      }
      this.metroLoop.start(0)
      Tone.getTransport().start()
    } else {
      if (this.metroLoop) this.metroLoop.stop()
      Tone.getTransport().stop()
    }
  }

  setBpm(bpm) {
    if (this.started) Tone.getTransport().bpm.value = bpm
  }

  // ---- 녹음 ----
  startRecording() {
    this.recording = { startedAt: performance.now(), events: [] }
  }

  stopRecording() {
    if (!this.recording) return null
    const events = this.recording.events
    this.recording = null
    return events
  }

  _rec(ev) {
    if (this.recording) {
      this.recording.events.push({ ...ev, t: performance.now() - this.recording.startedAt })
    }
  }

  // 재생: 저장된 voiceId 로 음색을 다시 로드한 뒤 이벤트를 setTimeout 으로 스케줄.
  playRecording(rec, onDone) {
    this.loadVoice(rec.voiceId)
    const timers = []
    rec.events.forEach((ev) => {
      const id = setTimeout(() => {
        if (ev.k === 'on') this.poly && this.poly.triggerAttack(ev.note)
        else if (ev.k === 'off') this.poly && this.poly.triggerRelease(ev.note)
        else if (ev.k === 'drum') this.drum && this.drum.pads[ev.pad] && this.drum.pads[ev.pad].trigger()
      }, ev.t)
      timers.push(id)
    })
    const last = rec.events.length ? rec.events[rec.events.length - 1].t : 0
    const endTimer = setTimeout(() => { onDone && onDone() }, last + 400)
    timers.push(endTimer)
    this._playTimers = timers
    return () => timers.forEach(clearTimeout)
  }

  stopPlayback() {
    if (this._playTimers) this._playTimers.forEach(clearTimeout)
    this._playTimers = null
    if (this.poly) this.poly.releaseAll()
  }
}
