import { useEffect, useState } from 'react'

export default function SuccessAnimation({ show, onComplete, message = "Uspješno!", subMessage = "" }) {
  const [particles, setParticles] = useState([])
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setVisible(true)
      // Generate confetti particles
      const newParticles = Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 1 + Math.random() * 1,
        color: ['#22d3ee', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#a78bfa'][Math.floor(Math.random() * 6)],
        size: 4 + Math.random() * 6,
        rotation: Math.random() * 360
      }))
      setParticles(newParticles)

      // Auto close
      const timer = setTimeout(() => {
        setVisible(false)
        setTimeout(() => onComplete?.(), 300)
      }, 2500)

      return () => clearTimeout(timer)
    }
  }, [show, onComplete])

  if (!show && !visible) return null

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm" />
      
      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map(particle => (
          <div
            key={particle.id}
            className="absolute animate-confetti"
            style={{
              left: `${particle.x}%`,
              top: '-10px',
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
              transform: `rotate(${particle.rotation}deg)`
            }}
          />
        ))}
      </div>
      
      {/* Success Card */}
      <div className="relative animate-success-pop bg-dark-800 rounded-3xl p-8 mx-4 max-w-sm w-full text-center border border-white/10 shadow-2xl">
        {/* Success Icon */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-cyan-400 flex items-center justify-center mx-auto mb-5 animate-success-check">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        {/* Message */}
        <h2 className="text-2xl font-bold text-white mb-2">{message}</h2>
        {subMessage && (
          <p className="text-dark-400 text-sm">{subMessage}</p>
        )}
        
        {/* Decorative rings */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 border border-cyan-500/20 rounded-full animate-ping-slow" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 border border-cyan-500/10 rounded-full animate-ping-slower" />
        </div>
      </div>
    </div>
  )
}
