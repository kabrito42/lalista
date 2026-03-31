import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../hooks/useHousehold'
import RecipeIngredients from '../components/RecipeIngredients'
import type { Database } from '../types/database'

type Recipe = Database['public']['Tables']['recipes']['Row']
type RecipeInsert = Database['public']['Tables']['recipes']['Insert']

const EMPTY_FORM: Omit<RecipeInsert, 'household_id'> = {
  title: '',
  servings: null,
  prep_time: null,
  cook_time: null,
  source_url: null,
  directions: null,
  notes: null,
}

export default function RecipesPage() {
  const { householdId, loading: hhLoading } = useHousehold()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Recipe | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchRecipes = useCallback(async () => {
    if (!householdId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('household_id', householdId)
      .order('updated_at', { ascending: false })
    if (error) setError(error.message)
    else setRecipes(data ?? [])
    setLoading(false)
  }, [householdId])

  useEffect(() => {
    if (!hhLoading && householdId) fetchRecipes()
  }, [hhLoading, householdId, fetchRecipes])

  const filtered = recipes.filter(
    (r) =>
      !search || r.title.toLowerCase().includes(search.toLowerCase()),
  )

  const openNew = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
    setError('')
  }

  const openEdit = (recipe: Recipe) => {
    setEditing(recipe)
    setForm({
      title: recipe.title,
      servings: recipe.servings,
      prep_time: recipe.prep_time,
      cook_time: recipe.cook_time,
      source_url: recipe.source_url,
      directions: recipe.directions,
      notes: recipe.notes,
    })
    setShowForm(true)
    setError('')
  }

  const handleSave = async () => {
    if (!householdId || !form.title?.trim()) return
    setSaving(true)
    setError('')

    if (editing) {
      const { error } = await supabase
        .from('recipes')
        .update({ ...form, title: form.title!.trim() })
        .eq('id', editing.id)
      if (error) setError(error.message)
    } else {
      const { error } = await supabase
        .from('recipes')
        .insert({ ...form, title: form.title!.trim(), household_id: householdId })
      if (error) setError(error.message)
    }

    setSaving(false)
    if (!error) {
      setShowForm(false)
      fetchRecipes()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this recipe?')) return
    const { error } = await supabase.from('recipes').delete().eq('id', id)
    if (error) setError(error.message)
    else fetchRecipes()
  }

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  if (hhLoading || loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-mid">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        Loading recipes...
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="font-serif text-xl text-text">Recipes</h2>
        <button
          onClick={openNew}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
        >
          + Add Recipe
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search recipes..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full max-w-xs rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-light"
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red/20 bg-red-light px-4 py-2 text-sm text-red">
          {error}
        </div>
      )}

      {/* Recipe list */}
      {filtered.length === 0 ? (
        <p className="text-sm text-text-light">
          {search ? 'No recipes match your search.' : 'No recipes yet. Add your first recipe!'}
        </p>
      ) : (
        <div className="grid gap-3">
          {filtered.map((recipe) => (
            <div
              key={recipe.id}
              className="flex items-start gap-4 rounded-xl border border-border bg-surface p-4"
            >
              {recipe.image_url && (
                <img
                  src={recipe.image_url}
                  alt={recipe.title}
                  className="h-20 w-20 shrink-0 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-text">{recipe.title}</h3>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-text-light">
                  {recipe.servings && <span>Serves {recipe.servings}</span>}
                  {recipe.prep_time && <span>Prep {recipe.prep_time}m</span>}
                  {recipe.cook_time && <span>Cook {recipe.cook_time}m</span>}
                </div>
                {recipe.notes && (
                  <p className="mt-2 text-sm text-text-mid">{recipe.notes}</p>
                )}
              </div>
              <div className="ml-4 flex gap-2">
                <button
                  onClick={() => openEdit(recipe)}
                  className="rounded-lg border border-border px-3 py-1 text-xs text-text-mid hover:bg-surface-alt"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(recipe.id)}
                  className="rounded-lg border border-red/20 bg-red-light px-3 py-1 text-xs text-red hover:bg-red/10"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-xl bg-surface p-6 shadow-lg">
            <h3 className="mb-4 font-serif text-lg">
              {editing ? 'Edit Recipe' : 'New Recipe'}
            </h3>

            <div className="flex flex-col gap-3">
              <input
                placeholder="Title *"
                value={form.title ?? ''}
                onChange={(e) => setField('title', e.target.value)}
                className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="number"
                  placeholder="Servings"
                  value={form.servings ?? ''}
                  onChange={(e) => setField('servings', e.target.value ? +e.target.value : null)}
                  className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <input
                  type="number"
                  placeholder="Prep (min)"
                  value={form.prep_time ?? ''}
                  onChange={(e) => setField('prep_time', e.target.value ? +e.target.value : null)}
                  className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <input
                  type="number"
                  placeholder="Cook (min)"
                  value={form.cook_time ?? ''}
                  onChange={(e) => setField('cook_time', e.target.value ? +e.target.value : null)}
                  className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>
              <input
                placeholder="Source URL"
                value={form.source_url ?? ''}
                onChange={(e) => setField('source_url', e.target.value || null)}
                className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <textarea
                placeholder="Directions"
                rows={4}
                value={form.directions ?? ''}
                onChange={(e) => setField('directions', e.target.value || null)}
                className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <textarea
                placeholder="Notes"
                rows={2}
                value={form.notes ?? ''}
                onChange={(e) => setField('notes', e.target.value || null)}
                className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>

            {editing && <RecipeIngredients recipeId={editing.id} />}

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-mid hover:bg-surface-alt"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title?.trim()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
