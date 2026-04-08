export interface ListItem {
  name: string
  quantity: string | number
  unit: string
  source: string
  coles_product?: string
  category?: string
}

export interface FinalListResult {
  finalList: ListItem[]
  pantryExclusions: string[]
  droppedDuplicates: ListItem[]
}

/**
 * Merges items from meals and other sources, excludes pantry matches,
 * and deduplicates by name (case-insensitive). Other items are processed
 * before meal items — first occurrence wins.
 */
export function generateFinalList(
  mealItems: ListItem[],
  otherItems: ListItem[],
  pantryNames: string[],
): FinalListResult {
  const allItems = [...otherItems, ...mealItems]
  const normalisedPantry = pantryNames.map((p) => p.toLowerCase())

  const seen = new Map<string, ListItem>()
  const excluded: string[] = []
  const duplicates: ListItem[] = []

  for (const item of allItems) {
    const key = item.name.toLowerCase().trim()

    // Check pantry exclusion (substring match)
    if (normalisedPantry.some((p) => key.includes(p) || p.includes(key))) {
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

  return {
    finalList: Array.from(seen.values()),
    pantryExclusions: excluded,
    droppedDuplicates: duplicates,
  }
}
