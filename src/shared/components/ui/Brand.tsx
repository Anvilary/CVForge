import Image from 'next/image'
import Link from 'next/link'

interface BrandProps {
  href?: string
  className?: string
  size?: 'lg' | 'large' | 'compact' | 'md' | 'default'
}

/** CVForge product brand: official logo mark plus the two-tone CVForge wordmark. */
export function Brand({ href, className = 'brand', size = 'default' }: BrandProps) {
  const isLg = size === 'lg' || size === 'large'
  const isCompact = size === 'compact'
  const logoDim = isLg ? 80 : isCompact ? 34 : 28

  const rootClass = [
    'brand',
    isLg ? 'brand-lg' : isCompact ? 'brand-compact' : '',
    className && className !== 'brand' ? className : '',
  ]
    .filter(Boolean)
    .join(' ')

  const inner = (
    <>
      <span className="brand-logo" aria-hidden="true">
        <Image
          src="/brand/cvforge-logo.png"
          alt=""
          width={logoDim}
          height={logoDim}
          priority={isLg}
        />
      </span>
      <span className="brand-text">
        <span className="brand-cv" aria-hidden="true">CV</span>
        <span className="brand-forge" aria-hidden="true">Forge</span>
        <span className="sr-only">CVForge</span>
      </span>
    </>
  )

  if (href) {
    return (
      <Link href={href} className={rootClass} aria-label="CVForge home">
        {inner}
      </Link>
    )
  }

  return (
    <div className={rootClass} aria-label="CVForge">
      {inner}
    </div>
  )
}

interface AnvilaryBrandProps {
  href?: string
  size?: 'md' | 'lg'
}

/** Official Anvilary Tools parent organization brand. */
export function AnvilaryBrand({ href, size = 'md' }: AnvilaryBrandProps) {
  const isLg = size === 'lg'
  const className = isLg ? 'brand brand-lg' : 'brand'
  const logoDim = isLg ? 80 : 28

  const inner = (
    <>
      <span className="brand-logo" aria-hidden="true">
        <Image
          className="brand-logo"
          src="/brand/anvilary-tools-logo.png"
          alt=""
          width={logoDim}
          height={logoDim}
          priority={isLg}
        />
      </span>
      <span className="brand-text">
        <span className="brand-name">Anvilary</span>
        <span className="brand-suffix">.Tools</span>
      </span>
    </>
  )

  if (href) {
    return (
      <a
        href={href}
        className={className}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Anvilary Tools (opens in a new tab)"
      >
        {inner}
      </a>
    )
  }

  return <div className={className}>{inner}</div>
}
