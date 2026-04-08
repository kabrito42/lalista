import { describe, it, expect } from 'vitest'
import { generateFinalList, type ListItem } from '../reviewUtils'

const meal = (name: string, overrides?: Partial<ListItem>): ListItem => ({
  name,
  quantity: 1,
  unit: 'each',
  source: 'meal',
  ...overrides,
})

const other = (name: string, overrides?: Partial<ListItem>): ListItem => ({
  name,
  quantity: 1,
  unit: 'each',
  source: 'other_items',
  ...overrides,
})

describe('generateFinalList', () => {
  // --- Pantry exclusion ---
  describe('pantry exclusion', () => {
    it('excludes an item whose name exactly matches a pantry item (case-insensitive)', () => {
      const result = generateFinalList(
        [meal('Salt')],
        [],
        ['salt'],
      )
      expect(result.finalList).toHaveLength(0)
      expect(result.pantryExclusions).toEqual(['Salt'])
    })

    it('excludes case-insensitively ("Butter" excluded by pantry "butter")', () => {
      const result = generateFinalList(
        [meal('Butter')],
        [],
        ['butter'],
      )
      expect(result.finalList).toHaveLength(0)
      expect(result.pantryExclusions).toEqual(['Butter'])
    })

    it('uses substring matching — pantry "salt" excludes "salted butter" (known behaviour)', () => {
      // NOTE: This documents the current substring-match behaviour.
      // "salt" is a substring of "salted butter", so it gets excluded.
      // This is a known false-positive risk flagged in the test strategy.
      const result = generateFinalList(
        [meal('Salted Butter')],
        [],
        ['salt'],
      )
      expect(result.finalList).toHaveLength(0)
      expect(result.pantryExclusions).toEqual(['Salted Butter'])
    })

    it('uses bidirectional substring matching — item "oil" excluded by pantry "olive oil"', () => {
      const result = generateFinalList(
        [meal('Oil')],
        [],
        ['olive oil'],
      )
      expect(result.finalList).toHaveLength(0)
      expect(result.pantryExclusions).toEqual(['Oil'])
    })

    it('passes through items with no pantry match', () => {
      const result = generateFinalList(
        [meal('Chicken Breast')],
        [],
        ['salt', 'pepper', 'olive oil'],
      )
      expect(result.finalList).toHaveLength(1)
      expect(result.finalList[0].name).toBe('Chicken Breast')
      expect(result.pantryExclusions).toHaveLength(0)
    })

    it('handles empty pantry names', () => {
      const result = generateFinalList([meal('Bread')], [], [])
      expect(result.finalList).toHaveLength(1)
      expect(result.pantryExclusions).toHaveLength(0)
    })
  })

  // --- Deduplication ---
  describe('deduplication', () => {
    it('keeps first occurrence and drops duplicate (case-insensitive)', () => {
      const result = generateFinalList(
        [meal('Banana')],
        [other('banana')],
        [],
      )
      // otherItems processed first, so the other_items "banana" is kept
      expect(result.finalList).toHaveLength(1)
      expect(result.finalList[0].source).toBe('other_items')
      expect(result.droppedDuplicates).toHaveLength(1)
      expect(result.droppedDuplicates[0].source).toBe('meal')
    })

    it('keeps first occurrence when same name but different quantities', () => {
      const result = generateFinalList(
        [meal('Tomatoes', { quantity: 6 })],
        [other('Tomatoes', { quantity: 2 })],
        [],
      )
      expect(result.finalList).toHaveLength(1)
      expect(result.finalList[0].quantity).toBe(2) // other_items first
      expect(result.droppedDuplicates).toHaveLength(1)
    })

    it('passes through all unique items', () => {
      const result = generateFinalList(
        [meal('Apples'), meal('Oranges')],
        [other('Bread')],
        [],
      )
      expect(result.finalList).toHaveLength(3)
      expect(result.droppedDuplicates).toHaveLength(0)
    })
  })

  // --- Source merging order ---
  describe('source merging', () => {
    it('processes otherItems before mealItems', () => {
      const result = generateFinalList(
        [meal('Milk')],
        [other('Milk')],
        [],
      )
      expect(result.finalList).toHaveLength(1)
      expect(result.finalList[0].source).toBe('other_items')
    })

    it('includes items from both sources when names are unique', () => {
      const result = generateFinalList(
        [meal('Chicken')],
        [other('Rice')],
        [],
      )
      expect(result.finalList).toHaveLength(2)
      const sources = result.finalList.map((i) => i.source)
      expect(sources).toContain('other_items')
      expect(sources).toContain('meal')
    })

    it('handles empty mealItems', () => {
      const result = generateFinalList([], [other('Bread')], [])
      expect(result.finalList).toHaveLength(1)
    })

    it('handles empty otherItems', () => {
      const result = generateFinalList([meal('Eggs')], [], [])
      expect(result.finalList).toHaveLength(1)
    })
  })

  // --- Edge cases ---
  describe('edge cases', () => {
    it('all inputs empty returns empty results', () => {
      const result = generateFinalList([], [], [])
      expect(result.finalList).toHaveLength(0)
      expect(result.pantryExclusions).toHaveLength(0)
      expect(result.droppedDuplicates).toHaveLength(0)
    })

    it('handles items with leading/trailing whitespace in names', () => {
      const result = generateFinalList(
        [meal('  Bread  ')],
        [other('bread')],
        [],
      )
      // Both trimmed to "bread" — dedup should catch it
      expect(result.finalList).toHaveLength(1)
      expect(result.droppedDuplicates).toHaveLength(1)
    })

    it('pantry exclusion and dedup interact correctly', () => {
      // "salt" excluded by pantry, "Pepper" excluded by pantry,
      // "Bread" appears twice — one kept, one deduped
      const result = generateFinalList(
        [meal('Salt'), meal('Bread')],
        [other('Pepper'), other('Bread')],
        ['salt', 'pepper'],
      )
      expect(result.pantryExclusions).toEqual(['Pepper', 'Salt'])
      expect(result.finalList).toHaveLength(1)
      expect(result.finalList[0].name).toBe('Bread')
      expect(result.droppedDuplicates).toHaveLength(1)
    })
  })
})
