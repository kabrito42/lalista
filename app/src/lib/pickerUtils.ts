export interface Selection {
  id: string
  name: string
  quantity: number
  unit: string
  category: string
}

interface LonglistItemLike {
  id: string
  name: string
  is_staple: boolean
  default_qty: number
  unit: string | null
  category_id: string | null
}

interface CategoryLike {
  id: string
  name: string
}

/**
 * Builds the initial selection Map from longlist items, pre-selecting
 * items flagged as staples with their category names resolved.
 */
export function buildInitialSelections(
  items: LonglistItemLike[],
  categories: CategoryLike[],
): Map<string, Selection> {
  const initial = new Map<string, Selection>()

  for (const item of items) {
    if (item.is_staple) {
      const cat = categories.find((c) => c.id === item.category_id)
      initial.set(item.id, {
        id: item.id,
        name: item.name,
        quantity: item.default_qty,
        unit: item.unit ?? 'each',
        category: cat?.name ?? 'Uncategorised',
      })
    }
  }

  return initial
}
