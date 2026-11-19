import { describe, expect, it } from 'vitest'
import { defaultCVState } from '@/features/cv/model/defaults'
import { type CVState } from '@/features/cv/model/types'
import { findUnsupportedPdfCharacters, MAX_REPORTED_CHARACTERS, unsupportedCharactersInCV } from './pdfCharacterSupport'

describe('PDF character support', () => {
  it('accepts ASCII, Western European letters, and typographic punctuation', () => {
    const text = 'Zoë Brontë, café, naïve, Ångström, Straße, “quotes”, • bullet, …, €, ™'
    expect(findUnsupportedPdfCharacters(text)).toEqual([])
  })

  it.each([
    ['Polish', 'Łukasz Żółć', ['Ł', 'Ż', 'ł', 'ć']],
    ['Greek', 'Αθήνα', ['Α', 'θ', 'ή', 'ν', 'α']],
    ['Cyrillic', 'Мос', ['М', 'о', 'с']],
    ['CJK', '東京', ['東', '京']],
    ['emoji', 'Launched \u{1F680}', ['\u{1F680}']],
  ])('reports %s characters once each', (_, text, expected) => {
    expect(findUnsupportedPdfCharacters(text)).toEqual(expected)
  })

  it('checks only text that appears in the PDF', () => {
    const state = JSON.parse(JSON.stringify(defaultCVState)) as CVState
    state.resume.profile.name = 'Alex М'
    expect(unsupportedCharactersInCV(state)).toEqual(['М'])
    state.resume.profile.name = 'Alex'
    state.resume.projects = [{ id: 'p', name: '東', link: '', startDate: '', endDate: '', bullets: [] }]
    state.settings.visibleSections.projects = false
    expect(unsupportedCharactersInCV(state)).toEqual([])
  })
})

describe('unsupported character list length', () => {
  it('collects one more than it reports so the notice can say the list is incomplete', () => {
    const many = 'ŁŻłćřőűășțğşΑΒΓΔΕ'
    expect(findUnsupportedPdfCharacters(many)).toHaveLength(MAX_REPORTED_CHARACTERS + 1)
    expect(findUnsupportedPdfCharacters('ŁŻ')).toEqual(['Ł', 'Ż'])
  })
})
