export interface FreeformItem {
  name: string
  quantity: number
  unit: string
  source: string
}

/**
 * Parses freeform text (one item per line) into structured list items.
 * Empty and whitespace-only lines are filtered out.
 */
export function parseFreeformItems(text: string): FreeformItem[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((name) => ({ name, quantity: 1, unit: 'each', source: 'manual' }))
}
