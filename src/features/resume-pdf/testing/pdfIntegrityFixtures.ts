import { parseCVState } from '@/features/cv/model/parse'
import { type CVState } from '@/features/cv/model/types'

// Synthetic CVs for the PDF text-integrity and round-trip tests. They contain no
// personal data. Dates use the "Mon YYYY" form the Builder's date fields suggest.

export type FixtureLanguage = 'en' | 'pt'
export type FixtureFont = 'Helvetica' | 'Times New Roman' | 'Courier New'

interface LanguageContent {
  titles: Record<'workExperience' | 'education' | 'projects' | 'skills' | 'languages' | 'customSections', string>
  summary: string
  roles: string[]
  companies: string[]
  bullets: string[]
  education: Array<{ school: string, degree: string, location: string, startDate: string, endDate: string, details: string[] }>
  project: { name: string, link: string, bullets: string[] }
  technicalSkills: string[]
  softSkills: string[]
  languages: Array<{ name: string, proficiency: string }>
  custom: { title: string, bullets: string[] }
  profile: { name: string, email: string, phone: string, location: string, website: string, github: string, linkedin: string }
}

const EN: LanguageContent = {
  titles: { workExperience: 'Experience', education: 'Education', projects: 'Projects', skills: 'Skills', languages: 'Languages', customSections: 'Certifications' },
  summary: 'Full-stack software engineer with eight years of experience building reliable, accessible, and observable distributed systems. Passionate about developer tooling, mentoring, and well-documented APIs (REST/GraphQL).',
  roles: ['Senior Software Engineer', 'Staff Platform Engineer', 'Software Engineer II'],
  companies: ['Northwind Systems Ltd.', 'Contoso Cloud Inc.', 'Fabrikam Labs'],
  bullets: [
    'Led the migration of 14 critical services to Kubernetes, improving reliability by 35% and cutting deploy time from 40 min to 6 min.',
    'Designed CI/CD pipelines (GitHub Actions, Docker, Terraform) that reduced release failures by 62% across 9 teams.',
    'Mentored five engineers; authored an onboarding handbook used by 120+ new hires.',
    'Built a high-throughput event-processing service in Node.js/TypeScript handling 25,000 requests/second with p99 latency under 80 ms.',
    'Implemented observability (OpenTelemetry, Prometheus, Grafana) and on-call runbooks; MTTR dropped 48%.',
    'Co-authored the internal API style guide: pagination, idempotency-keys, error-model, and deprecation-policy.',
  ],
  education: [
    { school: 'University of Porto', degree: 'MSc in Computer Science', location: 'Porto, Portugal', startDate: 'Sep 2014', endDate: 'Jul 2016', details: ['Thesis: Fault-tolerant consensus in partially synchronous networks.'] },
    { school: 'University of Minho', degree: 'BSc in Informatics Engineering', location: 'Braga, Portugal', startDate: 'Sep 2011', endDate: 'Jul 2014', details: [] },
  ],
  project: { name: 'OpenTrace Dashboard', link: 'https://github.com/example-org/opentrace-dashboard', bullets: ['Open-source trace viewer with 1.2k GitHub stars.', 'Supports OTLP/gRPC and Zipkin ingestion.'] },
  technicalSkills: ['TypeScript', 'JavaScript', 'Node.js', 'Next.js', 'React', 'FastAPI', 'PostgreSQL', 'Redis', 'Docker', 'Kubernetes', 'Terraform', 'GitHub Actions', 'CI/CD', 'REST/GraphQL', 'C++', 'C#', '.NET', 'gRPC', 'Python', 'Go'],
  softSkills: ['Technical leadership', 'Mentoring', 'Stakeholder communication'],
  languages: [{ name: 'English', proficiency: 'Fluent' }, { name: 'Portuguese', proficiency: 'Native' }, { name: 'Spanish', proficiency: 'Intermediate' }],
  custom: { title: 'Certifications', bullets: ['AWS Certified Solutions Architect - Professional (2023)', 'Certified Kubernetes Administrator (CKA), 2022'] },
  profile: { name: 'Alex Morgan', email: 'alex.morgan@example.org', phone: '+44 20 7946 0958', location: 'London, UK', website: 'https://alexmorgan.example.org/portfolio', github: 'github.com/alexmorgan-example', linkedin: 'https://www.linkedin.com/in/alex-morgan-example' },
}

