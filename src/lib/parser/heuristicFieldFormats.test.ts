import { describe, expect, it } from 'vitest'
import { extractDateRange } from './heuristic/dateParsing'
import { parseHeuristicResume } from './heuristicResumeParser'

function parse(text: string) {
  const result = parseHeuristicResume(text)
  if (!result) throw new Error('expected a parse result')
  return result.draft.resume
}

function header(contact: string) {
  return `Alex Morgan\nalex@example.org\n${contact}\nEXPERIENCE\nEngineer at Acme\n`
}

describe('phone numbers', () => {
  it.each([
    '+351 912 345 678',
    '+351912345678',
    '+44 20 7946 0958',
    '+44 7700 900123',
    '(555) 123-4567',
    '555-123-4567',
    '+1 234 567 890',
    '00351 912 345 678',
  ])('recognizes %s in the header', (phone) => {
    expect(parse(header(`${phone} Lisbon, Portugal`)).profile.phone).toBe(phone)
  })

  it.each(['2019 - 2021', 'Jan 2020 - Dec 2021', '4710-057 Braga', 'Version 3.12.4'])('does not read %s as a phone number', (line) => {
    expect(parse(header(line)).profile.phone).toBe('')
  })

  it('ignores numbers below the header', () => {
    const text = `${header('')}• Handled 912 345 678 requests\n`
    expect(parse(text).profile.phone).toBe('')
  })
})

describe('websites', () => {
  it('reads a scheme-less website from the contact line and not a project link', () => {
    const text = 'Alex Morgan\nalex@example.org alexmorgan.dev github.com/alexm\nEXPERIENCE\nEngineer at Acme\nPROJECTS\nTool\nhttps://example.org/tool\n'
    expect(parse(text).profile.website).toBe('https://alexmorgan.dev')
  })

  it('reads a website from a long separated contact line', () => {
    const text = 'Jane Doe\nLisbon, Portugal | +351 912 345 678 | jane@doe.dev | linkedin.com/in/janedoe | janedoe.dev\nEXPERIENCE\nDesigner at Acme\n'
    expect(parse(text).profile.website).toBe('https://janedoe.dev')
  })

  it('does not mistake technology names for a website', () => {
    const text = 'Alex Morgan\nalex@example.org\nBackend engineer: Node.js, ASP.NET\nEXPERIENCE\nEngineer at Acme\n'
    expect(parse(text).profile.website).toBe('')
  })
})

describe('role and company', () => {
  it('splits the middle-dot header CVForge prints, in either order', () => {
    const text = 'EXPERIENCE\nSenior Software Engineer · Northwind Systems Ltd. Jan 2023 - Present\nLondon, United Kingdom\n• Led the migration.\nNorthwind Systems Ltd. · Data Analyst Jan 2020 - Dec 2022\n• Built dashboards.\n'
    const [first, second] = parse(text).workExperience
    expect(first).toMatchObject({ role: 'Senior Software Engineer', company: 'Northwind Systems Ltd.', location: 'London, United Kingdom', isCurrent: true, bullets: ['Led the migration.'] })
    expect(second).toMatchObject({ role: 'Data Analyst', company: 'Northwind Systems Ltd.', bullets: ['Built dashboards.'] })
  })

  it('splits degree and school', () => {
    const text = 'EDUCATION\nMSc in Computer Science · University of Porto Sep 2014 - Jul 2016\nPorto, Portugal\n'
    expect(parse(text).education[0]).toMatchObject({ degree: 'MSc in Computer Science', school: 'University of Porto', location: 'Porto, Portugal' })
  })
})

describe('date ranges', () => {
  it.each([
    ['Jan 2020 - Dec 2021', 'Jan 2020', 'Dec 2021', false],
    ['Jan 2020 – Dec 2021', 'Jan 2020', 'Dec 2021', false],
    ['Jan 2020 – Present', 'Jan 2020', 'Present', true],
    ['Set 2014 – Jul 2016', 'Set 2014', 'Jul 2016', false],
    ['Janeiro de 2020 - Atual', 'Janeiro de 2020', 'Present', true],
    ['2019-03 - 2021-06', '2019-03', '2021-06', false],
    ['2019 to 2021', '2019', '2021', false],
    ['03/2019 \u2014 Presente', '03/2019', 'Present', true],
  ])('reads %s', (line, startDate, endDate, isCurrent) => {
    expect(extractDateRange(`Engineer ${line}`)).toMatchObject({ startDate, endDate, isCurrent })
  })
})

describe('languages', () => {
  it.each([
    ['English (Fluent) · Portuguese (Native) · Spanish (Intermediate)'],
    ['English - Fluent, Portuguese - Native, Spanish - Intermediate'],
    ['English: Fluent\nPortuguese: Native\nSpanish: Intermediate'],
  ])('reads %j', (block) => {
    const languages = parse(`LANGUAGES\n${block}\n`).languages
    expect(languages.map(({ name, proficiency }) => ({ name, proficiency }))).toEqual([
      { name: 'English', proficiency: 'Fluent' },
      { name: 'Portuguese', proficiency: 'Native' },
      { name: 'Spanish', proficiency: 'Intermediate' },
    ])
  })

  it('keeps a language without a level', () => {
    expect(parse('LANGUAGES\nEnglish, French\n').languages.map((item) => item.name)).toEqual(['English', 'French'])
  })
})

describe('summary and skills', () => {
  it('keeps a short wrapped last line of the unheaded summary', () => {
    const text = 'Alex Morgan\nalex@example.org\nBackend engineer building reliable and observable distributed systems with a focus on APIs\nand tooling.\nEXPERIENCE\nEngineer at Acme\n'
    expect(parse(text).profile.summary).toBe('Backend engineer building reliable and observable distributed systems with a focus on APIs and tooling.')
  })

  it('joins a skill wrapped across lines inside a comma list but not a one-per-line list', () => {
    expect(parse('SKILLS\nDocker, Kubernetes, Terraform, GitHub, CI/CD, TypeScript, Python, PostgreSQL, Redis, GitHub\nActions, Go\n').skills.technical).toContain('GitHub Actions')
    expect(parse('SKILLS\nDocker\nKubernetes\nTerraform\n').skills.technical).toEqual(['Docker', 'Kubernetes', 'Terraform'])
  })
})
