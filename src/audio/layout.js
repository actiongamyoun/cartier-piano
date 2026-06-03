// 24키 (2옥타브) 레이아웃. 각 키의 반음 오프셋(베이스 C 기준), 검은건반 여부, PC 키.
// 검증된 매핑:
//   흰건반(14): Tab Q W E R T Y U I O P [ ] \
//   검은건반(8): 2 3 5 6 7 9 0 =
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// position -> pcKey (없으면 null)
const PC_BY_POS = {
  0: 'Tab', 1: '2', 2: 'q', 3: '3', 4: 'w', 5: 'e', 6: '5', 7: 'r', 8: '6',
  9: 't', 10: '7', 11: 'y', 12: 'u', 13: '9', 14: 'i', 15: '0', 16: 'o',
  17: 'p', 18: '=', 19: '[', 20: null, 21: ']', 22: null, 23: '\\',
}

const DRUM_KEYS = ['Tab', 'q', 'w', 'e', 'r', 't', 'y', 'u'] // 드럼 8패드용 PC키

export function buildKeys(baseOctave) {
  const keys = []
  for (let s = 0; s < 24; s++) {
    const name = NOTE_NAMES[s % 12]
    const octave = baseOctave + Math.floor(s / 12)
    const isBlack = name.includes('#')
    keys.push({
      pos: s,
      note: `${name}${octave}`,
      label: name,
      isBlack,
      pcKey: PC_BY_POS[s],
    })
  }
  return keys
}

// 이벤트 키 문자 -> position
export function pcKeyToPos(rawKey) {
  let k = rawKey
  if (k === 'Tab') return 0
  k = k.length === 1 ? k.toLowerCase() : k
  for (const [pos, pc] of Object.entries(PC_BY_POS)) {
    if (pc === k) return Number(pos)
  }
  return -1
}

// 드럼 모드: PC키 -> 패드 index
export function pcKeyToPad(rawKey) {
  let k = rawKey === 'Tab' ? 'Tab' : rawKey.toLowerCase()
  const idx = DRUM_KEYS.indexOf(k)
  return idx
}
