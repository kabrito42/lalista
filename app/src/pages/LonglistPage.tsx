import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../hooks/useHousehold'
import type { Database } from '../types/database'

type LonglistItem = Database['public']['Tables']['longlist_items']['Row']
type Category = Database['public']['Tables']['categories']['Row']

export default function LonglistPage() {
  const { householdId, loading: hhLoading } = useHousehold()
  const [items, setItems] = useState<LonglistItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', category_id: '' as string | null, default_qty: 1, unit: '', is_staple: false })
  const [error, setError] = useState('')

  const fetchAll = useCallback(async () => {
    if (!householdId) return
    const [itemsRes, catsRes] = await Promise.all([
      supabase.from('longlist_items').select('*').eq('household_id', householdId).order('name'),
      supabase.from('categories').select('*').eq('household_id', householdId).order('sort_order'),
    ])
    if (itemsRes.error) setError(itemsRes.error.message)
    if (catsRes.error) setError(catsRes.error.message)
    setItems(itemsRes.data ?? [])
    setCategories(catsRes.data ?? [])
    setLoading(false)
  }, [householdId])

  useEffect(() => {
    if (!hhLoading && householdId) fetchAll()
  }, [hhLoading, householdId, fetchAll])

  const grouped = categories.map((cat) => ({
    ...cat,
    items: items.filter((i) => i.category_id === cat.id),
  }))
  const uncategorised = items.filter((i) => !i.category_id)

  const toggleCollapse = (id: string) =>
    setCollapsed((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const resetForm = () => {
    setForm({ name: '', category_id: null, default_qty: 1, unit: '', is_staple: false })
    setEditingId(null)
    setShowForm(false)
  }

  const handleSave = async () => {
    if (!householdId || !form.name.trim()) return
    const payload = {
      household_id: householdId,
      name: form.name.trim(),
      category_id: form.category_id || null,
      default_qty: form.default_qty,
      unit: form.unit || null,
      is_staple: form.is_staple,
    }
    if (editingId) {
      const { error } = await supabase.from('longlist_items').update(payload).eq('id', editingId)
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.from('longlist_items').insert(payload)
      if (error) setError(error.message)
    }
    resetForm()
    fetchAll()
  }

  const startEdit = (item: LonglistItem) => {
    setEditingId(item.id)
    setForm({
      name: item.name,
      category_id: item.category_id,
      default_qty: item.default_qty,
      unit: item.unit ?? '',
      is_staple: item.is_staple,
    })
    setShowForm(true)
  }

  const toggleStaple = async (item: LonglistItem) => {
    await supabase.from('longlist_items').update({ is_staple: !item.is_staple }).eq('id', item.id)
    fetchAll()
  }

  const handleDelete = async (id: string) => {
    await supabase.from('longlist_items').delete().eq('id', id)
    fetchAll()
  }

  const renderItem = (item: LonglistItem) => (
    <div
      key={item.id}
      className="flex items-center gap-2 border-b border-border px-4 py-2 last:border-b-0"
    >
      <button
        onClick={() => toggleStaple(item)}
        className={`text-sm ${item.is_staple ? 'text-amber opacity-100' : 'opacity-40'}`}
        title={item.is_staple ? 'Staple' : 'Not staple'}
      >
        ★
      </button>
      <span className="flex-1 text-sm text-text">{item.name}</span>
      <span className="text-xs text-text-light">
        {item.default_qty} {item.unit}
      </span>
      <button onClick={() => startEdit(item)} className="text-xs text-text-light hover:text-accent">
        Edit
      </button>
      <button onClick={() => handleDelete(item.id)} className="text-xs text-text-light hover:text-red">
        ✕
      </button>
    </div>
  )

  if (hhLoading || loading) {
    return <div className="text-sm text-text-mid">Loading longlist...</div>
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="font-serif text-xl text-text">Longlist</h2>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
        >
          + Add Item
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red/20 bg-red-light px-4 py-2 text-sm text-red">
          {error}
        </div>
      )}

      {/* Add/edit form */}
      {showForm && (
        <div className="mb-4 rounded-xl border border-border bg-surface p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <input
              placeholder="Name *"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="col-span-2 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <select
              value={form.category_id ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value || null }))}
              className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Qty"
                value={form.default_qty}
                onChange={(e) => setForm((f) => ({ ...f, default_qty: +e.target.value || 1 }))}
                className="w-16 rounded-lg border border-border px-2 py-2 text-sm outline-none focus:border-accent"
              />
              <input
                placeholder="Unit"
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                className="flex-1 rounded-lg border border-border px-2 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-text-mid">
              <input
                type="checkbox"
                checked={form.is_staple}
                onChange={(e) => setForm((f) => ({ ...f, is_staple: e.target.checked }))}
                className="accent-accent"
              />
              Staple item
            </label>
            <div className="flex-1" />
            <button
              onClick={resetForm}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-mid hover:bg-surface-alt"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!form.name.trim()}
              className="rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-50"
            >
              {editingId ? 'Update' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {/* Grouped by category */}
      {grouped.map(
        (group) =>
          group.items.length > 0 && (
            <div key={group.id} className="mb-2 overflow-hidden rounded-xl border border-border bg-surface">
              <button
                onClick={() => toggleCollapse(group.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-text hover:bg-surface-alt"
              >
                <span>
                  {group.name}{' '}
                  <span className="font-normal text-text-light">({group.items.length})</span>
                </span>
                <span className={`text-xs text-text-light transition-transform ${collapsed.has(group.id) ? '' : 'rotate-90'}`}>
                  ▶
                </span>
              </button>
              {!collapsed.has(group.id) && group.items.map(renderItem)}
            </div>
          ),
      )}

      {uncategorised.length > 0 && (
        <div className="mb-2 overflow-hidden rounded-xl border border-border bg-surface">
          <div className="px-4 py-3 text-sm font-semibold text-text-light">
            Uncategorised ({uncategorised.length})
          </div>
          {uncategorised.map(renderItem)}
        </div>
      )}

      {items.length === 0 && (
        <p className="text-sm text-text-light">No items yet. Add your first longlist item!</p>
      )}
    </div>
  )
}
