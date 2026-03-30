import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../hooks/useHousehold'
import type { Database } from '../types/database'

type ColesPref = Database['public']['Tables']['coles_preferences']['Row']

export default function ColesPreferencesPage() {
  const { householdId, loading: hhLoading } = useHousehold()
  const [prefs, setPrefs] = useState<ColesPref[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ product_name: '', pack_size: '', brand: '' })
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  const fetch = useCallback(async () => {
    if (!householdId) return
    const { data, error } = await supabase
      .from('coles_preferences')
      .select('*')
      .eq('household_id', householdId)
      .order('product_name')
    if (error) setError(error.message)
    else setPrefs(data ?? [])
    setLoading(false)
  }, [householdId])

  useEffect(() => {
    if (!hhLoading && householdId) fetch()
  }, [hhLoading, householdId, fetch])

  const filtered = prefs.filter(
    (p) => !search || p.product_name.toLowerCase().includes(search.toLowerCase()),
  )

  const resetForm = () => {
    setForm({ product_name: '', pack_size: '', brand: '' })
    setEditingId(null)
    setShowForm(false)
  }

  const handleSave = async () => {
    if (!householdId || !form.product_name.trim()) return
    const payload = {
      household_id: householdId,
      product_name: form.product_name.trim(),
      pack_size: form.pack_size || null,
      brand: form.brand || null,
    }
    if (editingId) {
      const { error } = await supabase.from('coles_preferences').update(payload).eq('id', editingId)
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.from('coles_preferences').insert(payload)
      if (error) setError(error.message)
    }
    resetForm()
    fetch()
  }

  const startEdit = (pref: ColesPref) => {
    setEditingId(pref.id)
    setForm({
      product_name: pref.product_name,
      pack_size: pref.pack_size ?? '',
      brand: pref.brand ?? '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('coles_preferences').delete().eq('id', id)
    fetch()
  }

  if (hhLoading || loading) {
    return <div className="text-sm text-text-mid">Loading Coles preferences...</div>
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="font-serif text-xl text-text">Coles Preferences</h2>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
        >
          + Add Product
        </button>
      </div>

      <input
        type="text"
        placeholder="Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full max-w-xs rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-light"
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red/20 bg-red-light px-4 py-2 text-sm text-red">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-4 rounded-xl border border-border bg-surface p-4">
          <div className="grid grid-cols-3 gap-3">
            <input
              placeholder="Product name *"
              value={form.product_name}
              onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))}
              className="col-span-2 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <input
              placeholder="Pack size"
              value={form.pack_size}
              onChange={(e) => setForm((f) => ({ ...f, pack_size: e.target.value }))}
              className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={resetForm} className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-mid hover:bg-surface-alt">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!form.product_name.trim()}
              className="rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-50"
            >
              {editingId ? 'Update' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-text-light">
          {search ? 'No products match.' : 'No Coles preferences yet.'}
        </p>
      ) : (
        <div className="grid gap-1">
          {filtered.map((pref) => (
            <div
              key={pref.id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-2"
            >
              <div>
                <span className="text-sm text-text">{pref.product_name}</span>
                {pref.pack_size && (
                  <span className="ml-2 text-xs text-text-light">{pref.pack_size}</span>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(pref)} className="text-xs text-text-light hover:text-accent">
                  Edit
                </button>
                <button onClick={() => handleDelete(pref.id)} className="text-xs text-text-light hover:text-red">
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
