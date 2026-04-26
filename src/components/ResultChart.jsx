import { useEffect, useState } from 'react'

function AnimatedBar({ value, max, color, label, arabicLabel, note }) {
  const [width, setWidth] = useState(0)
  const pct = max === 0 ? 0 : Math.min(100, (value / max) * 100)

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 80)
    return () => clearTimeout(t)
  }, [pct])

  const colorMap = {
    emerald: 'bg-gradient-to-r from-emerald-700 to-emerald-400 shadow-emerald-500/20',
    red: 'bg-gradient-to-r from-red-800 to-red-400 shadow-red-500/20',
  }

  return (
    <div className="flex items-center gap-3">
      <div className="w-28 text-right shrink-0">
        <div className={`font-semibold text-sm ${color === 'emerald' ? 'text-emerald-400' : 'text-red-400'}`}>{label}</div>
        <div className="text-slate-700 text-xs font-arabic">{arabicLabel}</div>
        {note && <div className="text-slate-600 text-xs">{note}</div>}
      </div>
      <div className="flex-1 relative h-10 bg-slate-800/60 rounded-xl overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-xl shadow-lg bar-animate ${colorMap[color]}`}
          style={{ width: `${width}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-center font-bold text-lg text-white drop-shadow tabular-nums">
          {value}
        </span>
      </div>
    </div>
  )
}

function DonutSegment({ pct, color, strokeWidth = 10, offset, r }) {
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <circle
      cx="50" cy="50" r={r}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeDasharray={`${dash} ${circ}`}
      strokeDashoffset={-offset}
      strokeLinecap="round"
      style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.34,1.56,0.64,1)' }}
    />
  )
}

function DonutChart({ totalBenefit, totalHarm }) {
  const total = totalBenefit + totalHarm || 1
  const benefitPct = (totalBenefit / total) * 100
  const harmPct = (totalHarm / total) * 100
  const r = 32
  const circ = 2 * Math.PI * r
  const gap = 2

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="w-20 h-20 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
        <DonutSegment pct={benefitPct} color="#34d399" r={r} offset={0} />
        <DonutSegment pct={harmPct} color="#f87171" r={r} offset={-(benefitPct / 100) * circ + gap} />
      </svg>
      <div className="space-y-1.5 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span className="text-slate-300">Benefit <span className="text-emerald-400 font-bold">{totalBenefit}</span></span>
          <span className="text-slate-600 text-xs">({Math.round(benefitPct)}%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
          <span className="text-slate-300">Harm <span className="text-red-400 font-bold">{totalHarm}</span></span>
          <span className="text-slate-600 text-xs">({Math.round(harmPct)}%)</span>
        </div>
      </div>
    </div>
  )
}

export default function ResultChart({ totals }) {
  const { totalBenefit, totalHarm, onMeBenefit, onMeHarm, onOthersBenefit, onOthersHarm } = totals
  const max = Math.max(totalBenefit, totalHarm, 1)
  const net = totalBenefit - totalHarm

  return (
    <div className="glass-card p-5 animate-slide-up space-y-5">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest text-center">
        Overall Scores
      </h3>

      {/* Donut + net */}
      <div className="flex items-center justify-between">
        <DonutChart totalBenefit={totalBenefit} totalHarm={totalHarm} />
        <div className="text-center">
          <div className={`text-5xl font-extrabold tabular-nums ${net > 0 ? 'text-emerald-400' : net < 0 ? 'text-red-400' : 'text-amber-400'}`}>
            {net > 0 ? '+' : ''}{net}
          </div>
          <div className="text-slate-600 text-xs uppercase tracking-widest mt-1">Net Score</div>
        </div>
      </div>

      {/* Bars */}
      <div className="space-y-2.5">
        <AnimatedBar value={totalBenefit} max={max} color="emerald" label="Total Benefit" arabicLabel="المنفعة الكلية" />
        <AnimatedBar value={totalHarm} max={max} color="red" label="Total Harm" arabicLabel="الضرر الكلي" />
      </div>

      {/* Per-perspective breakdown */}
      <div className="grid grid-cols-2 gap-2.5 border-t border-slate-800 pt-4">
        {[
          { label: 'On Me', arabic: 'على', benefit: onMeBenefit, harm: onMeHarm, icon: '🪞' },
          { label: 'On Others', arabic: 'على الآخرين', benefit: onOthersBenefit, harm: onOthersHarm, icon: '🌐' },
        ].map(({ label, arabic, benefit, harm, icon }) => {
          const pNet = benefit - harm
          return (
            <div key={label} className="bg-slate-800/40 rounded-xl p-3">
              <div className="text-center mb-2 flex items-center justify-center gap-1.5">
                <span>{icon}</span>
                <div>
                  <span className="text-xs font-semibold text-slate-300">{label}</span>
                  <span className="block text-xs text-slate-700 font-arabic">{arabic}</span>
                </div>
              </div>
              <div className="flex justify-around items-center">
                <div className="text-center">
                  <div className="text-emerald-400 font-bold text-base tabular-nums">{benefit}</div>
                  <div className="text-emerald-900 text-xs">benefit</div>
                </div>
                <div className={`text-center font-bold text-xs ${pNet > 0 ? 'text-emerald-500' : pNet < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                  {pNet > 0 ? '+' : ''}{pNet}
                </div>
                <div className="text-center">
                  <div className="text-red-400 font-bold text-base tabular-nums">{harm}</div>
                  <div className="text-red-900 text-xs">harm</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
