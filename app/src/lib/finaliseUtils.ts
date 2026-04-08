export interface ListItem {
  name: string
  quantity: string | number
  unit: string
  source: string
  category?: string
}

/**
 * Groups items by category. Items with no category are grouped under 'Other'.
 */
export function groupByCategory(items: ListItem[]): Record<string, ListItem[]> {
  return items.reduce(
    (acc, item) => {
      const cat = item.category ?? 'Other'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(item)
      return acc
    },
    {} as Record<string, ListItem[]>,
  )
}

/**
 * Formats items for clipboard as "qty unit name" per line.
 */
export function formatForClipboard(items: ListItem[]): string {
  return items.map((i) => `${i.quantity} ${i.unit} ${i.name}`).join('\n')
}
