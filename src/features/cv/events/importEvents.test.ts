import { afterEach, expect, it, vi } from 'vitest'
import { defaultCVState, type CVState } from '@/types/cv'
import { clearImportedSections, markCVImported, peekImportedSections } from './importEvents'

afterEach(() => {
  clearImportedSections()
  vi.unstubAllGlobals()
})

it('publishes the latest imported sections before notifying listeners and retains them until consumed', () => {
  const browser = new EventTarget()
  vi.stubGlobal('window', browser)
  const state: CVState = {
    ...defaultCVState,
    resume: {
      ...defaultCVState.resume,
      profile: { ...defaultCVState.resume.profile, name: '  ' },
      skills: { ...defaultCVState.resume.skills, technical: ['TypeScript'] },
      workExperience: [{
        id: 'work', company: 'Example', role: 'Engineer', location: '',
        startDate: '', endDate: '', isCurrent: false, bullets: [],
      }],
      customSections: [{ id: 'custom', title: 'Activities', bullets: [] }],
    },
  }

  expect(peekImportedSections()).toBeNull()
  markCVImported(state)
  expect(peekImportedSections()).toEqual(['experience', 'skills', 'custom'])

  const received = vi.fn(() => peekImportedSections())
  browser.addEventListener('cvforge:cv-imported', received)
  markCVImported(defaultCVState)
  expect(received).toHaveReturnedWith([])
  expect(peekImportedSections()).toEqual([])

  clearImportedSections()
  expect(peekImportedSections()).toBeNull()
})
