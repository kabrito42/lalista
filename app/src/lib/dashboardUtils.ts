interface ListItem {
  name: string
  quantity: string | number
  unit: string
  category?: string
}

interface SessionLike {
  status: string
  final_list: unknown
}

export interface SessionStats {
  completedCount: number
  avgItems: number
  categoryDistribution: { name: string; value: number }[]
  itemFrequency: { name: string; count: number }[]
}

/**
 * Computes aggregate statistics from an array of sessions.
 * Completed = status 'finalised' or 'dispatched'.
 */
export function computeSessionStats(sessions: SessionLike[]): SessionStats {
  const completed = sessions.filter(
    (s) => s.status === 'finalised' || s.status === 'dispatched',
  )

  const allFinalItems = completed.flatMap(
    (s) => ((s.final_list as ListItem[]) ?? []),
  )

  const avgItems =
    completed.length > 0
      ? Math.round(allFinalItems.length / completed.length)
      : 0

  // Category distribution
  const categoryCount = allFinalItems.reduce(
    (acc, item) => {
      const cat = item.category ?? 'Other'
      acc[cat] = (acc[cat] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )
  const categoryDistribution = Object.entries(categoryCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  // Item frequency (case-insensitive)
  const freqMap = allFinalItems.reduce(
    (acc, item) => {
      const key = item.name.toLowerCase()
      acc[key] = { name: item.name, count: (acc[key]?.count ?? 0) + 1 }
      return acc
    },
    {} as Record<string, { name: string; count: number }>,
  )
  const itemFrequency = Object.values(freqMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    completedCount: completed.length,
    avgItems,
    categoryDistribution,
    itemFrequency,
  }
}
