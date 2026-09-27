import { expect, test } from 'vitest'
import { matches } from './words'

test('matches plurals and suffixes, skips lookalikes, keeps mention order', () => {
  const dict = { search: ['flight'], price: ['budget'], car: ['car'], calm: ['meditat'] }
  expect(matches('Budget flights, a career in meditation', dict)).toEqual([
    { key: 'price', word: 'budget' },
    { key: 'search', word: 'flights' },
    { key: 'calm', word: 'meditation' },
  ])
})

test('mood triggers leave everyday brief words alone', async () => {
  const { TRIGGERS } = await import('./moods')
  const plain = 'the and we our want people visitors should feel career example classic highly update brand main thing'
  expect(matches(plain, TRIGGERS)).toEqual([])
})
