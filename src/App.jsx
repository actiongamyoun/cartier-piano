import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import * as Tone from 'tone'
import { AudioEngine } from './audio/engine.js'
import { VOICES, DRUM_META } from './audio/voices.js'
import { buildKeys, pcKeyToPos, pcKeyToPad } from './audio/layout.js'
import Keyboard from './components/Keyboard.jsx'
import Particles from './components/Particles.jsx'

const LS_KEY = 'kartier_recordings'

export default function App() {
  const [screen, setScreen] = useState('splash')
  const [baseOctave, setBaseOctave] = useState(4)
  const [masterVol, setMasterVol] = useState(0.8)
  const [bpm, setBpm] = useState(100)
  const [metroOn, setMetroOn] = useState(false)
  const [sustainOn, setSustainOn] = useState(false)
  const [voiceId, setVoiceId] = useState('grand')
  const [activeSet, setActiveSet] = useState(new Set())
  const [recState, setRecState] = useState('idle') // idle | recording | playing
  const [recordings, setRecordings] = useState([])
  const [toast, setToast] = useState(null)

  const engineRef = useRef(null)
  const particlesRef = useRef(null)
  const keyEls = useRef({})
  const held = useRef(new Set())

  // 핸들러가 최신 값을 보도록 ref 미러링
  const modeRef = useRef('melodic')
  const keysRef = useRef([])
  const hueRef = useRef(45)
  const sustainRef = useRef(false)

  if (!engineRef.current) engineRef.current = new AudioEngine()

  const mode = voiceId === 'drum' ? 'drum' : 'melodic'
  const keys = useMemo(() => buildKeys(baseOctave), [baseOctave])
  const curVoice = VOICES.find((v) => v.id === voiceId)
  const hue = curVoice ? curVoice.hue : 45

  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { keysRef.current = keys }, [keys])
  useEffect(() => { hueRef.current = hue }, [hue])

  // 녹음 목록 로드
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) setRecordings(JSON.parse(raw))
    } catch (e) { /* noop */ }
  }, [])

  // 전역 에러를 토스트로
  useEffect(() => {
    const onErr = (e) => showToast(`에러: ${e.message || e.error?.message || e}`)
    const onRej = (e) => showToast(`Promise: ${e.reason?.message || e.reason}`)
    window.addEventListener('error', onErr)
    window.addEventListener('unhandledrejection', onRej)
    return () => { window.removeEventListener('error', onErr); window.removeEventListener('unhandledrejection', onRej) }
  }, [])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3500) }

  const burstAt = useCallback((idx, h) => {
    const el = keyEls.current[idx]
    if (el && particlesRef.current) {
      const r = el.getBoundingClientRect()
      particlesRef.current.burst(r.left + r.width / 2, r.top + r.height * 0.4, h)
    }
  }, [])

  // ---- 입력 → 사운드 ----
  const pressPos = useCallback((pos) => {
    if (held.current.has(pos)) return
    held.current.add(pos)
    setActiveSet(new Set(held.current))
    const k = keysRef.current[pos]
    if (k) { engineRef.current.noteOn(k.note); burstAt(pos, hueRef.current) }
  }, [burstAt])

  const releasePos = useCallback((pos) => {
    if (!held.current.has(pos)) return
    held.current.delete(pos)
    setActiveSet(new Set(held.current))
    const k = keysRef.current[pos]
    if (k) engineRef.current.noteOff(k.note)
  }, [])

  const drumHit = useCallback((index) => {
    engineRef.current.drumHit(index)
    burstAt(index, DRUM_META[index]?.hue ?? 0)
    setActiveSet((prev) => { const n = new Set(prev); n.add(index); return n })
    setTimeout(() => setActiveSet((prev) => { const n = new Set(prev); n.delete(index); return n }), 120)
  }, [burstAt])

  // PC 키보드 (studio 진입 시 1회 부착)
  useEffect(() => {
    if (screen !== 'studio') return
    const down = (e) => {
      if (e.key === 'Tab') e.preventDefault()
      if (e.key === ' ') {
        e.preventDefault()
        if (!sustainRef.current) { sustainRef.current = true; setSustainOn(true); engineRef.current.setSustain(true) }
        return
      }
      if (e.repeat) return
      if (modeRef.current === 'drum') {
        const pad = pcKeyToPad(e.key)
        if (pad >= 0) drumHit(pad)
      } else {
        const pos = pcKeyToPos(e.key)
        if (pos >= 0) pressPos(pos)
      }
    }
    const up = (e) => {
      if (e.key === ' ') { sustainRef.current = false; setSustainOn(false); engineRef.current.setSustain(false); return }
      if (modeRef.current !== 'drum') {
        const pos = pcKeyToPos(e.key)
        if (pos >= 0) releasePos(pos)
      }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [screen, pressPos, releasePos, drumHit])

  // MIDI
  useEffect(() => {
    if (screen !== 'studio' || !navigator.requestMIDIAccess) return
    let access
    navigator.requestMIDIAccess().then((a) => {
      access = a
      const onMsg = (msg) => {
        const [status, note, vel] = msg.data
        const cmd = status & 0xf0
        const name = Tone.Frequency(note, 'midi').toNote()
        if (cmd === 0x90 && vel > 0) {
          if (modeRef.current === 'drum') engineRef.current.drumHit(note % 8)
          else engineRef.current.noteOn(name)
        } else if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) {
          if (modeRef.current !== 'drum') engineRef.current.noteOff(name)
        }
      }
      a.inputs.forEach((inp) => { inp.onmidimessage = onMsg })
    }).catch(() => { /* MIDI 미지원/거부 */ })
    return () => { if (access) access.inputs.forEach((inp) => { inp.onmidimessage = null }) }
  }, [screen])

  // ---- 컨트롤 ----
  const enterStudio = async () => {
    try {
      await engineRef.current.start()
      engineRef.current.loadVoice(voiceId)
      engineRef.current.setMasterVolume(masterVol)
      setScreen('studio')
    } catch (err) {
      showToast(`오디오 시작 실패: ${err.message}`)
    }
  }

  const selectVoice = (id) => {
    held.current.clear(); setActiveSet(new Set())
    setVoiceId(id)
    engineRef.current.loadVoice(id)
  }

  const changeOctave = (delta) => {
    setBaseOctave((o) => {
      const next = Math.max(1, Math.min(6, o + delta))
      held.current.clear(); setActiveSet(new Set())
      if (engineRef.current.poly) engineRef.current.poly.releaseAll()
      return next
    })
  }

  const onVol = (v) => { setMasterVol(v); engineRef.current.setMasterVolume(v) }
  const onBpm = (v) => { setBpm(v); engineRef.current.setBpm(v); if (metroOn) engineRef.current.setMetronome(true, v) }
  const toggleMetro = () => { const on = !metroOn; setMetroOn(on); engineRef.current.setMetronome(on, bpm) }

  const persist = (list) => { setRecordings(list); try { localStorage.setItem(LS_KEY, JSON.stringify(list)) } catch (e) { /* noop */ } }

  const toggleRecord = () => {
    if (recState === 'recording') {
      const events = engineRef.current.stopRecording()
      setRecState('idle')
      if (events && events.length) {
        const rec = {
          id: Date.now(), name: `녹음 ${recordings.length + 1}`,
          voiceId, baseOctave, events, createdAt: new Date().toISOString(),
        }
        persist([rec, ...recordings])
        showToast('녹음 저장됨')
      }
    } else if (recState === 'idle') {
      engineRef.current.startRecording()
      setRecState('recording')
    }
  }

  const playRec = (rec) => {
    setRecState('playing')
    setVoiceId(rec.voiceId)
    engineRef.current.playRecording(rec, () => {
      setRecState('idle')
      engineRef.current.loadVoice(voiceId)
    })
  }
  const stopPlay = () => { engineRef.current.stopPlayback(); setRecState('idle'); engineRef.current.loadVoice(voiceId) }
  const deleteRec = (id) => persist(recordings.filter((r) => r.id !== id))

  // ---- 렌더 ----
  if (screen === 'splash') {
    return (
      <div className="splash">
        <Particles ref={particlesRef} />
        <div className="splash-inner">
          <div className="brand">
            <span className="brand-top">KARTIER</span>
            <span className="brand-sub">— PIANO STUDIO —</span>
          </div>
          <p className="splash-desc">11 보이스 · 드럼킷 · 2옥타브 · 녹음 · MIDI</p>
          <button className="enter-btn" onClick={enterStudio}>오디오 켜고 입장</button>
          <p className="splash-hint">탭 한 번으로 사운드가 켜집니다</p>
        </div>
        {toast && <div className="toast">{toast}</div>}
      </div>
    )
  }

  return (
    <div className="studio">
      <Particles ref={particlesRef} />

      <header className="topbar">
        <div className="logo">KARTIER<span>°</span></div>
        <div className="ctrls">
          <div className="ctrl">
            <label>VOL</label>
            <input type="range" min="0" max="1" step="0.01" value={masterVol} onChange={(e) => onVol(+e.target.value)} />
          </div>
          <div className="ctrl">
            <label>BPM {bpm}</label>
            <input type="range" min="40" max="220" step="1" value={bpm} onChange={(e) => onBpm(+e.target.value)} />
          </div>
          <button className={`chip ${metroOn ? 'on' : ''}`} onClick={toggleMetro}>메트로놈</button>
          <button className={`chip ${sustainOn ? 'on' : ''}`} onClick={() => { const on = !sustainOn; setSustainOn(on); sustainRef.current = on; engineRef.current.setSustain(on) }}>서스테인</button>
          <div className="octave">
            <button onClick={() => changeOctave(-1)}>−</button>
            <span>OCT {baseOctave}</span>
            <button onClick={() => changeOctave(1)}>＋</button>
          </div>
        </div>
      </header>

      <div className="voice-row">
        {VOICES.map((v) => (
          <button key={v.id} className={`voice ${voiceId === v.id ? 'sel' : ''}`} style={{ '--hue': v.hue }} onClick={() => selectVoice(v.id)}>
            <span className="v-name">{v.name}</span>
            <span className="v-sub">{v.sub}</span>
          </button>
        ))}
        <button className={`voice drum ${voiceId === 'drum' ? 'sel' : ''}`} style={{ '--hue': 5 }} onClick={() => selectVoice('drum')}>
          <span className="v-name">Drum</span>
          <span className="v-sub">드럼킷</span>
        </button>
      </div>

      <main className="stage">
        <Keyboard
          keys={keys}
          mode={mode}
          drumPads={DRUM_META}
          activeSet={activeSet}
          hue={hue}
          registerRef={(pos, el) => { keyEls.current[pos] = el }}
          onPress={pressPos}
          onRelease={releasePos}
          onDrum={drumHit}
        />
      </main>

      <footer className="bottombar">
        <div className="rec-zone">
          <button className={`rec-btn ${recState === 'recording' ? 'recording' : ''}`} onClick={toggleRecord} disabled={recState === 'playing'}>
            {recState === 'recording' ? '■ 정지' : '● 녹음'}
          </button>
          {recState === 'playing' && <button className="rec-btn" onClick={stopPlay}>■ 재생중지</button>}
          <span className="hint">Space = 서스테인 · 흰건반 Tab Q W E R T Y U I O P [ ] \</span>
        </div>
        <div className="rec-list">
          {recordings.length === 0 && <span className="empty">저장된 녹음 없음</span>}
          {recordings.map((r) => (
            <div className="rec-item" key={r.id}>
              <button className="play" onClick={() => playRec(r)} disabled={recState !== 'idle'}>▶</button>
              <span className="rname">{r.name}</span>
              <span className="rmeta">{VOICES.find((v) => v.id === r.voiceId)?.name || r.voiceId}</span>
              <button className="del" onClick={() => deleteRec(r.id)}>✕</button>
            </div>
          ))}
        </div>
      </footer>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
