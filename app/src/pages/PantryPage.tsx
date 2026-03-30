import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../hooks/useHousehold'
import type { Database } from '../types/database'

type PantryItem = Database['public']['Tables']['pantry_items']['Row']

export default function PantryPage() {
  const { householdId, loading: hhLoading } = useHousehold()
  const [items, setItems] = useState<PantryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [showBulk, setShowBulk] = useState(false)
  const [error, setError] = useState('')

  const fetch = useCallback(async () => {
    if (!householdId) return
    const { data, error } = await supabase
      .from('pantry_items')
      .select('*')
      .eq('household_id', householdId)
      .order('name')
    if (error) setError(error.message)
    else setItems(data ?? [])
    setLoading(false)
  }, [householdId])

  useEffect(() => {
    if (!hhLoading && householdId) fetch()
  }, [hhLoading, householdId, fetch])

  const handleAdd = async () => {
    if (!householdId || !newName.trim()) return
    const { error } = await supabase
      .from('pantry_items')
      .insert({ household_id: householdId, name: newName.trim() })
    if (error) setError(error.message)
    else {
      setNewName('')
      fetch()
    }
  }

  const handleBulkImport = async () => {
    if (!householdId || !bulkText.trim()) return
    const names = bulkText
      .split('\n')
      .map((n) => n.trim())
      .filter(Boolean)
    const { error } = await supabase
      .from('pantry_items')
      .insert(names.map((name) => ({ household_id: householdId, name })))
    if (error) setError(error.message)
    else {
      setBulkText('')
      setShowBulk(false)
      fetch()
    }
  }

  const handleUpdate = async () => {
    if (!editingId || !editName.trim()) return
    const { error } = await supabase
      .from('pantry_items')
      .update({ name: editName.trim() })
      .eq('id', editingId)
    if (error) setError(error.message)
    else {
      setEditingId(null)
      fetch()
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('pantry_items').delete().eq('id', id)
    if (error) setError(error.message)
    else fetch()
  }

  if (hhLoading || loading) {
    return <div className="text-sm text-text-mid">Loading pantry...</div>
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="font-serif text-xl text-text">Pantry</h2>
        <button
          onClick={() => setShowBulk(!showBulk)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-mid hover:bg-surface-alt"
        >
          {showBulk ? 'Close' : 'Bulk Import'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red/20 bg-red-light px-4 py-2 text-sm text-red">
          {error}
        </div>
      )}

      {showBulk && (
        <div className="mb-4 rounded-xl border border-border bg-surface p-4">
          <p className="mb-2 text-xs text-text-mid">One item per line:</p>
          <textarea
            rows={5}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            className="mb-2 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={handleBulkImport}
            disabled={!bulkText.trim()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
          >
            Import
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-2"
          >
            {editingId === item.id ? (
              <div className="flex flex-1 gap-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                  className="flex-1 rounded border border-border px-2 py-1 text-sm outline-none focus:border-accent"
                  autoFocus
                />
                <button onClick={handleUpdate} className="text-xs text-accent">
                  Save
                </button>
                <button onClick={() => setEditingId(null)} className="text-xs text-text-light">
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <span className="text-sm text-text">{item.name}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingId(item.id)
                      setEditName(item.name)
                    }}
                    className="text-xs text-text-light hover:text-accent"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-xs text-text-light hover:text-red"
                  >
                    ✕
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          placeholder="New pantry item"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          onClick={handleAdd}
          disabled={!newName.trim()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
        >
          + Add
        </button>
      </div>
    </div>
  )
}
