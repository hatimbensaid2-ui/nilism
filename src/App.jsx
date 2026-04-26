import { useState, useMemo, useCallback, useEffect } from 'react'
import Header from './components/Header'
import DecisionInput from './components/DecisionInput'
import EvaluationPanel from './components/EvaluationPanel'
import ResultChart from './components/ResultChart'
import QuadrantChart from './components/QuadrantChart'
import Recommendation from './components/Recommendation'
import HistoryPanel from './components/HistoryPanel'
import ShareButton from './components/ShareButton'
import AISearch from './components/AISearch'
import { computeTotals, getRecommendation, encodeState, decodeState } from './utils/recommendation'

let idCounter = 100

const makeRow = (label, arabic, benefit = 0, harm = 0, weight = 1) => ({
  id: `${++idCounter}`,
  label,
  arabic,
  benefit,
  harm,
  weight,
})

const defaultOnMe = () => [
  makeRow('Moral', 'محتوي'),
  makeRow('Material', 'مادي'),
]

const defaultOnOthers = () => [
  makeRow('Moral', 'محتوي'),
  makeRow('Material', 'مادي'),
]

const EXAMPLES = [
  {
    label: 'Living in USA',
    decision: 'Living in USA',
    onMe: [
      makeRow('Moral', 'محتوي', 10, 0),
      makeRow('Material', 'مادي', 7, 7),
    ],
    onOthers: [
      makeRow('Moral', 'محتوي', 5, 0),
      makeRow('Material', 'مادي', 0, 0),
    ],
  },
  {
    label: 'Changing Career',
    decision: 'Changing Career',
    onMe: [
      makeRow('Passion', 'شغف', 9, 2),
      makeRow('Financial', 'مالي', 5, 6),
      makeRow('Growth', 'نمو', 8, 1),
    ],
    onOthers: [
      makeRow('Family', 'عائلة', 3, 3),
      makeRow('Society', 'مجتمع', 4, 0),
    ],
  },
  {
    label: 'Starting a Business',
    decision: 'Starting a Business',
    onMe: [
      makeRow('Moral', 'محتوي', 9, 4),
      makeRow('Material', 'مادي', 7, 6),
      makeRow('Time', 'وقت', 2, 8),
    ],
    onOthers: [
      makeRow('Community', 'مجتمع', 6, 1),
      makeRow('Employees', 'موظفون', 5, 0),
    ],
  },
]

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem('nilism-history') || '[]')
  } catch {
    return []
  }
}

function saveHistory(h) {
  localStorage.setItem('nilism-history', JSON.stringify(h))
}

function loadFromHash() {
  const hash = window.location.hash.slice(1)
  if (!hash) return null
  return decodeState(hash)
}

