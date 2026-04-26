import { useState, useMemo } from 'react'
import Header from './components/Header'
import DecisionInput from './components/DecisionInput'
import EvaluationPanel from './components/EvaluationPanel'
import ResultChart from './components/ResultChart'
import Recommendation from './components/Recommendation'
import { computeTotals, getRecommendation } from './utils/recommendation'

const initialPanel = () => ({
  moral: { benefit: 0, harm: 0 },
  material: { benefit: 0, harm: 0 },
})

const EXAMPLES = [
  {
    label: 'Living in USA',
    decision: 'Living in USA',
    onMe: { moral: { benefit: 10, harm: 0 }, material: { benefit: 7, harm: 7 } },
    onOthers: { moral: { benefit: 5, harm: 0 }, material: { benefit: 0, harm: 0 } },
  },
  {
    label: 'Changing Career',
    decision: 'Changing Career',
    onMe: { moral: { benefit: 8, harm: 3 }, material: { benefit: 6, harm: 5 } },
    onOthers: { moral: { benefit: 2, harm: 0 }, material: { benefit: 1, harm: 0 } },
  },
  {
    label: 'Starting a Business',
    decision: 'Starting a Business',
    onMe: { moral: { benefit: 9, harm: 4 }, material: { benefit: 7, harm: 6 } },
    onOthers: { moral: { benefit: 5, harm: 1 }, material: { benefit: 4, harm: 0 } },
  },
]

export default function App() {
  const [decision, setDecision] = useState('')
  const [onMe, setOnMe] = useState(initialPanel())
  const [onOthers, setOnOthers] = useState(initialPanel())

  const handlePanelChange = (setter) => (category, field, value) => {
    setter((prev) => ({
      ...prev,
      [category]: { ...prev[category], [field]: value },
    }))
  }

  const handleReset = () => {
    setDecision('')
    setOnMe(initialPanel())
    setOnOthers(initialPanel())
  }

  const handleExample = (ex) => {
    setDecision(ex.decision)
    setOnMe(ex.onMe)
    setOnOthers(ex.onOthers)
  }

  const totals = useMemo(() => computeTotals({ onMe, onOthers }), [onMe, onOthers])
  const recommendation = useMemo(() => getRecommendation(totals, decision), [totals, decision])

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-900/20 rounded-full blur-3xl" />
        <div className="absolute -top-20 right-0 w-80 h-80 bg-teal-900/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-slate-800/20 rounded-full blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-16">
        <Header />

        {/* Examples */}
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          <span className="text-slate-600 text-xs self-center">Try example:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              onClick={() => handleExample(ex)}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-800 hover:bg-slate-700
                         border border-slate-700 hover:border-slate-600 text-slate-300 transition-all"
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

        <DecisionInput value={decision} onChange={setDecision} />

        {/* Evaluation panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <EvaluationPanel
            title="Effect on Me"
            arabicTitle="على"
            icon="🪞"
            data={onMe}
            onChange={handlePanelChange(setOnMe)}
            accentColor="cyan"
          />
          <EvaluationPanel
            title="Effect on Others"
            arabicTitle="على الآخرين"
            icon="🌐"
            data={onOthers}
            onChange={handlePanelChange(setOnOthers)}
            accentColor="violet"
          />
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ResultChart totals={totals} />
          <Recommendation recommendation={recommendation} />
        </div>

        {/* Footer */}
        <div className="text-center mt-10 text-slate-700 text-xs">
          <p className="font-arabic text-slate-600 text-sm mb-1">كن صيادًا للحظات السعادة</p>
          <p>Be a hunter of happy moments — Nihilism Pragmatic Framework</p>
        </div>
      </div>
    </div>
  )
}
