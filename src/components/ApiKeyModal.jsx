import { useState } from 'react'

export default function ApiKeyModal({ onSave, onClose }) {
  const [key, setKey] = useState('')
  const [show, setShow] = useState(false)

  const handleSave = () => {
    if (!key.trim()) return
    onSave(key.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md p-6 shadow-2xl border-cyan-800/40">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Anthropic API Key</h2>
            <p className="text-slate-400 text-sm mt-0.5">Required for AI analysis</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors text-xl leading-none">×</button>
        </div>

        <div className="bg-amber-950/40 border border-amber-800/40 rounded-lg p-3 mb-4">
          <p className="text-amber-300 text-xs leading-relaxed">
            Your key is stored only in your browser's localStorage and is never sent to any server.
            It is used directly from your browser to call the Anthropic API.
          </p>
        </div>

        <div className="relative mb-4">
          <input
            type={show ? 'text' : 'password'}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="sk-ant-..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm
                       text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2
                       focus:ring-cyan-500/60 focus:border-cyan-600 transition-all pr-16 font-mono"
          />
          <button
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300
                       text-xs font-medium transition-colors"
          >
            {show ? 'HIDE' : 'SHOW'}
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!key.trim()}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-cyan-600 hover:bg-cyan-500
                       disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all"
          >
            Save & Continue
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700
                       text-slate-400 hover:text-slate-300 transition-all"
          >
            Cancel
          </button>
        </div>

        <p className="text-slate-600 text-xs mt-3 text-center">
          Get your API key at{' '}
          <span className="text-slate-500 font-mono">console.anthropic.com</span>
        </p>
      </div>
    </div>
  )
}
