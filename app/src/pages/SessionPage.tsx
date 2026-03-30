import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../hooks/useHousehold'
import type { Database } from '../types/database'

type Session = Database['public']['Tables']['weekly_sessions']['Row']

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-surface-alt text-text-mid' },
  planning: { label: 'Planning', color: 'bg-blue-light text-blue' },
  picking: { label: 'Picking', color: 'bg-amber-light text-amber' },
  review: { label: 'Review', color: 'bg-accent-light text-accent' },
  finalised: { label: 'Finalised', color: 'bg-accent text-white' },
  dispatched: { label: 'Dispatched', color: 'bg-accent text-white' },
}

export default function SessionPage() {
  const { householdId, loading: hhLoading } = useHousehold()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [freeformText, setFreeformText] = useState('')
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

  const createSession = async () => {
    if (!householdId) return
    setError('')
    const { data, error } = await supabase
      .from('weekly_sessions')
      .insert({ household_id: householdId })
      .select()
      .single()
    if (error) setError(error.message)
    else setSession(data)
  }

  const advanceStatus = async () => {
    if (!session) return
    setError('')
    const { data, error } = await supabase.rpc('advance_session', {
      p_session_id: session.id,
    })
    if (error) setError(error.message)
    else {
      setSession((s) => (s ? { ...s, status: data as Session['status'] } : s))
    }
  }

  const saveFreeformItems = async () => {
    if (!session || !freeformText.trim()) return
    const items = freeformText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((name) => ({ name, quantity: 1, unit: 'each', source: 'manual' }))

    const existing = (session.confirmed_other_items as Array<Record<string, unknown>>) ?? []
    const merged = [...existing, ...items]

    const { error } = await supabase
      .from('weekly_sessions')
      .update({ confirmed_other_items: merged })
      .eq('id', session.id)

    if (error) setError(error.message)
    else {
      setFreeformText('')
      fetchSession()
    }
  }

  if (hhLoading || loading) {
    return <div className="text-sm text-text-mid">Loading session...</div>
  }

  if (!session) {
    return (
      <div>
        <h2 className="mb-4 font-serif text-xl text-text">Weekly Session</h2>
        <p className="mb-4 text-sm text-text-mid">No active session. Start a new one for this week.</p>
        {error && <div className="mb-4 rounded-lg border border-red/20 bg-red-light px-4 py-2 text-sm text-red">{error}</div>}
        <button
          onClick={createSession}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
        >
          Start New Session
        </button>
      </div>
    )
  }

  const statusInfo = STATUS_LABELS[session.status] ?? STATUS_LABELS.draft

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="font-serif text-xl text-text">Weekly Session</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red/20 bg-red-light px-4 py-2 text-sm text-red">{error}</div>}

      {/* Session info */}
      <div className="mb-6 rounded-xl border border-border bg-surface p-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-text-light">Date:</span>{' '}
            <span className="text-text">{session.session_date}</span>
          </div>
          <div>
            <span className="text-text-light">Status:</span>{' '}
            <span className="text-text">{session.status}</span>
          </div>
        </div>
      </div>

      {/* Freeform items (available in draft/planning) */}
      {(session.status === 'draft' || session.status === 'planning') && (
        <div className="mb-6 rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-2 text-sm font-semibold text-text">Add Items (one per line)</h3>
          <textarea
            rows={4}
            value={freeformText}
            onChange={(e) => setFreeformText(e.target.value)}
            placeholder="e.g.&#10;2x bread&#10;1 bag spinach&#10;tomato sauce"
            className="mb-2 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={saveFreeformItems}
            disabled={!freeformText.trim()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
          >
            Add to List
          </button>
        </div>
      )}

      {/* Meal ingredients summary */}
      {session.meal_ingredients && (
        <div className="mb-6 rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-2 text-sm font-semibold text-text">Meal Ingredients</h3>
          <p className="text-xs text-text-light">
            {(session.meal_ingredients as unknown[]).length} ingredients from selected meals
          </p>
        </div>
      )}

      {/* Other items summary */}
      {session.confirmed_other_items && (
        <div className="mb-6 rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-2 text-sm font-semibold text-text">Other Items</h3>
          <p className="text-xs text-text-light">
            {(session.confirmed_other_items as unknown[]).length} items confirmed
          </p>
        </div>
      )}

      {/* Advance button */}
      {session.status !== 'dispatched' && (
        <button
          onClick={advanceStatus}
          className="rounded-lg border border-accent bg-accent-light px-4 py-2 text-sm font-medium text-accent hover:bg-accent hover:text-white"
        >
          Advance to next step
        </button>
      )}
    </div>
  )
}
