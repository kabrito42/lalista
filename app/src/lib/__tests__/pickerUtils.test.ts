import { describe, it, expect } from 'vitest'
import { buildInitialSelections } from '../pickerUtils'

const makeItem = (
  id: string,
  name: string,
  isStaple: boolean,
  categoryId: string | null = null,
  defaultQty = 1,
  unit: string | null = 'each',
) => ({
  id,
  name,
  is_staple: isStaple,
  category_id: categoryId,
  default_qty: defaultQty,
  unit,
})

const categories = [
  { id: 'cat-1', name: 'Dairy & Eggs' },
  { id: 'cat-2', name: 'Produce' },
]

describe('buildInitialSelections', () => {
  it('includes staple items in the selection Map', () => {
    const items = [makeItem('1', 'Milk', true, 'cat-1', 2, 'bottle')]
    const result = buildInitialSelections(items, categories)
    expect(result.size).toBe(1)
    expect(result.get('1')).toEqual({
      id: '1',
      name: 'Milk',
      quantity: 2,
      unit: 'bottle',
      category: 'Dairy & Eggs',
    })
  })

  it('excludes non-staple items', () => {
    const items = [
      makeItem('1', 'Milk', true, 'cat-1'),
      makeItem('2', 'Chocolate', false, 'cat-1'),
    ]
    const result = buildInitialSelections(items, categories)
    expect(result.size).toBe(1)
    expect(result.has('1')).toBe(true)
    expect(result.has('2')).toBe(false)
  })

  it('resolves category name from category lookup', () => {
    const items = [makeItem('1', 'Bananas', true, 'cat-2')]
    const result = buildInitialSelections(items, categories)
    expect(result.get('1')?.category).toBe('Produce')
  })

  it('uses "Uncategorised" for items with null category_id', () => {
    const items = [makeItem('1', 'Random Item', true, null)]
    const result = buildInitialSelections(items, categories)
    expect(result.get('1')?.category).toBe('Uncategorised')
  })

  it('uses "Uncategorised" for items with stale category_id', () => {
    const items = [makeItem('1', 'Old Item', true, 'deleted-cat-id')]
    const result = buildInitialSelections(items, categories)
    expect(result.get('1')?.category).toBe('Uncategorised')
  })

  it('defaults unit to "each" when item unit is null', () => {
    const items = [makeItem('1', 'Garlic', true, 'cat-2', 1, null)]
    const result = buildInitialSelections(items, categories)
    expect(result.get('1')?.unit).toBe('each')
  })

  it('returns empty Map for empty items array', () => {
    const result = buildInitialSelections([], categories)
    expect(result.size).toBe(0)
  })

  it('returns empty Map when no items are staples', () => {
    const items = [
      makeItem('1', 'Chips', false, 'cat-1'),
      makeItem('2', 'Ice Cream', false, 'cat-1'),
    ]
    const result = buildInitialSelections(items, categories)
    expect(result.size).toBe(0)
  })

  it('handles multiple staple items across categories', () => {
    const items = [
      makeItem('1', 'Milk', true, 'cat-1', 2, 'bottle'),
      makeItem('2', 'Eggs', true, 'cat-1', 1, 'dozen'),
      makeItem('3', 'Lettuce', true, 'cat-2', 1, 'each'),
      makeItem('4', 'Chocolate', false, 'cat-1'),
    ]
    const result = buildInitialSelections(items, categories)
    expect(result.size).toBe(3)
  })
})
