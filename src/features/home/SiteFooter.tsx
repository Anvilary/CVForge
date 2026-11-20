import Image from 'next/image'
import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="row footer-main">
        <a
          href="https://anvilary.tools"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-brand"
        >
          <span className="footer-brand-logo" aria-hidden="true">
            <Image
              src="/brand/anvilary-tools-logo.png"
              alt=""
              width={40}
              height={40}
            />
          </span>
          <span className="footer-brand-name">Anvilary Tools</span>
        </a>

        <span className="flex-1" />

        <nav className="footer-links" aria-label="Footer navigation">
          <Link href="/">Home</Link>
          <Link href="/builder">Builder</Link>
          <Link href="/analyzer">Analyzer</Link>
          <a
            href="https://github.com/Anvilary/CVForge"
            target="_blank"
            rel="noopener noreferrer"
          >
            Source
          </a>
        </nav>
      </div>

      <div className="row sub">
        <span>
          CV data stays in this browser. Export JSON for the most reliable backup.
        </span>
        <span className="flex-1" />
        <span>No account or server-side CV storage.</span>
      </div>
    </footer>
  )
}
