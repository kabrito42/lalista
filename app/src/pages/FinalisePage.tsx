import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../hooks/useHousehold'
import type { Database } from '../types/database'

type Session = Database['public']['Tables']['weekly_sessions']['Row']

interface ListItem {
  name: string
  quantity: string | number
  unit: string
  source: string
  category?: string
}

export default function FinalisePage() {
  const { householdId, loading: hhLoading } = useHousehold()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const fetchSession = useCallback(async () => {
    if (!householdId) return
    const { data, error } = await supabase
      .from('weekly_sessions')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) setError(error.message)
    else setSession(data)
    setLoading(false)
  }, [householdId])

  useEffect(() => {
    if (!hhLoading && householdId) fetchSession()
  }, [hhLoading, householdId, fetchSession])

  const finalList = (session?.final_list as unknown as ListItem[]) ?? []

  // Group by category for display
  const grouped = finalList.reduce(
    (acc, item) => {
      const cat = item.category ?? 'Other'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(item)
      return acc
    },
    {} as Record<string, ListItem[]>,
  )

  const copyToClipboard = async () => {
    const text = finalList.map((i) => `${i.quantity} ${i.unit} ${i.name}`).join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const markFinalised = async () => {
    if (!session) return
    const { error } = await supabase.rpc('advance_session', { p_session_id: session.id })
    if (error) setError(error.message)
    else fetchSession()
  }

  if (hhLoading || loading) {
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
              disabled
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-light opacity-50"
              title="Agent not connected — wired in Phase 4"
            >
              Dispatch to Coles
            </button>

            <button
              disabled
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-light opacity-50"
              title="Agent not connected — wired in Phase 4"
            >
              Export to Apple Reminders
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
        </>
      )}
    </div>
  )
}
