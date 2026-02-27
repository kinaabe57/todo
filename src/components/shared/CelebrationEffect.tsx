import { useEffect, useRef } from 'react'

const COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']

interface CelebrationEffectProps {
  originX?: number
  originY?: number
}

export default function CelebrationEffect({ originX, originY }: CelebrationEffectProps) {
  const hasRun = useRef(false)
  const centerX = originX ?? window.innerWidth / 2
  const centerY = originY ?? window.innerHeight / 2

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true
    
    // Inject global styles once
    const styleId = 'celebration-styles'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        .celebration-particle {
          position: fixed !important;
          pointer-events: none !important;
          z-index: 2147483647 !important;
          will-change: transform, opacity;
        }
        .celebration-burst {
          position: fixed !important;
          pointer-events: none !important;
          z-index: 2147483646 !important;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(74, 222, 128, 0.9) 0%, transparent 70%);
          animation: celebration-burst-anim 0.5s ease-out forwards;
        }
        @keyframes celebration-burst-anim {
          from { transform: scale(0); opacity: 1; }
          to { transform: scale(4); opacity: 0; }
        }
      `
      document.head.appendChild(style)
    }

    // Create container
    const container = document.createElement('div')
    container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2147483647;'
    document.body.appendChild(container)

    // Create burst
    const burst = document.createElement('div')
    burst.className = 'celebration-burst'
    burst.style.cssText = `left:${centerX - 40}px;top:${centerY - 40}px;width:80px;height:80px;`
    container.appendChild(burst)

    // Create particles
    const particles: HTMLElement[] = []
    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('div')
      particle.className = 'celebration-particle'
      
      const color = COLORS[i % COLORS.length]
      const size = 8 + Math.random() * 8
      const angle = (Math.PI * 2 * i) / 30
      const velocity = 100 + Math.random() * 120
      const endX = Math.cos(angle) * velocity
      const endY = Math.sin(angle) * velocity - 80
      const rotation = Math.random() * 720 - 360
      const duration = 800 + Math.random() * 400
      
      particle.style.cssText = `
        left: ${centerX}px;
        top: ${centerY}px;
        width: ${size}px;
        height: ${size}px;
        background-color: ${color};
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        box-shadow: 0 0 ${size}px ${color};
        transform: translate(-50%, -50%);
        transition: all ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
      `
      
      container.appendChild(particle)
      particles.push(particle)
      
      // Trigger animation after append
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          particle.style.transform = `translate(calc(-50% + ${endX}px), calc(-50% + ${endY}px)) rotate(${rotation}deg) scale(0.3)`
          particle.style.opacity = '0'
        })
      })
    }

    // Create stars
    for (let i = 0; i < 5; i++) {
      const star = document.createElement('div')
      star.className = 'celebration-particle'
      const offsetX = (Math.random() - 0.5) * 200
      const offsetY = (Math.random() - 0.5) * 160
      
      star.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="#FBBF24" style="filter: drop-shadow(0 0 4px #FBBF24);"><path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/></svg>`
      star.style.cssText = `
        left: ${centerX + offsetX}px;
        top: ${centerY + offsetY}px;
        transform: translate(-50%, -50%) scale(0);
        transition: transform 0.4s ease-out ${i * 60}ms;
      `
      container.appendChild(star)
      
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          star.style.transform = 'translate(-50%, -50%) scale(1.2)'
          setTimeout(() => {
            star.style.transition = 'transform 0.3s ease-in, opacity 0.3s ease-in'
            star.style.transform = 'translate(-50%, -50%) scale(0)'
            star.style.opacity = '0'
          }, 300 + i * 60)
        })
      })
    }

    // Cleanup
    setTimeout(() => {
      container.remove()
    }, 1500)

  }, [centerX, centerY])

  return null
}
