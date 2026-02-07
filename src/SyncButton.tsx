import { useState } from 'react'
import { syncOnce } from './sync'

const SyncButton = () => {
  const [status, setStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string>('')

  async function handleSync() {
    setStatus('syncing')
    setMessage('')
    try {
      await syncOnce()
      setStatus('success')
      setMessage('Synced successfully')
    } catch (err) {
      setStatus('error')
      setMessage(String(err ?? 'Unknown error'))
    } finally {
      // Reset to idle after a short delay so button becomes usable again
      setTimeout(() => setStatus('idle'), 2000)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSync}
        disabled={status === 'syncing'}
        className={`inline-flex items-center px-3 py-1.5 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-400 transition-colors ${
          status === 'syncing' ? 'bg-slate-400' : 'bg-emerald-600 hover:bg-emerald-700'
        }`}
        aria-live="polite"
      >
        {status === 'syncing' && (
          <svg
            className="h-4 w-4 mr-2 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
        )}
        <span>{status === 'syncing' ? 'Syncing...' : 'Sync'}</span>
      </button>

      {message && (
        <div className={`text-sm ${status === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
          {message}
        </div>
      )}
    </div>
  )
}

export default SyncButton
