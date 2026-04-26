import { useState } from 'react'

function NumberInput({ value, onChange, type }) {
  return (
    <input
      type="number"
      min="0"
      max="100"
      value={value === 0 ? '' : value}
      placeholder="0"
      onChange={(e) => onChange(Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)))}
      className={type === 'benefit' ? 'benefit-input' : 'harm-input'}
    />
  )
}

function WeightPip({ value, onChange }) {
  return (
    <div className="flex gap-0.5 justify-center">
      {[1, 2, 3].map((w) => (
        <button
          key={w}
          onClick={() => onChange(w)}
          title={`Weight ×${w}`}
          className={`w-2 h-2 rounded-full transition-all ${
            value >= w ? 'bg-slate-400' : 'bg-slate-700'
          }`}
        />
      ))}
    </div>
  )
}

export default function EvaluationPanel({ title, arabicTitle, icon, rows, onChange, onAdd, onRemove, accentColor }) {
  const [newLabel, setNewLabel] = useState('')

  const totalBenefit = rows.reduce((s, r) => s + (r.benefit || 0) * (r.weight || 1), 0)
  const totalHarm = rows.reduce((s, r) => s + (r.harm || 0) * (r.weight || 1), 0)
  const net = totalBenefit - totalHarm

  const accent = {
    cyan: 'from-cyan-500/20 to-transparent border-cyan-700/30 text-cyan-300',
    violet: 'from-violet-500/20 to-transparent border-violet-700/30 text-violet-300',
  }[accentColor] || 'from-slate-700/20 to-transparent border-slate-700/30 text-slate-300'

  const handleAdd = () => {
    const label = newLabel.trim() || 'Custom'
    onAdd(label)
    setNewLabel('')
  }

  return (
    <div className="glass-card overflow-hidden flex flex-col">
      {/* Header */}
      <div className={`bg-gradient-to-b ${accent} border-b border-slate-800/60 px-5 py-4 flex items-center gap-3`}>
        <span className="text-2xl">{icon}</span>
        <div>
          <h2 className="font-bold text-white text-base">{title}</h2>
          <p className="text-xs text-slate-500 font-arabic">{arabicTitle}</p>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_1fr_auto_1fr] gap-1 px-3 pt-3 pb-1 border-b border-slate-800/40">
        <div className="text-center">
          <span className="text-emerald-400 font-semibold text-xs uppercase tracking-wide flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />Benefit
          </span>
          <div className="text-slate-700 text-xs font-arabic">المنفعة</div>
        </div>
        <div className="text-center">
          <span className="text-red-400 font-semibold text-xs uppercase tracking-wide flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />Harm
          </span>
          <div className="text-slate-700 text-xs font-arabic">الضرر</div>
        </div>
        <div />
        <div className="text-right text-slate-600 text-xs uppercase tracking-wide pr-1">
          Category
          <div className="text-slate-700 font-normal font-arabic">الفئة</div>
        </div>
      </div>

      {/* Rows */}
      <div className="flex-1 divide-y divide-slate-800/30">
        {rows.map((row) => (
          <div key={row.id} className="grid grid-cols-[1fr_1fr_auto_1fr] gap-1 items-center px-3 py-2.5 group">
            <NumberInput value={row.benefit} onChange={(v) => onChange(row.id, 'benefit', v)} type="benefit" />
            <NumberInput value={row.harm} onChange={(v) => onChange(row.id, 'harm', v)} type="harm" />
            <div className="px-1">
              <WeightPip value={row.weight || 1} onChange={(w) => onChange(row.id, 'weight', w)} />
            </div>
            <div className="text-right pr-1 flex items-center justify-end gap-1.5">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-300 text-sm truncate">{row.label}</div>
                {row.arabic && <div className="text-xs text-slate-600 font-arabic truncate">{row.arabic}</div>}
              </div>
              {rows.length > 1 && (
                <button
                  onClick={() => onRemove(row.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all text-xs shrink-0"
                  title="Remove row"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add row */}
      <div className="border-t border-slate-800/50 px-3 py-2 flex gap-2">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Add criterion..."
          className="flex-1 bg-slate-800/40 border border-slate-700/40 rounded-lg px-3 py-1.5
                     text-slate-400 text-xs placeholder-slate-600 focus:outline-none
                     focus:ring-1 focus:ring-slate-500 focus:text-slate-200 transition-all"
        />
        <button
          onClick={handleAdd}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700
                     text-slate-400 hover:text-white text-xs font-medium transition-all"
        >
          + Add
        </button>
      </div>

      {/* Weight hint */}
      <div className="px-3 pb-1.5 text-center text-slate-700 text-xs">
        dots = weight ×1 ×2 ×3
      </div>

      {/* Subtotals */}
      <div className="border-t border-slate-800 grid grid-cols-3 divide-x divide-slate-800">
        <div className="px-3 py-2.5 text-center">
          <div className="text-emerald-400 text-xl font-bold tabular-nums">{totalBenefit}</div>
          <div className="text-emerald-800 text-xs uppercase tracking-wide">Benefit</div>
        </div>
        <div className="px-3 py-2.5 text-center">
          <div className="text-red-400 text-xl font-bold tabular-nums">{totalHarm}</div>
          <div className="text-red-800 text-xs uppercase tracking-wide">Harm</div>
        </div>
        <div className="px-3 py-2.5 text-center">
          <div className={`text-xl font-bold tabular-nums ${net > 0 ? 'text-emerald-300' : net < 0 ? 'text-red-300' : 'text-slate-400'}`}>
            {net > 0 ? '+' : ''}{net}
          </div>
          <div className="text-slate-600 text-xs uppercase tracking-wide">Net</div>
        </div>
      </div>
    </div>
  )
}
