import { useState, useCallback } from 'react'
import { analyzeDecision } from '../services/aiService'
import ApiKeyModal from './ApiKeyModal'

function getStoredKey() {
  return localStorage.getItem('nilism-api-key') || ''
}

function saveKey(key) {
  localStorage.setItem('nilism-api-key', key)
}

export default function AISearch({ onResult }) {
  const [situation, setSituation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [pendingAnalyze, setPendingAnalyze] = useState(false)

  const doAnalyze = useCallback(async (key) => {
    if (!situation.trim()) return
    setLoading(true)
    setError('')
    try {
      const result = await analyzeDecision(situation.trim(), key)
      onResult(result)
      setSituation('')
    } catch (err) {
      const msg = err.message || 'Analysis failed'
      if (msg.includes('401') || msg.includes('invalid') || msg.includes('API key')) {
        setError('Invalid API key. Please check your key and try again.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }, [situation, onResult])

  const handleAnalyze = () => {
    if (!situation.trim() || loading) return
    const key = getStoredKey()
    if (!key) {
      setPendingAnalyze(true)
      setShowKeyModal(true)
    } else {
      doAnalyze(key)
    }
  }

  const handleKeySave = (key) => {
    saveKey(key)
    setShowKeyModal(false)
    if (pendingAnalyze) {
      setPendingAnalyze(false)
      doAnalyze(key)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleAnalyze()
    }
  }

  return (
    <>
      {showKeyModal && (
        <ApiKeyModal
          onSave={handleKeySave}
          onClose={() => { setShowKeyModal(false); setPendingAnalyze(false) }}
        />
      )}

      <div className="glass-card p-5 mb-6 border-violet-800/30 bg-gradient-to-br from-violet-950/30 to-slate-900/70">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-violet-700/40 flex items-center justify-center text-sm">✨</div>
          <div>
            <h2 className="text-sm font-bold text-slate-200">AI Analysis</h2>
            <p className="text-xs text-slate-500">Describe your situation — AI fills in all scores</p>
          </div>
          <button
            onClick={() => setShowKeyModal(true)}
            className="ml-auto text-xs text-slate-600 hover:text-slate-400 transition-colors border
                       border-slate-700 hover:border-slate-500 rounded px-2 py-1"
            title="Configure API Key"
          >
            {getStoredKey() ? '🔑 Key set' : '🔑 Set key'}
          </button>
        </div>

        <div className="flex gap-2">
          <textarea
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='e.g. "Should I move abroad for a better job, leaving my family behind?"'
            rows={2}
            className="flex-1 bg-slate-900/80 border border-slate-700/60 rounded-lg px-4 py-2.5 text-sm
                       text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2
                       focus:ring-violet-500/60 focus:border-violet-600 transition-all resize-none"
          />
          <button
            onClick={handleAnalyze}
            disabled={!situation.trim() || loading}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-500
                       disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all
                       flex items-center gap-2 whitespace-nowrap self-stretch"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Thinking…
              </>
            ) : (
              <>✨ Analyze</>
            )}
          </button>
        </div>

        <p className="text-slate-700 text-xs mt-2">Ctrl+Enter to analyze · Your key stays in your browser only</p>

        {error && (
          <div className="mt-3 bg-red-950/40 border border-red-800/40 rounded-lg px-4 py-2.5 text-red-300 text-sm">
            {error}
          </div>
        )}
      </div>
    </>
  )
}
