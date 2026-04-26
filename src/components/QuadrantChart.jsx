import { useEffect, useRef } from 'react'

const SIZE = 260
const C = SIZE / 2
const PAD = 28
const R = C - PAD

function polarLabel(cx, cy, angle, r, text, sub) {
  const x = cx + r * Math.cos(angle)
  const y = cy + r * Math.sin(angle)
  return { x, y, text, sub }
}

export default function QuadrantChart({ meNet, othersNet, verdict }) {
  const dotRef = useRef(null)
  const maxVal = Math.max(Math.abs(meNet), Math.abs(othersNet), 10)
  const scale = R / maxVal

  const dotX = C + othersNet * scale
  const dotY = C - meNet * scale

  const clampedX = Math.max(PAD + 4, Math.min(SIZE - PAD - 4, dotX))
  const clampedY = Math.max(PAD + 4, Math.min(SIZE - PAD - 4, dotY))

  const dotColor = {
    'strongly-yes': '#34d399',
    yes: '#4ade80',
    neutral: '#fbbf24',
    no: '#fb923c',
    'strongly-no': '#f87171',
    empty: '#64748b',
  }[verdict] || '#64748b'

  // Animate dot
  useEffect(() => {
    if (!dotRef.current) return
    dotRef.current.style.transition = 'cx 0.6s cubic-bezier(0.34,1.56,0.64,1), cy 0.6s cubic-bezier(0.34,1.56,0.64,1)'
    dotRef.current.setAttribute('cx', clampedX)
    dotRef.current.setAttribute('cy', clampedY)
  }, [clampedX, clampedY])

  const labels = [
    polarLabel(C, C, -Math.PI / 2, R + 16, 'Me +', 'benefit'),
    polarLabel(C, C, Math.PI / 2, R + 16, 'Me −', 'harm'),
    polarLabel(C, C, 0, R + 12, '+', 'others'),
    polarLabel(C, C, Math.PI, R + 12, '−', 'others'),
  ]

  const quadrantLabels = [
    { x: C + (R / 2), y: C - (R / 2), text: 'WIN-WIN', color: '#34d39966' },
    { x: C - (R / 2), y: C - (R / 2), text: 'SELFLESS', color: '#60a5fa66' },
    { x: C + (R / 2), y: C + (R / 2), text: 'SELFISH', color: '#fbbf2466' },
    { x: C - (R / 2), y: C + (R / 2), text: 'LOSE-LOSE', color: '#f8717166' },
  ]

  return (
    <div className="glass-card p-4">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 text-center">
        Decision Space
      </h3>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[260px] mx-auto block">
        {/* Quadrant backgrounds */}
        <rect x={C} y={PAD} width={R} height={R} fill="#34d39908" rx="2" />
        <rect x={PAD} y={PAD} width={R} height={R} fill="#60a5fa08" rx="2" />
        <rect x={C} y={C} width={R} height={R} fill="#fbbf2408" rx="2" />
        <rect x={PAD} y={C} width={R} height={R} fill="#f8717108" rx="2" />

        {/* Grid circles */}
        {[0.33, 0.66, 1].map((f) => (
          <circle key={f} cx={C} cy={C} r={R * f} fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 4" />
        ))}

        {/* Axes */}
        <line x1={PAD} y1={C} x2={SIZE - PAD} y2={C} stroke="#334155" strokeWidth="1.5" />
        <line x1={C} y1={PAD} x2={C} y2={SIZE - PAD} stroke="#334155" strokeWidth="1.5" />

        {/* Arrow heads */}
        <polygon points={`${SIZE - PAD},${C} ${SIZE - PAD - 6},${C - 4} ${SIZE - PAD - 6},${C + 4}`} fill="#475569" />
        <polygon points={`${PAD},${C} ${PAD + 6},${C - 4} ${PAD + 6},${C + 4}`} fill="#475569" />
        <polygon points={`${C},${PAD} ${C - 4},${PAD + 6} ${C + 4},${PAD + 6}`} fill="#475569" />
        <polygon points={`${C},${SIZE - PAD} ${C - 4},${SIZE - PAD - 6} ${C + 4},${SIZE - PAD - 6}`} fill="#475569" />

        {/* Quadrant labels */}
        {quadrantLabels.map(({ x, y, text, color }) => (
          <text key={text} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fill={color} fontSize="7.5" fontWeight="700" letterSpacing="0.05em">
            {text}
          </text>
        ))}

        {/* Axis labels */}
        <text x={SIZE - PAD - 2} y={C - 8} textAnchor="end" fill="#64748b" fontSize="8" fontWeight="600">Others +</text>
        <text x={PAD + 2} y={C - 8} textAnchor="start" fill="#64748b" fontSize="8" fontWeight="600">Others −</text>
        <text x={C} y={PAD - 4} textAnchor="middle" fill="#64748b" fontSize="8" fontWeight="600">Me +</text>
        <text x={C} y={SIZE - PAD + 12} textAnchor="middle" fill="#64748b" fontSize="8" fontWeight="600">Me −</text>

        {/* Dot glow */}
        {verdict !== 'empty' && (
          <>
            <circle cx={clampedX} cy={clampedY} r="14" fill={dotColor} opacity="0.12" />
            <circle cx={clampedX} cy={clampedY} r="9" fill={dotColor} opacity="0.18" />
          </>
        )}

        {/* Dot + crosshair lines */}
        {verdict !== 'empty' && (
          <>
            <line x1={clampedX} y1={C} x2={clampedX} y2={clampedY} stroke={dotColor} strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
            <line x1={C} y1={clampedY} x2={clampedX} y2={clampedY} stroke={dotColor} strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
          </>
        )}

        <circle ref={dotRef} cx={clampedX} cy={clampedY} r="6" fill={dotColor} stroke="white" strokeWidth="1.5" />

        {/* Coordinates */}
        {verdict !== 'empty' && (
          <text x={clampedX + 9} y={clampedY - 9} fill={dotColor} fontSize="9" fontWeight="700">
            ({othersNet > 0 ? '+' : ''}{othersNet}, {meNet > 0 ? '+' : ''}{meNet})
          </text>
        )}
      </svg>

      {/* Quadrant legend */}
      <div className="grid grid-cols-2 gap-1.5 mt-3 text-xs">
        {[
          { label: 'Win-Win', color: 'text-emerald-400', desc: 'Good for all' },
          { label: 'Selfless', color: 'text-blue-400', desc: 'You sacrifice' },
          { label: 'Selfish', color: 'text-yellow-400', desc: 'Others pay' },
          { label: 'Lose-Lose', color: 'text-red-400', desc: 'Bad for all' },
        ].map(({ label, color, desc }) => (
          <div key={label} className="flex items-center gap-1.5 bg-slate-800/30 rounded-lg px-2 py-1.5">
            <div className={`font-bold text-xs ${color}`}>{label}</div>
            <div className="text-slate-600 text-xs">{desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
