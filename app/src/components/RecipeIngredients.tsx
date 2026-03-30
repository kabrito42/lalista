import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'

type Ingredient = Database['public']['Tables']['recipe_ingredients']['Row']

interface Props {
  recipeId: string
}

export default function RecipeIngredients({ recipeId }: Props) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [colesProduct, setColesProduct] = useState('')
  const [colesResults, setColesResults] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const fetchIngredients = useCallback(async () => {
    const { data } = await supabase
      .from('recipe_ingredients')
      .select('*')
      .eq('recipe_id', recipeId)
      .order('sort_order')
    setIngredients(data ?? [])
    setLoading(false)
  }, [recipeId])

  useEffect(() => {
    fetchIngredients()
  }, [fetchIngredients])

  // Coles product autocomplete via pg_trgm
  const searchColes = async (query: string) => {
    if (query.length < 2) {
      setColesResults([])
      return
    }
    const { data } = await supabase
      .from('coles_preferences')
      .select('product_name')
      .ilike('product_name', `%${query}%`)
      .limit(5)
    setColesResults(data?.map((d) => d.product_name) ?? [])
  }

  const resetForm = () => {
    setText('')
    setQuantity('')
    setUnit('')
    setColesProduct('')
    setColesResults([])
    setEditingId(null)
  }

  const handleAdd = async () => {
    if (!text.trim()) return
    setSaving(true)
    const nextOrder = ingredients.length
    const { error } = await supabase.from('recipe_ingredients').insert({
      recipe_id: recipeId,
      text: text.trim(),
      quantity: quantity || null,
      unit: unit || null,
      coles_product: colesProduct || null,
      sort_order: nextOrder,
    })
    if (!error) {
      resetForm()
      fetchIngredients()
    }
    setSaving(false)
  }

  const handleUpdate = async () => {
    if (!editingId || !text.trim()) return
    setSaving(true)
    const { error } = await supabase
      .from('recipe_ingredients')
      .update({
        text: text.trim(),
        quantity: quantity || null,
        unit: unit || null,
        coles_product: colesProduct || null,
      })
      .eq('id', editingId)
    if (!error) {
      resetForm()
      fetchIngredients()
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('recipe_ingredients').delete().eq('id', id)
    fetchIngredients()
  }

  const startEdit = (ing: Ingredient) => {
    setEditingId(ing.id)
    setText(ing.text)
    setQuantity(ing.quantity ?? '')
    setUnit(ing.unit ?? '')
    setColesProduct(ing.coles_product ?? '')
  }

  const moveIngredient = async (id: string, direction: -1 | 1) => {
    const idx = ingredients.findIndex((i) => i.id === id)
    const swapIdx = idx + direction
    if (swapIdx < 0 || swapIdx >= ingredients.length) return
    await Promise.all([
      supabase
        .from('recipe_ingredients')
        .update({ sort_order: swapIdx })
        .eq('id', ingredients[idx].id),
      supabase
        .from('recipe_ingredients')
        .update({ sort_order: idx })
        .eq('id', ingredients[swapIdx].id),
    ])
    fetchIngredients()
  }

  if (loading) return <p className="text-xs text-text-light">Loading ingredients...</p>

  return (
    <div className="mt-4 border-t border-border pt-4">
      <h4 className="mb-2 text-sm font-semibold text-text">Ingredients</h4>

      {/* List */}
      {ingredients.length > 0 && (
        <div className="mb-3 flex flex-col gap-1">
          {ingredients.map((ing, idx) => (
            <div
              key={ing.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-1.5 text-sm"
            >
              <div className="flex flex-col">
                <button
                  onClick={() => moveIngredient(ing.id, -1)}
                  disabled={idx === 0}
                  className="text-[10px] leading-none text-text-light hover:text-text disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  onClick={() => moveIngredient(ing.id, 1)}
                  disabled={idx === ingredients.length - 1}
                  className="text-[10px] leading-none text-text-light hover:text-text disabled:opacity-30"
                >
                  ▼
                </button>
              </div>
              <span className="flex-1">
                {ing.quantity && <span className="text-text-mid">{ing.quantity} </span>}
                {ing.unit && <span className="text-text-mid">{ing.unit} </span>}
                <span className="text-text">{ing.text}</span>
                {ing.coles_product && (
                  <span className="ml-2 rounded bg-accent-light px-1.5 py-0.5 text-[10px] text-accent">
                    {ing.coles_product}
                  </span>
                )}
              </span>
              <button
                onClick={() => startEdit(ing)}
                className="text-xs text-text-light hover:text-accent"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(ing.id)}
                className="text-xs text-text-light hover:text-red"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add/edit form */}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-4 gap-2">
          <input
            placeholder="Qty"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="rounded border border-border px-2 py-1.5 text-xs outline-none focus:border-accent"
          />
          <input
            placeholder="Unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="rounded border border-border px-2 py-1.5 text-xs outline-none focus:border-accent"
          />
          <input
            placeholder="Ingredient *"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="col-span-2 rounded border border-border px-2 py-1.5 text-xs outline-none focus:border-accent"
          />
        </div>
        <div className="relative">
          <input
            placeholder="Coles product (type to search)"
            value={colesProduct}
            onChange={(e) => {
              setColesProduct(e.target.value)
              searchColes(e.target.value)
            }}
            className="w-full rounded border border-border px-2 py-1.5 text-xs outline-none focus:border-accent"
          />
          {colesResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded border border-border bg-surface shadow-md">
              {colesResults.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setColesProduct(r)
                    setColesResults([])
                  }}
                  className="block w-full px-3 py-1.5 text-left text-xs hover:bg-surface-alt"
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {editingId ? (
            <>
              <button
                onClick={handleUpdate}
                disabled={saving || !text.trim()}
                className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Update'}
              </button>
              <button
                onClick={resetForm}
                className="rounded border border-border px-3 py-1.5 text-xs text-text-mid hover:bg-surface-alt"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={handleAdd}
              disabled={saving || !text.trim()}
              className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-50"
            >
              {saving ? 'Adding...' : '+ Add Ingredient'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
