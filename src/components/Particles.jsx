import { useRef, useImperativeHandle, forwardRef, useEffect } from 'react'

const Particles = forwardRef(function Particles(_, ref) {
  const canvasRef = useRef(null)
  const particles = useRef([])
  const raf = useRef(null)

  useImperativeHandle(ref, () => ({
    burst(x, y, hue) {
      const n = 14
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i) / n + Math.random() * 0.4
        const speed = 1.5 + Math.random() * 3.5
        particles.current.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5,
          life: 1,
          size: 2 + Math.random() * 3,
          hue,
        })
      }
    },
  }))

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const resize = () => {
      canvas.width = canvas.offsetWidth * devicePixelRatio
      canvas.height = canvas.offsetHeight * devicePixelRatio
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const tick = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
      const arr = particles.current
      for (let i = arr.length - 1; i >= 0; i--) {
        const p = arr[i]
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.12
        p.vx *= 0.98
        p.life -= 0.022
        if (p.life <= 0) { arr.splice(i, 1); continue }
        ctx.globalAlpha = p.life
        ctx.fillStyle = `hsl(${p.hue}, 90%, ${55 + p.life * 20}%)`
        ctx.shadowBlur = 12
        ctx.shadowColor = `hsl(${p.hue}, 95%, 60%)`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      ctx.shadowBlur = 0
      raf.current = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 50 }}
    />
  )
})

export default Particles
