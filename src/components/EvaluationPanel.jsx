function NumberInput({ value, onChange, type }) {
  const cls = type === 'benefit' ? 'benefit-input' : 'harm-input'
  return (
    <input
      type="number"
      min="0"
      max="100"
      value={value === 0 ? '' : value}
      placeholder="0"
      onChange={(e) => {
        const v = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0))
        onChange(v)
      }}
      className={cls}
    />
  )
}

function CategoryRow({ label, arabicLabel, benefit, harm, onBenefitChange, onHarmChange }) {
  return (
    <tr className="border-b border-slate-800/50 last:border-0">
      <td className="py-3 px-3 text-center">
        <NumberInput value={benefit} onChange={onBenefitChange} type="benefit" />
      </td>
      <td className="py-3 px-3 text-center">
        <NumberInput value={harm} onChange={onHarmChange} type="harm" />
      </td>
      <td className="py-3 px-4 text-right">
        <div className="font-medium text-slate-300 text-sm">{label}</div>
        <div className="text-xs text-slate-600 font-arabic">{arabicLabel}</div>
      </td>
    </tr>
  )
}

export default function EvaluationPanel({ title, arabicTitle, icon, data, onChange, accentColor }) {
  const totalBenefit = (data.moral.benefit || 0) + (data.material.benefit || 0)
  const totalHarm = (data.moral.harm || 0) + (data.material.harm || 0)

  const accent = {
    cyan: 'from-cyan-500/20 to-transparent border-cyan-700/30 text-cyan-400',
    violet: 'from-violet-500/20 to-transparent border-violet-700/30 text-violet-400',
  }[accentColor] || 'from-slate-700/20 to-transparent border-slate-700/30 text-slate-400'

  return (
    <div className="glass-card overflow-hidden flex flex-col">
      {/* Panel header */}
      <div className={`bg-gradient-to-b ${accent} border-b px-5 py-4 flex items-center gap-3`}>
        <span className="text-2xl">{icon}</span>
        <div>
          <h2 className="font-bold text-white text-base">{title}</h2>
          <p className="text-xs text-slate-500 font-arabic">{arabicTitle}</p>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="py-2 px-3 text-center">
                <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-xs uppercase tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  Benefit
                </span>
                <div className="text-slate-600 text-xs font-arabic font-normal">المنفعة</div>
              </th>
              <th className="py-2 px-3 text-center">
                <span className="inline-flex items-center gap-1 text-red-400 font-semibold text-xs uppercase tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                  Harm
                </span>
                <div className="text-slate-600 text-xs font-arabic font-normal">الضرر</div>
              </th>
              <th className="py-2 px-4 text-right text-slate-500 font-medium text-xs uppercase tracking-wide">
                Category
              </th>
            </tr>
          </thead>
          <tbody>
            <CategoryRow
              label="Moral"
              arabicLabel="محتوي"
              benefit={data.moral.benefit}
              harm={data.moral.harm}
              onBenefitChange={(v) => onChange('moral', 'benefit', v)}
              onHarmChange={(v) => onChange('moral', 'harm', v)}
            />
            <CategoryRow
              label="Material"
              arabicLabel="مادي"
              benefit={data.material.benefit}
              harm={data.material.harm}
              onBenefitChange={(v) => onChange('material', 'benefit', v)}
              onHarmChange={(v) => onChange('material', 'harm', v)}
            />
          </tbody>
        </table>
      </div>

      {/* Subtotals */}
      <div className="border-t border-slate-800 grid grid-cols-2 divide-x divide-slate-800">
        <div className="px-4 py-3 text-center">
          <div className="text-emerald-400 text-xl font-bold">{totalBenefit}</div>
          <div className="text-emerald-700 text-xs uppercase tracking-wide">Total Benefit</div>
        </div>
        <div className="px-4 py-3 text-center">
          <div className="text-red-400 text-xl font-bold">{totalHarm}</div>
          <div className="text-red-700 text-xs uppercase tracking-wide">Total Harm</div>
        </div>
      </div>
    </div>
  )
}
