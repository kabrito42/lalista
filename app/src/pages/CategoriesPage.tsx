import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../hooks/useHousehold'
import type { Database } from '../types/database'

type Category = Database['public']['Tables']['categories']['Row']

export default function CategoriesPage() {
  const { householdId, loading: hhLoading } = useHousehold()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editOrder, setEditOrder] = useState(0)
  const [error, setError] = useState('')

  const fetch = useCallback(async () => {
    if (!householdId) return
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('household_id', householdId)
      .order('sort_order')
    if (error) setError(error.message)
    else setCategories(data ?? [])
    setLoading(false)
  }, [householdId])

  useEffect(() => {
    if (!hhLoading && householdId) fetch()
  }, [hhLoading, householdId, fetch])

  const handleAdd = async () => {
    if (!householdId || !newName.trim()) return
    const nextOrder = categories.length
    const { error } = await supabase.from('categories').insert({
      household_id: householdId,
      name: newName.trim(),
      sort_order: nextOrder,
    })
    if (error) setError(error.message)
    else {
      setNewName('')
      fetch()
    }
  }

  const handleUpdate = async () => {
    if (!editingId) return
    const { error } = await supabase
      .from('categories')
      .update({ name: editName.trim(), sort_order: editOrder })
      .eq('id', editingId)
    if (error) setError(error.message)
    else {
      setEditingId(null)
      fetch()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category? Items referencing it will become uncategorised.')) return
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) setError(error.message)
    else fetch()
  }

  if (hhLoading || loading) {
    return <div className="text-sm text-text-mid">Loading categories...</div>
  }

  return (
    <div>
      <h2 className="mb-6 font-serif text-xl text-text">Categories</h2>

      {error && (
        <div className="mb-4 rounded-lg border border-red/20 bg-red-light px-4 py-2 text-sm text-red">
          {error}
        </div>
      )}

      <table className="mb-4 w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase text-text-light">
            <th className="px-3 py-2">Order</th>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <tr key={cat.id} className="border-b border-border">
              {editingId === cat.id ? (
                <>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={editOrder}
                      onChange={(e) => setEditOrder(+e.target.value)}
                      className="w-16 rounded border border-border px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded border border-border px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={handleUpdate} className="text-xs text-accent hover:underline">
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="ml-2 text-xs text-text-light hover:underline"
                    >
                      Cancel
                    </button>
                  </td>
                </>
              ) : (
                <>
                  <td className="px-3 py-2 text-text-mid">{cat.sort_order}</td>
                  <td className="px-3 py-2 text-text">{cat.name}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => {
                        setEditingId(cat.id)
                        setEditName(cat.name)
                        setEditOrder(cat.sort_order)
                      }}
                      className="text-xs text-text-light hover:text-accent"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="ml-2 text-xs text-text-light hover:text-red"
                    >
                      Delete
                    </button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex gap-2">
        <input
          placeholder="New category name"
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
