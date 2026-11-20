'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Brand } from '@/shared/components/ui/Brand'

interface AppHeaderProps {
  title?: string
}

export function AppHeader({
  title = 'Workbench',
}: AppHeaderProps) {
  const pathname = usePathname()

  return (
    <header className="app-header">
      <Brand href="/" size="compact" className="brand-mini" />

      <div className="crumbs">
        <span className="active" title={title}>{title}</span>
      </div>

      <span className="badge">
        <span className="dot" />
        LOCAL ONLY
      </span>

      <span className="spacer" />

      <div className="actions">
        <Link
          href="/builder"
          className={`btn sm app-mode-link ${pathname === '/builder' ? 'active' : ''}`}
          aria-current={pathname === '/builder' ? 'page' : undefined}
        >
          Builder
        </Link>
        <Link
          href="/analyzer"
          className={`btn sm app-mode-link ${pathname === '/analyzer' ? 'active' : ''}`}
          aria-current={pathname === '/analyzer' ? 'page' : undefined}
        >
          Analyzer
        </Link>
      </div>
    </header>
  )
}
