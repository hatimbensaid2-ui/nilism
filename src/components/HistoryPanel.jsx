import { useState } from 'react'

const verdictStyles = {
  'strongly-yes': 'bg-emerald-900/60 border-emerald-700/50 text-emerald-300',
  yes: 'bg-green-900/50 border-green-700/40 text-green-300',
  neutral: 'bg-amber-900/40 border-amber-700/40 text-amber-300',
  no: 'bg-orange-900/40 border-orange-700/40 text-orange-300',
  'strongly-no': 'bg-red-900/50 border-red-700/40 text-red-300',
  empty: 'bg-slate-800/50 border-slate-700 text-slate-400',
}

const verdictEmoji = {
  'strongly-yes': '✅', yes: '✔️', neutral: '⚖️', no: '⚠️', 'strongly-no': '❌', empty: '🧭',
}

function HistoryItem({ entry, onLoad, onDelete }) {
  const style = verdictStyles[entry.verdict] || verdictStyles.empty
  const emoji = verdictEmoji[entry.verdict] || '🧭'
  const date = new Date(entry.savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`flex items-center gap-2 border rounded-xl px-3 py-2 shrink-0 max-w-[220px] ${style}`}>
      <span className="text-base shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{entry.decision || 'Untitled'}</div>
        <div className="text-xs opacity-60 flex gap-2">
          <span>Net {entry.net > 0 ? '+' : ''}{entry.net}</span>
          <span>·</span>
          <span>{date}</span>
        </div>
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        <button onClick={() => onLoad(entry)} className="text-slate-400 hover:text-white text-xs transition-colors px-1" title="Load">↩</button>
        <button onClick={() => onDelete(entry.id)} className="text-slate-600 hover:text-red-400 text-xs transition-colors px-1" title="Delete">✕</button>
      </div>
    </div>
  )
}

export default function HistoryPanel({ history, onLoad, onDelete, onSave, canSave }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="max-w-5xl mx-auto px-4 mb-6">
      <div className="flex items-center gap-3">
        {/* Save button */}
        <button
          onClick={onSave}
          disabled={!canSave}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700
                     hover:border-slate-500 text-slate-300 text-sm font-medium transition-all disabled:opacity-40
                     disabled:cursor-not-allowed shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          Save
        </button>

        {/* Toggle history */}
        {history.length > 0 && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800
                       text-slate-400 hover:text-slate-300 text-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            History ({history.length})
            <span className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
          </button>
        )}
      </div>

      {/* Scrollable history row */}
      {open && history.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {history.slice().reverse().map((entry) => (
            <HistoryItem key={entry.id} entry={entry} onLoad={onLoad} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
