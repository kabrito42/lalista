import { describe, it, expect } from 'vitest'
import { groupByCategory, formatForClipboard, type ListItem } from '../finaliseUtils'

const item = (name: string, category?: string): ListItem => ({
  name,
  quantity: 1,
  unit: 'each',
  source: 'meal',
  category,
})

describe('groupByCategory', () => {
  it('groups items by their category', () => {
    const items = [
      item('Milk', 'Dairy'),
      item('Eggs', 'Dairy'),
      item('Bread', 'Bakery'),
    ]
    const grouped = groupByCategory(items)
    expect(Object.keys(grouped)).toEqual(['Dairy', 'Bakery'])
    expect(grouped['Dairy']).toHaveLength(2)
    expect(grouped['Bakery']).toHaveLength(1)
  })

  it('groups items with null/missing category under "Other"', () => {
    const items = [item('Mystery'), item('Unknown', undefined)]
    const grouped = groupByCategory(items)
    expect(Object.keys(grouped)).toEqual(['Other'])
    expect(grouped['Other']).toHaveLength(2)
  })

  it('returns empty object for empty array', () => {
    expect(groupByCategory([])).toEqual({})
  })

  it('handles mix of categorised and uncategorised items', () => {
    const items = [
      item('Milk', 'Dairy'),
      item('Something'),
      item('Bread', 'Bakery'),
    ]
    const grouped = groupByCategory(items)
    expect(Object.keys(grouped).sort()).toEqual(['Bakery', 'Dairy', 'Other'])
  })
})

describe('formatForClipboard', () => {
  it('formats items as "qty unit name" per line', () => {
    const items: ListItem[] = [
      { name: 'Milk', quantity: 2, unit: 'bottle', source: 'meal' },
      { name: 'Bread', quantity: 1, unit: 'loaf', source: 'meal' },
    ]
    expect(formatForClipboard(items)).toBe('2 bottle Milk\n1 loaf Bread')
  })

  it('returns empty string for empty array', () => {
    expect(formatForClipboard([])).toBe('')
  })

  it('handles single item without trailing newline', () => {
    const items: ListItem[] = [
      { name: 'Eggs', quantity: 1, unit: 'dozen', source: 'meal' },
    ]
    expect(formatForClipboard(items)).toBe('1 dozen Eggs')
  })
})
