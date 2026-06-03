import { useState, useEffect, useRef } from 'react'
import * as Tone from 'tone'

export default function App() {
  const [screen, setScreen] = useState('splash') // 'splash' | 'piano'
  const [logs, setLogs] = useState([])
  const synthRef = useRef(null)

  const log = (msg, type = 'info') => {
    setLogs((prev) => [...prev, { msg, type, t: new Date().toLocaleTimeString() }])
  }

  // MessagePort 같은 비동기 워클릿 에러는 try/catch로 안 잡힙니다.
  // 전역 리스너로 화면에 띄워서 콘솔 없이도 원인을 봅니다.
  useEffect(() => {
    const onErr = (e) => log(`전역 에러: ${e.message || e.error?.message || e}`, 'error')
    const onRej = (e) => log(`Promise 거부: ${e.reason?.message || e.reason}`, 'error')
    window.addEventListener('error', onErr)
    window.addEventListener('unhandledrejection', onRej)
    return () => {
      window.removeEventListener('error', onErr)
      window.removeEventListener('unhandledrejection', onRej)
    }
  }, [])

  // 1단계 핵심: splash → piano 전환 + Tone.start()
  const handleStart = async () => {
    log('Tone.start() 호출...')
    try {
      await Tone.start()
      log(`Tone.start() 성공. context state = ${Tone.getContext().state}`, 'ok')
      log(`Tone 버전 = ${Tone.version}`, 'ok')
      setScreen('piano') // ← 여기서 전환. start()가 throw하면 여기 도달 못 함.
    } catch (err) {
      log(`Tone.start() 실패: ${err.message}`, 'error')
    }
  }

  // 기본 Synth (AudioWorklet 미사용) — 베이스라인 검증
  const playBasic = () => {
    try {
      if (!synthRef.current) {
        synthRef.current = new Tone.Synth().toDestination()
        log('Tone.Synth 생성 성공', 'ok')
      }
      synthRef.current.triggerAttackRelease('C4', '8n')
      log('C4 재생 (기본 Synth)', 'ok')
    } catch (err) {
      log(`기본 Synth 에러: ${err.message}`, 'error')
    }
  }

  // 격리 테스트: PluckSynth (AudioWorklet 사용 — 확정 용의자)
  const testPluck = () => {
    try {
      const pluck = new Tone.PluckSynth().toDestination()
      log('PluckSynth 생성 성공', 'ok')
      pluck.triggerAttackRelease('C4', '8n')
      log('C4 재생 (PluckSynth)', 'ok')
    } catch (err) {
      log(`PluckSynth 에러: ${err.message}`, 'error')
    }
  }

  if (screen === 'splash') {
    return (
      <div style={S.center}>
        <h1 style={{ color: '#fff' }}>🎹 Tone.js 최소 진단</h1>
        <p style={{ color: '#aaa' }}>아래 버튼을 누르면 오디오를 켜고 피아노 화면으로 넘어갑니다.</p>
        <button style={S.bigBtn} onClick={handleStart}>시작 (오디오 켜기)</button>
        <LogPanel logs={logs} />
      </div>
    )
  }

  return (
    <div style={S.center}>
      <h2 style={{ color: '#fff' }}>피아노 화면 진입 성공 ✅</h2>
      <div style={{ display: 'flex', gap: 12 }}>
        <button style={S.btn} onClick={playBasic}>기본 Synth 재생 (C4)</button>
        <button style={{ ...S.btn, background: '#5a2d2d' }} onClick={testPluck}>
          PluckSynth 테스트 (용의자)
        </button>
      </div>
      <LogPanel logs={logs} />
    </div>
  )
}

function LogPanel({ logs }) {
  return (
    <div style={S.logPanel}>
      {logs.length === 0 && <div style={{ color: '#666' }}>로그 대기 중...</div>}
      {logs.map((l, i) => (
        <div key={i} style={{ color: l.type === 'error' ? '#ff6b6b' : l.type === 'ok' ? '#51cf66' : '#ccc' }}>
          [{l.t}] {l.msg}
        </div>
      ))}
    </div>
  )
}

const S = {
  center: {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 16,
    background: '#0a0a0f', fontFamily: 'system-ui, sans-serif', padding: 20,
  },
  bigBtn: {
    padding: '16px 32px', fontSize: 18, borderRadius: 12, border: 'none',
    background: '#2d4a5a', color: '#fff', cursor: 'pointer',
  },
  btn: {
    padding: '12px 20px', fontSize: 15, borderRadius: 10, border: 'none',
    background: '#2d4a5a', color: '#fff', cursor: 'pointer',
  },
  logPanel: {
    marginTop: 16, width: 'min(520px, 90vw)', maxHeight: 240, overflowY: 'auto',
    background: '#111', borderRadius: 8, padding: 12, fontFamily: 'monospace',
    fontSize: 13, lineHeight: 1.6,
  },
}
