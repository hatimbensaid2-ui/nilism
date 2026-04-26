import { useEffect, useState } from 'react'

function AnimatedBar({ value, max, color, label, arabicLabel }) {
  const [width, setWidth] = useState(0)
  const pct = max === 0 ? 0 : Math.min(100, (value / max) * 100)

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 80)
    return () => clearTimeout(t)
  }, [pct])

  const colorMap = {
    emerald: 'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-emerald-500/30',
    red: 'bg-gradient-to-r from-red-700 to-red-400 shadow-red-500/30',
  }

  return (
    <div className="flex items-center gap-4">
      <div className="w-28 text-right shrink-0">
        <div className={`font-semibold text-sm ${color === 'emerald' ? 'text-emerald-400' : 'text-red-400'}`}>
          {label}
        </div>
        <div className="text-slate-600 text-xs font-arabic">{arabicLabel}</div>
      </div>
      <div className="flex-1 relative h-10 bg-slate-800/60 rounded-xl overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-xl shadow-lg bar-animate ${colorMap[color]}`}
          style={{ width: `${width}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-center font-bold text-lg text-white drop-shadow">
          {value}
        </span>
      </div>
    </div>
  )
}

export default function ResultChart({ totals }) {
  const { totalBenefit, totalHarm, onMeBenefit, onMeHarm, onOthersBenefit, onOthersHarm } = totals
  const max = Math.max(totalBenefit, totalHarm, 1)
  const net = totalBenefit - totalHarm

  return (
    <div className="glass-card p-6 animate-slide-up">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-5 text-center">
        Overall Scores
      </h3>

      <div className="space-y-3 mb-6">
        <AnimatedBar value={totalBenefit} max={max} color="emerald" label="Total Benefit" arabicLabel="المنفعة الكلية" />
        <AnimatedBar value={totalHarm} max={max} color="red" label="Total Harm" arabicLabel="الضرر الكلي" />
      </div>

      {/* Net score */}
      <div className="text-center mb-6">
        <div className={`text-5xl font-extrabold ${net > 0 ? 'text-emerald-400' : net < 0 ? 'text-red-400' : 'text-amber-400'}`}>
          {net > 0 ? '+' : ''}{net}
        </div>
        <div className="text-slate-500 text-xs uppercase tracking-widest mt-1">Net Score</div>
      </div>

      {/* Breakdown mini-bars */}
      <div className="grid grid-cols-2 gap-3 border-t border-slate-800 pt-4">
        {[
          { label: 'On Me', arabic: 'على', benefit: onMeBenefit, harm: onMeHarm },
          { label: 'On Others', arabic: 'على الآخرين', benefit: onOthersBenefit, harm: onOthersHarm },
        ].map(({ label, arabic, benefit, harm }) => (
          <div key={label} className="bg-slate-800/40 rounded-xl p-3">
            <div className="text-center mb-2">
              <span className="text-xs font-semibold text-slate-300">{label}</span>
              <span className="block text-xs text-slate-600 font-arabic">{arabic}</span>
            </div>
            <div className="flex justify-around">
              <div className="text-center">
                <div className="text-emerald-400 font-bold text-lg">{benefit}</div>
                <div className="text-emerald-800 text-xs">benefit</div>
              </div>
              <div className="w-px bg-slate-700" />
              <div className="text-center">
                <div className="text-red-400 font-bold text-lg">{harm}</div>
                <div className="text-red-900 text-xs">harm</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
