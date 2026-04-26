const verdictConfig = {
  empty: {
    bg: 'bg-slate-900/50 border-slate-700/50',
    icon: '🧭',
    iconBg: 'bg-slate-800',
    titleColor: 'text-slate-300',
    subtitleColor: 'text-slate-500',
  },
  'strongly-yes': {
    bg: 'bg-emerald-950/60 border-emerald-700/40 border-glow-green',
    icon: '✅',
    iconBg: 'bg-emerald-900/60',
    titleColor: 'text-emerald-300',
    subtitleColor: 'text-emerald-500',
  },
  yes: {
    bg: 'bg-green-950/50 border-green-800/40',
    icon: '✔️',
    iconBg: 'bg-green-900/60',
    titleColor: 'text-green-300',
    subtitleColor: 'text-green-600',
  },
  neutral: {
    bg: 'bg-amber-950/50 border-amber-700/40',
    icon: '⚖️',
    iconBg: 'bg-amber-900/60',
    titleColor: 'text-amber-300',
    subtitleColor: 'text-amber-600',
  },
  no: {
    bg: 'bg-orange-950/50 border-orange-800/40',
    icon: '⚠️',
    iconBg: 'bg-orange-900/60',
    titleColor: 'text-orange-300',
    subtitleColor: 'text-orange-600',
  },
  'strongly-no': {
    bg: 'bg-red-950/60 border-red-700/40 border-glow-red',
    icon: '❌',
    iconBg: 'bg-red-900/60',
    titleColor: 'text-red-300',
    subtitleColor: 'text-red-500',
  },
}

const reasonIconMap = {
  positive: { icon: '↑', cls: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/50' },
  negative: { icon: '↓', cls: 'text-red-400 bg-red-950/60 border-red-800/50' },
  neutral: { icon: '→', cls: 'text-slate-400 bg-slate-800/60 border-slate-700/50' },
}

export default function Recommendation({ recommendation }) {
  const config = verdictConfig[recommendation.verdict] || verdictConfig.empty

  return (
    <div className={`glass-card border ${config.bg} p-6 animate-slide-up`}>
      {/* Verdict header */}
      <div className="flex items-start gap-4 mb-5">
        <div className={`${config.iconBg} rounded-2xl w-14 h-14 flex items-center justify-center text-2xl shrink-0`}>
          {config.icon}
        </div>
        <div>
          <h3 className={`text-xl font-extrabold ${config.titleColor} mb-1`}>{recommendation.title}</h3>
          <p className={`text-sm ${config.subtitleColor} leading-relaxed`}>{recommendation.subtitle}</p>
        </div>
      </div>

      {/* Reasons list */}
      {recommendation.reasons.length > 0 && (
        <div className="space-y-2 mb-5">
          {recommendation.reasons.map((r, i) => {
            const { icon, cls } = reasonIconMap[r.type] || reasonIconMap.neutral
            return (
              <div key={i} className={`flex items-start gap-3 rounded-xl border px-3 py-2 ${cls}`}>
                <span className="font-bold text-base mt-px shrink-0">{icon}</span>
                <span className="text-sm leading-relaxed text-slate-200">{r.text}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Philosophical quote */}
      {recommendation.quote && (
        <div className="border-t border-slate-800 pt-4 text-center">
          <p className="text-slate-500 text-sm italic leading-relaxed">
            &ldquo;{recommendation.quote}&rdquo;
          </p>
        </div>
      )}
    </div>
  )
}
