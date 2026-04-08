import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../hooks/useHousehold'
import { useSession } from '../contexts/SessionContext'
import type { Database } from '../types/database'

type Recipe = Database['public']['Tables']['recipes']['Row']
type WeeklyMeal = Database['public']['Tables']['weekly_meals']['Row']

export default function MealsPage() {
  const { householdId } = useHousehold()
  const { session, loading: sessionLoading, refreshSession } = useSession()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [meals, setMeals] = useState<WeeklyMeal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchAll = useCallback(async () => {
    if (!householdId) return

    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('household_id', householdId)
      .order('title')
    if (error) setError(error.message)
    setRecipes(data ?? [])

    if (session) {
      const { data: mealsData } = await supabase
        .from('weekly_meals')
        .select('*')
        .eq('session_id', session.id)
      setMeals(mealsData ?? [])
    }

    setLoading(false)
  }, [householdId, session])

  useEffect(() => {
    if (!sessionLoading && householdId) fetchAll()
  }, [sessionLoading, householdId, fetchAll])

  const addMeal = async (recipeId: string) => {
    if (!session) return
    const { error } = await supabase.from('weekly_meals').insert({
      session_id: session.id,
      recipe_id: recipeId,
    })
    if (error) setError(error.message)
    else fetchAll()
  }

  const removeMeal = async (mealId: string) => {
    const { error } = await supabase.from('weekly_meals').delete().eq('id', mealId)
    if (error) setError(error.message)
    else fetchAll()
  }

  const importMealIngredients = async () => {
    if (!session || meals.length === 0) return
    setError('')

    const recipeIds = meals.map((m) => m.recipe_id)
    const { data: ingredients, error: ingError } = await supabase
      .from('recipe_ingredients')
      .select('text, quantity, unit, coles_product')
      .in('recipe_id', recipeIds)

    if (ingError) {
      setError(ingError.message)
      return
    }

    const mealIngredients = (ingredients ?? []).map((ing) => ({
      name: ing.text,
      quantity: ing.quantity ?? '1',
      unit: ing.unit ?? 'each',
      coles_product: ing.coles_product,
      source: 'meal',
    }))

    const { error } = await supabase
      .from('weekly_sessions')
      .update({ meal_ingredients: mealIngredients })
      .eq('id', session.id)

    if (error) setError(error.message)
    else {
      await refreshSession()
      fetchAll()
    }
  }

  const selectedRecipeIds = new Set(meals.map((m) => m.recipe_id))

  if (sessionLoading || loading) {
    return <div className="text-sm text-text-mid">Loading meals...</div>
  }

  if (!session) {
    return (
      <div>
        <h2 className="mb-4 font-serif text-xl text-text">Meals</h2>
        <p className="text-sm text-text-light">No active session. Start one from the Session screen first.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="font-serif text-xl text-text">Meals</h2>
        <button
          onClick={importMealIngredients}
          disabled={meals.length === 0}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
        >
          Import Ingredients ({meals.length} meals)
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red/20 bg-red-light px-4 py-2 text-sm text-red">{error}</div>}

      {/* Selected meals */}
      {meals.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-semibold text-text">Selected Meals</h3>
          <div className="flex flex-col gap-1">
            {meals.map((meal) => {
              const recipe = recipes.find((r) => r.id === meal.recipe_id)
              return (
                <div
                  key={meal.id}
                  className="flex items-center justify-between rounded-lg border border-accent/20 bg-accent-light px-4 py-2"
                >
                  <span className="text-sm font-medium text-accent">
                    {recipe?.title ?? 'Unknown recipe'}
                  </span>
                  <button
                    onClick={() => removeMeal(meal.id)}
                    className="text-xs text-accent/60 hover:text-red"
                  >
                    Remove
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Available recipes */}
      <h3 className="mb-2 text-sm font-semibold text-text">Recipe Library</h3>
      {recipes.length === 0 ? (
        <p className="text-sm text-text-light">No recipes yet. Add some from the Recipes screen.</p>
      ) : (
        <div className="grid gap-1">
          {recipes.map((recipe) => {
            const isSelected = selectedRecipeIds.has(recipe.id)
            return (
              <div
                key={recipe.id}
                className={`flex items-center justify-between rounded-lg border px-4 py-2 ${
                  isSelected
                    ? 'border-accent/20 bg-accent-light'
                    : 'border-border bg-surface'
                }`}
              >
                <div>
                  <span className="text-sm text-text">{recipe.title}</span>
                  {recipe.servings && (
                    <span className="ml-2 text-xs text-text-light">Serves {recipe.servings}</span>
                  )}
                </div>
                {isSelected ? (
                  <span className="text-xs text-accent">Added</span>
                ) : (
                  <button
                    onClick={() => addMeal(recipe.id)}
                    className="rounded border border-accent px-3 py-1 text-xs text-accent hover:bg-accent hover:text-white"
                  >
                    + Add
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
