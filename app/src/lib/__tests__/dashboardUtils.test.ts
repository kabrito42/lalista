import { describe, it, expect } from 'vitest'
import { computeSessionStats } from '../dashboardUtils'

const makeSession = (status: string, finalList: unknown[] | null = null) => ({
  status,
  final_list: finalList,
})

const item = (name: string, category?: string) => ({
  name,
  quantity: 1,
  unit: 'each',
  category,
})

describe('computeSessionStats', () => {
  describe('completedCount', () => {
    it('counts finalised and dispatched sessions as completed', () => {
      const sessions = [
        makeSession('draft'),
        makeSession('finalised', [item('A')]),
        makeSession('dispatched', [item('B')]),
        makeSession('review'),
      ]
      expect(computeSessionStats(sessions).completedCount).toBe(2)
    })

    it('returns 0 when no sessions are completed', () => {
      const sessions = [makeSession('draft'), makeSession('planning')]
      expect(computeSessionStats(sessions).completedCount).toBe(0)
    })
  })

  describe('avgItems', () => {
    it('calculates average items per completed session', () => {
      const sessions = [
        makeSession('finalised', [item('A'), item('B'), item('C')]),
        makeSession('dispatched', [item('D')]),
      ]
      // 4 items / 2 sessions = 2
      expect(computeSessionStats(sessions).avgItems).toBe(2)
    })

    it('rounds to nearest integer', () => {
      const sessions = [
        makeSession('finalised', [item('A'), item('B'), item('C')]),
        makeSession('dispatched', [item('D'), item('E')]),
      ]
      // 5 items / 2 sessions = 2.5 → rounds to 3
      expect(computeSessionStats(sessions).avgItems).toBe(3)
    })

    it('returns 0 when no completed sessions (no divide-by-zero)', () => {
      const sessions = [makeSession('draft')]
      expect(computeSessionStats(sessions).avgItems).toBe(0)
    })

    it('handles completed sessions with null final_list', () => {
      const sessions = [makeSession('finalised', null)]
      expect(computeSessionStats(sessions).avgItems).toBe(0)
    })
  })

  describe('categoryDistribution', () => {
    it('aggregates items by category across completed sessions', () => {
      const sessions = [
        makeSession('finalised', [
          item('Milk', 'Dairy'),
          item('Eggs', 'Dairy'),
          item('Bread', 'Bakery'),
        ]),
        makeSession('dispatched', [item('Cheese', 'Dairy')]),
      ]
      const dist = computeSessionStats(sessions).categoryDistribution
      expect(dist.find((d) => d.name === 'Dairy')?.value).toBe(3)
      expect(dist.find((d) => d.name === 'Bakery')?.value).toBe(1)
    })

    it('uses "Other" for items with no category', () => {
      const sessions = [makeSession('finalised', [item('Mystery Item')])]
      const dist = computeSessionStats(sessions).categoryDistribution
      expect(dist[0]).toEqual({ name: 'Other', value: 1 })
    })

    it('sorted by value descending and limited to top 10', () => {
      const items = Array.from({ length: 12 }, (_, i) =>
        item(`Item ${i}`, `Cat ${i}`),
      )
      const sessions = [makeSession('finalised', items)]
      const dist = computeSessionStats(sessions).categoryDistribution
      expect(dist.length).toBe(10)
    })

    it('returns empty array when no completed sessions', () => {
      const sessions = [makeSession('draft')]
      expect(computeSessionStats(sessions).categoryDistribution).toEqual([])
    })
  })

  describe('itemFrequency', () => {
    it('counts item frequency using case-insensitive matching', () => {
      const sessions = [
        makeSession('finalised', [item('Banana'), item('banana'), item('BANANA')]),
      ]
      const freq = computeSessionStats(sessions).itemFrequency
      expect(freq).toHaveLength(1)
      expect(freq[0].count).toBe(3)
    })

    it('sorted by count descending and limited to top 5', () => {
      const items = Array.from({ length: 8 }, (_, i) =>
        item(`Item${i}`),
      )
      // Add extra occurrences for first 3
      items.push(item('Item0'), item('Item1'), item('Item2'))
      const sessions = [makeSession('finalised', items)]
      const freq = computeSessionStats(sessions).itemFrequency
      expect(freq.length).toBe(5)
      // Top 3 should have count 2
      expect(freq[0].count).toBe(2)
    })

    it('returns empty array when no completed sessions', () => {
      expect(computeSessionStats([]).itemFrequency).toEqual([])
    })
  })

  describe('edge cases', () => {
    it('empty sessions array returns all zeros/empty', () => {
      const result = computeSessionStats([])
      expect(result.completedCount).toBe(0)
      expect(result.avgItems).toBe(0)
      expect(result.categoryDistribution).toEqual([])
      expect(result.itemFrequency).toEqual([])
    })
  })
})