export default function App() {
  const [decision, setDecision] = useState('')
  const [onMe, setOnMe] = useState(defaultOnMe)
  const [onOthers, setOnOthers] = useState(defaultOnOthers)
  const [history, setHistory] = useState(loadHistory)
  const [aiNote, setAiNote] = useState(null)

  // Load from URL hash on mount
  useEffect(() => {
    const state = loadFromHash()
    if (state?.decision !== undefined) {
      setDecision(state.decision || '')
      if (state.onMe?.length) setOnMe(state.onMe)
      if (state.onOthers?.length) setOnOthers(state.onOthers)
    }
  }, [])

  const handleRowChange = useCallback((setter) => (id, field, value) => {
    setter((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }, [])

  const handleAddRow = useCallback((setter) => (label) => {
    setter((prev) => [...prev, makeRow(label, '')])
  }, [])

  const handleRemoveRow = useCallback((setter) => (id) => {
    setter((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const handleExample = (ex) => {
    setDecision(ex.decision)
    setOnMe(ex.onMe.map((r) => ({ ...r, id: `${++idCounter}` })))
    setOnOthers(ex.onOthers.map((r) => ({ ...r, id: `${++idCounter}` })))
    window.location.hash = ''
  }

  const handleReset = () => {
    setDecision('')
    setOnMe(defaultOnMe())
    setOnOthers(defaultOnOthers())
    setAiNote(null)
    window.location.hash = ''
  }

  const handleAiResult = (result) => {
    setDecision(result.decision || '')
    if (result.onMe?.length) {
      setOnMe(result.onMe.map((r) => makeRow(r.label, r.arabic || '', r.benefit ?? 0, r.harm ?? 0, r.weight ?? 1)))
    }
    if (result.onOthers?.length) {
      setOnOthers(result.onOthers.map((r) => makeRow(r.label, r.arabic || '', r.benefit ?? 0, r.harm ?? 0, r.weight ?? 1)))
    }
    setAiNote({ explanation: result.explanation, context: result.context })
    window.location.hash = ''
  }

  const totals = useMemo(() => computeTotals(onMe, onOthers), [onMe, onOthers])
  const recommendation = useMemo(() => getRecommendation(totals, decision), [totals, decision])

  const canSave = totals.totalBenefit > 0 || totals.totalHarm > 0

  const handleSave = () => {
    const entry = {
      id: Date.now(),
      savedAt: Date.now(),
      decision,
      onMe,
      onOthers,
      verdict: recommendation.verdict,
      net: totals.net,
    }
    const next = [...history, entry].slice(-20)
    setHistory(next)
    saveHistory(next)
  }

  const handleLoadHistory = (entry) => {
    setDecision(entry.decision || '')
    setOnMe(entry.onMe.map((r) => ({ ...r, id: `${++idCounter}` })))
    setOnOthers(entry.onOthers.map((r) => ({ ...r, id: `${++idCounter}` })))
    window.location.hash = ''
  }

  const handleDeleteHistory = (id) => {
    const next = history.filter((h) => h.id !== id)
    setHistory(next)
    saveHistory(next)
  }

  const shareState = { decision, onMe, onOthers }

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-900/20 rounded-full blur-3xl" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-900/15 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-violet-900/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-16">
        <Header />

        {/* Examples + reset */}
        <div className="flex flex-wrap gap-2 justify-center mb-5">
          <span className="text-slate-600 text-xs self-center">Try:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              onClick={() => handleExample(ex)}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-800 hover:bg-slate-700
                         border border-slate-700 hover:border-slate-500 text-slate-300 transition-all"
            >
              {ex.label}
            </button>
          ))}
          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-900 hover:bg-slate-800
                       border border-slate-800 text-slate-500 hover:text-slate-400 transition-all"
          >
            Reset
          </button>
        </div>

        <AISearch onResult={handleAiResult} />

        <DecisionInput value={decision} onChange={setDecision} />

        {aiNote && (
          <div className="glass-card p-4 mb-5 border-violet-700/30 bg-violet-950/20">
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5">🤖</span>
              <div className="flex-1 min-w-0">
                <p className="text-slate-200 text-sm leading-relaxed">{aiNote.explanation}</p>
                {aiNote.context && (
                  <p className="text-slate-500 text-xs mt-1.5 italic">{aiNote.context}</p>
                )}
              </div>
              <button
                onClick={() => setAiNote(null)}
                className="text-slate-600 hover:text-slate-400 transition-colors text-lg leading-none shrink-0"
              >×</button>
            </div>
          </div>
        )}

        {/* Save / History / Share toolbar */}
        <div className="max-w-5xl mx-auto px-0 mb-6 flex items-start gap-3 flex-wrap">
          <HistoryPanel
            history={history}
            onLoad={handleLoadHistory}
            onDelete={handleDeleteHistory}
            onSave={handleSave}
            canSave={canSave}
          />
          <ShareButton state={shareState} />
        </div>

        {/* Evaluation panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <EvaluationPanel
            title="Effect on Me"
            arabicTitle="على"
            icon="🪞"
            rows={onMe}
            onChange={handleRowChange(setOnMe)}
            onAdd={handleAddRow(setOnMe)}
            onRemove={handleRemoveRow(setOnMe)}
            accentColor="cyan"
          />
          <EvaluationPanel
            title="Effect on Others"
            arabicTitle="على الآخرين"
            icon="🌐"
            rows={onOthers}
            onChange={handleRowChange(setOnOthers)}
            onAdd={handleAddRow(setOnOthers)}
            onRemove={handleRemoveRow(setOnOthers)}
            accentColor="violet"
          />
        </div>

        {/* Results grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <ResultChart totals={totals} />
          <QuadrantChart
            meNet={totals.meNet}
            othersNet={totals.othersNet}
            verdict={recommendation.verdict}
          />
        </div>

        {/* Recommendation full width */}
        <Recommendation recommendation={recommendation} />

        {/* Footer */}
        <div className="text-center mt-10 space-y-1">
          <p className="font-arabic text-slate-500 text-base">كن صيادًا للحظات السعادة</p>
          <p className="text-slate-700 text-xs">Be a hunter of happy moments — Nihilism Pragmatic Framework</p>
        </div>
      </div>
    </div>
  )
}
