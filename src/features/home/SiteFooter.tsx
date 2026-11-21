import Link from 'next/link'
import { AnvilaryBrand } from '@/shared/components/ui/Brand'

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <div className="row">
        <AnvilaryBrand href="https://anvilary.tools" size="md" />
        <span className="dot" aria-hidden="true">·</span>
        <span>Local-first · Zero server storage</span>
        <span className="dot" aria-hidden="true">·</span>
        <Link href="/builder">Builder</Link>
        <span className="dot" aria-hidden="true">·</span>
        <Link href="/analyzer">Analyzer</Link>
        <span className="dot" aria-hidden="true">·</span>
        <a
          href="https://github.com/Anvilary/CVForge"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        <span className="flex-1" />
        <span>© {year} Anvilary Tools</span>
      </div>
    </footer>
  )
}