const PT: LanguageContent = {
  titles: { workExperience: 'Experiência Profissional', education: 'Formação Académica', projects: 'Projetos', skills: 'Competências', languages: 'Línguas', customSections: 'Certificações' },
  summary: 'Engenheira de software com oito anos de experiência na construção de sistemas distribuídos fiáveis, acessíveis e observáveis. Especialista em integração contínua, automação e comunicação com a equipa de produto.',
  roles: ['Engenheira de Software Sénior', 'Programadora Full-Stack', 'Analista de Sistemas'],
  companies: ['Soluções Digitais, Lda.', 'Atlântico Software S.A.', 'Câmara Municipal de Guimarães'],
  bullets: [
    'Liderou a migração de 14 serviços críticos para Kubernetes, aumentando a fiabilidade em 35% e reduzindo o tempo de implementação de 40 para 6 minutos.',
    'Desenhou pipelines de integração contínua que reduziram falhas de lançamento em 62% em 9 equipas.',
    'Orientou cinco colegas e redigiu o manual de integração utilizado por mais de 120 novos colaboradores.',
    'Implementou monitorização e procedimentos de resposta a incidentes; o tempo médio de resolução desceu 48%.',
  ],
  education: [{ school: 'Universidade do Minho', degree: 'Mestrado em Engenharia Informática', location: 'Guimarães, Portugal', startDate: 'Set 2014', endDate: 'Jul 2016', details: ['Dissertação: Consenso tolerante a falhas em redes parcialmente síncronas.'] }],
  project: { name: 'Plataforma de Candidaturas Açoriana', link: 'https://exemplo.pt/projetos/candidaturas', bullets: ['Aplicação web para gestão de candidaturas, com acessibilidade AA.'] },
  technicalSkills: ['TypeScript', 'Node.js', 'React', 'PostgreSQL', 'Docker', 'Kubernetes', 'Integração contínua', 'Gestão de configuração', 'C#', 'Python'],
  softSkills: ['Comunicação', 'Liderança técnica'],
  languages: [{ name: 'Português', proficiency: 'Língua materna' }, { name: 'Inglês', proficiency: 'Fluente' }, { name: 'Francês', proficiency: 'Intermédio' }],
  custom: { title: 'Certificações', bullets: ['Certificação AWS Solutions Architect (2023)', 'Formação em Segurança da Informação, ISCTE (2021)'] },
  profile: { name: 'Inês Gonçalves Mendes', email: 'ines.mendes@exemplo.pt', phone: '+351 912 345 678', location: 'Guimarães, Portugal', website: 'https://inesmendes.exemplo.pt', github: 'github.com/ines-mendes-exemplo', linkedin: 'https://www.linkedin.com/in/ines-mendes-exemplo' },
}

const MONTHS = ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov']

export interface FixtureOptions {
  language?: FixtureLanguage
  font?: FixtureFont
  size?: 'A4' | 'Letter'
  jobs?: number
  summary?: string
  extraBullets?: string[]
  fontSize?: number
  extraSkills?: string[]
  projectName?: string
}

export function fixtureContent(language: FixtureLanguage) {
  return language === 'pt' ? PT : EN
}

export function buildFixtureState(options: FixtureOptions = {}): CVState {
  const { language = 'en', font = 'Helvetica', size = 'A4', jobs = 3 } = options
  const content = fixtureContent(language)
  const workExperience = Array.from({ length: jobs }, (_, index) => ({
    id: `work-${index}`,
    company: content.companies[index % content.companies.length],
    role: content.roles[index % content.roles.length],
    location: language === 'pt' ? 'Porto, Portugal' : 'London, United Kingdom',
    startDate: `${MONTHS[index % MONTHS.length]} ${2023 - index}`,
    endDate: index === 0 ? '' : `${MONTHS[(index + 3) % MONTHS.length]} ${2024 - index}`,
    isCurrent: index === 0,
    bullets: [...content.bullets.slice(0, 4), ...(options.extraBullets ?? [])],
  }))
  const state = parseCVState({
    schemaVersion: '1.0.0',
    updatedAt: '2026-11-19T00:00:00.000Z',
    resume: {
      profile: { ...content.profile, summary: options.summary ?? content.summary },
      workExperience,
      education: content.education.map((item, index) => ({ id: `education-${index}`, ...item })),
      projects: [{ id: 'project-0', startDate: 'Mar 2022', endDate: 'Jan 2023', ...content.project, name: options.projectName ?? content.project.name }],
      skills: { featured: [], featuredWithRating: [], technical: [...content.technicalSkills, ...(options.extraSkills ?? [])], soft: content.softSkills },
      languages: content.languages.map((item, index) => ({ id: `language-${index}`, ...item })),
      customSections: [{ id: 'custom-0', ...content.custom }],
    },
    settings: {
      documentSize: size,
      fontFamily: font,
      ...(options.fontSize ? { fontSize: options.fontSize } : {}),
      visibleSections: { workExperience: true, education: true, projects: true, skills: true, languages: true, customSections: true },
      bulletVisibility: {},
      sectionTitles: content.titles,
    },
  })
  if (!state) throw new Error('Fixture state failed schema validation.')
  return state
}
