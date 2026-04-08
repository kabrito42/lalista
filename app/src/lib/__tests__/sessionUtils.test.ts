import { describe, it, expect } from 'vitest'
import { parseFreeformItems } from '../sessionUtils'

describe('parseFreeformItems', () => {
  it('parses a single line into one item', () => {
    const result = parseFreeformItems('Bread')
    expect(result).toEqual([
      { name: 'Bread', quantity: 1, unit: 'each', source: 'manual' },
    ])
  })

  it('parses multiple lines into multiple items', () => {
    const result = parseFreeformItems('Bread\nMilk\nEggs')
    expect(result).toHaveLength(3)
    expect(result.map((i) => i.name)).toEqual(['Bread', 'Milk', 'Eggs'])
  })

  it('filters out empty lines', () => {
    const result = parseFreeformItems('Bread\n\nMilk\n\n')
    expect(result).toHaveLength(2)
  })

  it('filters out whitespace-only lines', () => {
    const result = parseFreeformItems('Bread\n   \nMilk')
    expect(result).toHaveLength(2)
  })

  it('trims leading and trailing whitespace from names', () => {
    const result = parseFreeformItems('  Bread  \n  Milk  ')
    expect(result[0].name).toBe('Bread')
    expect(result[1].name).toBe('Milk')
  })

  it('returns empty array for empty string input', () => {
    expect(parseFreeformItems('')).toEqual([])
  })

  it('returns empty array for whitespace-only input', () => {
    expect(parseFreeformItems('   \n  \n  ')).toEqual([])
  })

  it('preserves special characters in names (commas, hyphens)', () => {
    const result = parseFreeformItems('Semi-dried tomatoes\nSalt, pepper')
    expect(result[0].name).toBe('Semi-dried tomatoes')
    expect(result[1].name).toBe('Salt, pepper')
  })

  it('does not parse quantity from text like "2x bread" (known limitation)', () => {
    // Freeform parsing is intentionally naive — the full string becomes the name
    const result = parseFreeformItems('2x bread')
    expect(result[0].name).toBe('2x bread')
    expect(result[0].quantity).toBe(1)
  })

  it('all items have source: manual', () => {
    const result = parseFreeformItems('A\nB\nC')
    expect(result.every((i) => i.source === 'manual')).toBe(true)
  })
})
