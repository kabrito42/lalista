import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../hooks/useHousehold'
import { useSession } from '../contexts/SessionContext'
import { buildInitialSelections, type Selection } from '../lib/pickerUtils'
import type { Database } from '../types/database'

type LonglistItem = Database['public']['Tables']['longlist_items']['Row']
type Category = Database['public']['Tables']['categories']['Row']

export default function PickerPage() {
  const { householdId } = useHousehold()
  const { session, loading: sessionLoading } = useSession()
  const [items, setItems] = useState<LonglistItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selections, setSelections] = useState<Map<string, Selection>>(new Map())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchAll = useCallback(async () => {
    if (!householdId) return
    const [itemsRes, catsRes] = await Promise.all([
      supabase.from('longlist_items').select('*').eq('household_id', householdId).order('name'),
      supabase.from('categories').select('*').eq('household_id', householdId).order('sort_order'),
    ])
    setItems(itemsRes.data ?? [])
    setCategories(catsRes.data ?? [])

    // Pre-select staple items
    setSelections(buildInitialSelections(itemsRes.data ?? [], catsRes.data ?? []))
    setLoading(false)
  }, [householdId])

  useEffect(() => {
    if (!sessionLoading && householdId) fetchAll()
  }, [sessionLoading, householdId, fetchAll])

  const toggleItem = (item: LonglistItem) => {
    setSelections((prev) => {
      const next = new Map(prev)
      if (next.has(item.id)) {
        next.delete(item.id)
      } else {
        const cat = categories.find((c) => c.id === item.category_id)
        next.set(item.id, {
          id: item.id,
          name: item.name,
          quantity: item.default_qty,
          unit: item.unit ?? 'each',
          category: cat?.name ?? 'Uncategorised',
        })
      }
      return next
    })
  }

  const updateQty = (id: string, qty: number) => {
    setSelections((prev) => {
      const next = new Map(prev)
      const sel = next.get(id)
      if (sel) next.set(id, { ...sel, quantity: Math.max(1, qty) })
      return next
    })
  }

  const saveSelections = async () => {
    if (!session) return
    setSaving(true)
    setError('')
    const confirmed = Array.from(selections.values()).map((s) => ({
      name: s.name,
      quantity: s.quantity,
      unit: s.unit,
      category: s.category,
      source: 'other_items',
    }))
    const { error } = await supabase
      .from('weekly_sessions')
      .update({ confirmed_other_items: confirmed })
      .eq('id', session.id)
    if (error) setError(error.message)
    setSaving(false)
  }

  const grouped = categories.map((cat) => ({
    ...cat,
    items: items.filter((i) => i.category_id === cat.id),
  }))

  if (sessionLoading || loading) {
    return <div className="text-sm text-text-mid">Loading picker...</div>
  }

  if (!session) {
    return (
      <div>
        <h2 className="mb-4 font-serif text-xl text-text">Item Picker</h2>
        <p className="text-sm text-text-light">No active session.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="font-serif text-xl text-text">Item Picker</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-mid">{selections.size} items selected</span>
          <button
            onClick={saveSelections}
            disabled={saving}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Confirm Selection'}
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red/20 bg-red-light px-4 py-2 text-sm text-red">{error}</div>}

      {grouped.map(
        (group) =>
          group.items.length > 0 && (
            <div key={group.id} className="mb-3 overflow-hidden rounded-xl border border-border bg-surface">
              <div className="border-b border-border px-4 py-2 text-sm font-semibold text-text">
                {group.name}
              </div>
              {group.items.map((item) => {
                const selected = selections.has(item.id)
                const sel = selections.get(item.id)
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 border-b border-border px-4 py-2 last:border-b-0 ${
                      selected ? 'bg-accent-light/50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleItem(item)}
                      className="h-4 w-4 accent-accent"
                    />
                    <span className="flex-1 text-sm text-text">
                      {item.name}
                      {item.is_staple && (
                        <span className="ml-1 text-xs text-amber">★</span>
                      )}
                    </span>
                    {selected && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQty(item.id, (sel?.quantity ?? 1) - 1)}
                          className="rounded border border-border px-1.5 py-0.5 text-xs hover:bg-surface-alt"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-xs text-text">{sel?.quantity}</span>
                        <button
                          onClick={() => updateQty(item.id, (sel?.quantity ?? 1) + 1)}
                          className="rounded border border-border px-1.5 py-0.5 text-xs hover:bg-surface-alt"
                        >
                          +
                        </button>
                        <span className="ml-1 text-xs text-text-light">{sel?.unit}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ),
      )}
    </div>
  )
}
