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
  coles_product?: string
}

const SOURCE_COLORS: Record<string, string> = {
  meal: 'bg-blue-light text-blue',
  other_items: 'bg-accent-light text-accent',
  manual: 'bg-amber-light text-amber',
}

export default function ReviewPage() {
  const { householdId, loading: hhLoading } = useHousehold()
  const [session, setSession] = useState<Session | null>(null)
  const [mergedList, setMergedList] = useState<ListItem[]>([])
  const [pantryExclusions, setPantryExclusions] = useState<string[]>([])
  const [droppedDuplicates, setDroppedDuplicates] = useState<ListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showExclusions, setShowExclusions] = useState(false)
  const [showDuplicates, setShowDuplicates] = useState(false)
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

  const generateFinalList = async () => {
    if (!session || !householdId) return
    setError('')

    // Gather all sources
    const mealItems = ((session.meal_ingredients as unknown as ListItem[]) ?? []).map((i) => ({
      ...i,
      source: 'meal',
    }))
    const otherItems = ((session.confirmed_other_items as unknown as ListItem[]) ?? []).map((i) => ({
      ...i,
      source: i.source ?? 'other_items',
    }))
    const allItems = [...otherItems, ...mealItems]

    // Fetch pantry items for exclusion
    const { data: pantry } = await supabase
      .from('pantry_items')
      .select('name')
      .eq('household_id', householdId)
    const pantryNames = (pantry ?? []).map((p) => p.name.toLowerCase())

    // Simple dedup and pantry exclusion (client-side)
    const seen = new Map<string, ListItem>()
    const excluded: string[] = []
    const duplicates: ListItem[] = []

    for (const item of allItems) {
      const key = item.name.toLowerCase().trim()

      // Check pantry exclusion
      if (pantryNames.some((p) => key.includes(p) || p.includes(key))) {
        excluded.push(item.name)
        continue
      }

      // Check duplicate
      if (seen.has(key)) {
        duplicates.push(item)
        continue
      }

      seen.set(key, item)
    }

    const finalList = Array.from(seen.values())
    setMergedList(finalList)
    setPantryExclusions(excluded)
    setDroppedDuplicates(duplicates)

    // Save to session
    await supabase
      .from('weekly_sessions')
      .update({
        final_list: finalList,
        pantry_exclusions: excluded,
        dropped_duplicates: duplicates,
      })
      .eq('id', session.id)

    fetchSession()
  }

  const removeItem = (index: number) => {
    setMergedList((prev) => prev.filter((_, i) => i !== index))
  }

  const saveFinalList = async () => {
    if (!session) return
    const { error } = await supabase
      .from('weekly_sessions')
      .update({ final_list: mergedList })
      .eq('id', session.id)
    if (error) setError(error.message)
  }

  if (hhLoading || loading) {
    return <div className="text-sm text-text-mid">Loading review...</div>
  }

  if (!session) {
    return (
      <div>
        <h2 className="mb-4 font-serif text-xl text-text">Review & Merge</h2>
        <p className="text-sm text-text-light">No active session.</p>
      </div>
    )
  }

  const hasSources =
    (session.meal_ingredients as unknown[])?.length > 0 ||
    (session.confirmed_other_items as unknown[])?.length > 0

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="font-serif text-xl text-text">Review & Merge</h2>
        <button
          onClick={generateFinalList}
          disabled={!hasSources}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
        >
          Generate Final List
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red/20 bg-red-light px-4 py-2 text-sm text-red">{error}</div>}

      {!hasSources && (
        <p className="text-sm text-text-light">
          No items yet. Add meals from the Meals screen or pick items from the Picker.
        </p>
      )}

      {/* Final list */}
      {mergedList.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text">
              Final List ({mergedList.length} items)
            </h3>
            <button
              onClick={saveFinalList}
              className="rounded-lg border border-accent px-3 py-1.5 text-xs text-accent hover:bg-accent hover:text-white"
            >
              Save Changes
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {mergedList.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text">
                    {item.quantity} {item.unit} {item.name}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${SOURCE_COLORS[item.source] ?? 'bg-surface-alt text-text-mid'}`}
                  >
                    {item.source}
                  </span>
                </div>
                <button
                  onClick={() => removeItem(idx)}
                  className="text-xs text-text-light hover:text-red"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pantry exclusions */}
      {pantryExclusions.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowExclusions(!showExclusions)}
            className="mb-1 text-sm font-medium text-text-mid hover:text-text"
          >
            Pantry Exclusions ({pantryExclusions.length}){' '}
            <span className="text-xs">{showExclusions ? '▼' : '▶'}</span>
          </button>
          {showExclusions && (
            <div className="rounded-lg border border-amber/20 bg-amber-light p-3 text-sm text-amber">
              {pantryExclusions.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Dropped duplicates */}
      {droppedDuplicates.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowDuplicates(!showDuplicates)}
            className="mb-1 text-sm font-medium text-text-mid hover:text-text"
          >
            Dropped Duplicates ({droppedDuplicates.length}){' '}
            <span className="text-xs">{showDuplicates ? '▼' : '▶'}</span>
          </button>
          {showDuplicates && (
            <div className="rounded-lg border border-border bg-surface-alt p-3 text-sm text-text-mid">
              {droppedDuplicates.map((d) => d.name).join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
