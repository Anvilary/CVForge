import { describe, expect, it } from 'vitest'
import { detectSections, readableCoreHeadings, sectionForHeading } from './sectionDetection'

describe('section heading recognition', () => {
  it.each([
    ['EXPERIENCE', 'experience'],
    ['Work Experience', 'experience'],
    ['EDUCATION', 'education'],
    ['Experiência Profissional', 'experience'],
    ['FORMAÇÃO ACADÉMICA', 'education'],
    ['Competências', 'skills'],
    ['Línguas', 'languages'],
  ])('recognizes %s', (heading, key) => {
    expect(sectionForHeading(heading)?.key).toBe(key)
  })

  // Headings exported with letter tracking: what PDF.js returns for CVForge PDFs
  // made before the tracking was removed.
  it.each([
    ['E X P E R I E N C E', 'experience'],
    ['W O R K E X P E R I E N C E', 'experience'],
    ['E D U C AT I O N', 'education'],
    ['L A N G UAG E S', 'languages'],
    ['P R O J E C T S', 'projects'],
    ['S K I L L S', 'skills'],
    ['C E R T I F I C AT I O N S', 'certifications'],
    ['E X P E R I Ê N C I A P R O F I S S I O N A L', 'experience'],
    ['F O R M AÇ ÃO AC A D É M I C A', 'education'],
  ])('recognizes the letter-spaced form %s', (heading, key) => {
    expect(sectionForHeading(heading)?.key).toBe(key)
  })

  it('does not turn ordinary short lines into headings', () => {
    expect(sectionForHeading('A B C D E')).toBeNull()
    expect(sectionForHeading('J O H N D O E')).toBeNull()
    expect(sectionForHeading('Led a team of 5 engineers')).toBeNull()
  })

  it('splits a document on letter-spaced headings', () => {
    const sections = detectSections('Alex\nE X P E R I E N C E\nEngineer at Acme\nS K I L L S\nTypeScript, Docker')
    expect(sections.map((section) => section.key)).toEqual(['experience', 'skills'])
  })
})

describe('readable core headings (strict, for scoring)', () => {
  it('accepts common variants of the core headings in English and Portuguese', () => {
    expect(readableCoreHeadings('Key Skills\nRelevant Experience\nEducation & Certifications')).toEqual(['experience', 'education', 'skills'])
    expect(readableCoreHeadings('Experiência Profissional\nFormação Académica\nCompetências')).toEqual(['experience', 'education', 'skills'])
  })

  it('does not credit letter-spaced headings, sentences or lines with digits', () => {
    expect(readableCoreHeadings('E X P E R I E N C E\nE D U C AT I O N')).toEqual([])
    expect(readableCoreHeadings('I have five years of experience in design.\nExperience: 5 years')).toEqual([])
  })
})
