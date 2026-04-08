import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../contexts/SessionContext'
import { groupByCategory, formatForClipboard, type ListItem } from '../lib/finaliseUtils'
import AutomationLogViewer from '../components/AutomationLogViewer'

export default function FinalisePage() {
  const { session, loading, refreshSession, advanceSession } = useSession()
  const [copied, setCopied] = useState(false)
  const [dispatching, setDispatching] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [error, setError] = useState('')

  const finalList = (session?.final_list as unknown as ListItem[]) ?? []

  // Group by category for display
  const grouped = groupByCategory(finalList)

  const copyToClipboard = async () => {
    const text = formatForClipboard(finalList)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const markFinalised = async () => {
    if (!session) return
    await advanceSession()
    refreshSession()
  }

  if (loading) {
    return <div className="text-sm text-text-mid">Loading...</div>
  }

  if (!session) {
    return (
      <div>
        <h2 className="mb-4 font-serif text-xl text-text">Finalise</h2>
        <p className="text-sm text-text-light">No active session.</p>
      </div>
    )
  }

  const isFinalised = session.status === 'finalised' || session.status === 'dispatched'

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="font-serif text-xl text-text">Finalise</h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            isFinalised ? 'bg-accent text-white' : 'bg-surface-alt text-text-mid'
          }`}
        >
          {session.status}
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red/20 bg-red-light px-4 py-2 text-sm text-red">
          {error}
        </div>
      )}

      {finalList.length === 0 ? (
        <p className="text-sm text-text-light">
          No final list generated yet. Go to Review & Merge to generate it.
        </p>
      ) : (
        <>
          {/* Summary */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="font-serif text-2xl text-text">{finalList.length}</div>
              <div className="text-xs text-text-light">Total items</div>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="font-serif text-2xl text-text">{Object.keys(grouped).length}</div>
              <div className="text-xs text-text-light">Categories</div>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="font-serif text-2xl text-text">{session.session_date}</div>
              <div className="text-xs text-text-light">Session date</div>
            </div>
          </div>

          {/* Final list (read-only) */}
          <div className="mb-6">
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category} className="mb-3 overflow-hidden rounded-xl border border-border bg-surface">
                <div className="border-b border-border px-4 py-2 text-sm font-semibold text-text">
                  {category} ({items.length})
                </div>
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between border-b border-border px-4 py-2 last:border-b-0"
                  >
                    <span className="text-sm text-text">{item.name}</span>
                    <span className="text-xs text-text-light">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={copyToClipboard}
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-alt"
            >
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>

            <button
              onClick={async () => {
                if (!session || session.coles_dispatched) return
                setDispatching(true)
                setShowLogs(true)
                setError('')
                // The agent polls for finalised sessions with coles_dispatched=false
                // Just ensure the session is finalised — agent picks it up automatically
                if (session.status !== 'finalised' && session.status !== 'dispatched') {
                  const { error } = await supabase.rpc('advance_session', { p_session_id: session.id })
                  if (error) {
                    setError(error.message)
                    setDispatching(false)
                    return
                  }
                }
                setDispatching(false)
                fetchSession()
              }}
              disabled={dispatching || session.coles_dispatched}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                session.coles_dispatched
                  ? 'border-accent/20 bg-accent-light text-accent'
                  : 'border-border bg-surface text-text hover:bg-surface-alt'
              }`}
            >
              {session.coles_dispatched ? 'Dispatched ✓' : dispatching ? 'Dispatching...' : 'Dispatch to Coles'}
            </button>

            <button
              onClick={() => setShowLogs(!showLogs)}
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-mid transition-colors hover:bg-surface-alt"
            >
              {showLogs ? 'Hide Logs' : 'Show Logs'}
            </button>

            {!isFinalised && (
              <button
                onClick={markFinalised}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
              >
                Mark as Finalised
              </button>
            )}
          </div>

          {/* Automation log viewer */}
          {showLogs && session && (
            <div className="mt-6">
              <AutomationLogViewer sessionId={session.id} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
