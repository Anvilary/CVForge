'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Brand } from '@/shared/components/ui/Brand'
import { Icon } from '@/shared/components/ui/Icon'

interface SiteHeaderProps {
  onBuilderClick?: () => void
}

export function SiteHeader({ onBuilderClick }: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const pathname = usePathname()

  useLayoutEffect(() => {
    const header = headerRef.current
    if (!header) return

    const updateHeaderHeight = () => {
      document.documentElement.style.setProperty(
        '--site-header-height',
        `${header.getBoundingClientRect().height}px`,
      )
    }

    updateHeaderHeight()
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updateHeaderHeight)
    observer?.observe(header)
    window.addEventListener('resize', updateHeaderHeight)

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', updateHeaderHeight)
      document.documentElement.style.removeProperty('--site-header-height')
    }
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header ref={headerRef} className={`site-header ${scrolled ? 'scrolled' : ''}`}>
      <div className="site-header-inner">
        <Brand href="/" size="lg" />

        <span className="spacer" />

        <nav aria-label="Main navigation">
          <Link
            href="/builder"
            className={`nav-link ${pathname === '/builder' ? 'active' : ''}`}
            aria-current={pathname === '/builder' ? 'page' : undefined}
          >
            <span className="nav-label">Builder</span>
          </Link>
          <Link
            href="/analyzer"
            className={`nav-link ${pathname === '/analyzer' ? 'active' : ''}`}
            aria-current={pathname === '/analyzer' ? 'page' : undefined}
          >
            <span className="nav-label">Analyzer</span>
          </Link>
        </nav>

        <div className="actions">
          <a
            href="https://github.com/Anvilary/CVForge"
            target="_blank"
            rel="noopener noreferrer"
            className="btn sm github-star"
            aria-label="Open GitHub to star the CVForge repository (opens in a new tab)"
            title="Opens GitHub to star the repository"
          >
            <Icon name="github" size={16} />
            <span className="star-label">Star on GitHub</span>
          </a>
          {onBuilderClick ? (
            <button type="button" className="btn primary sm" onClick={onBuilderClick}>
              <span className="build-label-full">Build your CV</span>
              <span className="build-label-compact">Build CV</span>
            </button>
          ) : (
            <Link href="/builder" className="btn primary sm">
              <span className="build-label-full">Build your CV</span>
              <span className="build-label-compact">Build CV</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
