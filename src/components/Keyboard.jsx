import { useMemo } from 'react'

export default function Keyboard({ keys, mode, drumPads, activeSet, hue, registerRef, onPress, onRelease, onDrum }) {
  // 흰건반 인덱스 및 검은건반의 '앞 흰건반 인덱스' 계산
  const layout = useMemo(() => {
    const whites = []
    const blacks = []
    let lastWhiteIndex = -1
    keys.forEach((k) => {
      if (!k.isBlack) {
        lastWhiteIndex += 1
        whites.push({ ...k, whiteIndex: lastWhiteIndex })
      } else {
        blacks.push({ ...k, precedingWhite: lastWhiteIndex })
      }
    })
    return { whites, blacks }
  }, [keys])

  const W = 100 / layout.whites.length // 흰건반 폭(%)
  const bw = W * 0.62                   // 검은건반 폭(%)

  if (mode === 'drum') {
    return (
      <div className="pad-grid">
        {drumPads.map((pad, i) => (
          <button
            key={i}
            ref={(el) => registerRef(i, el)}
            className={`drum-pad ${activeSet.has(i) ? 'active' : ''}`}
            style={{ '--hue': pad.hue }}
            onPointerDown={(e) => { e.preventDefault(); onDrum(i) }}
          >
            <span className="pad-name">{pad.name}</span>
            <span className="pad-key">{['Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U'][i]}</span>
          </button>
        ))}
      </div>
    )
  }

  const press = (e, pos) => { e.preventDefault(); onPress(pos) }
  const release = (pos) => onRelease(pos)

  return (
    <div className="keyboard" style={{ '--hue': hue }}>
      {/* 흰건반 */}
      <div className="white-row">
        {layout.whites.map((k) => (
          <div
            key={k.pos}
            ref={(el) => registerRef(k.pos, el)}
            className={`key white ${activeSet.has(k.pos) ? 'active' : ''}`}
            onPointerDown={(e) => press(e, k.pos)}
            onPointerUp={() => release(k.pos)}
            onPointerLeave={() => release(k.pos)}
            onPointerCancel={() => release(k.pos)}
          >
            {k.pcKey && <span className="key-hint">{k.pcKey === 'Tab' ? 'Tab' : k.pcKey.toUpperCase()}</span>}
            <span className="key-note">{k.note}</span>
          </div>
        ))}
      </div>
      {/* 검은건반 */}
      {layout.blacks.map((k) => (
        <div
          key={k.pos}
          ref={(el) => registerRef(k.pos, el)}
          className={`key black ${activeSet.has(k.pos) ? 'active' : ''}`}
          style={{ left: `calc(${(k.precedingWhite + 1) * W}% - ${bw / 2}%)`, width: `${bw}%` }}
          onPointerDown={(e) => press(e, k.pos)}
          onPointerUp={() => release(k.pos)}
          onPointerLeave={() => release(k.pos)}
          onPointerCancel={() => release(k.pos)}
        >
          {k.pcKey && <span className="key-hint-black">{k.pcKey}</span>}
        </div>
      ))}
    </div>
  )
}
