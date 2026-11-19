import Image from 'next/image'
import Link from 'next/link'

interface BrandProps {
  href?: string
  className?: string
  size?: 'large' | 'compact' | 'default'
}

/** CVForge product brand: official logo mark plus the two-tone CVForge wordmark. */
export function Brand({ href, className = 'brand', size = 'default' }: BrandProps) {
  const dimensions =
    size === 'large'
      ? { width: 54, height: 60 }
      : size === 'compact'
        ? { width: 30, height: 34 }
        : { width: 25, height: 28 }

  const rootClass = [
    className,
    size === 'large' ? 'brand-lg' : size === 'compact' ? 'brand-compact' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const inner = (
    <>
      <span className="brand-logo" aria-hidden="true">
        <Image
          src="/brand/cvforge-logo.png"
          alt=""
          width={dimensions.width}
          height={dimensions.height}
          priority={size === 'large'}
        />
      </span>
      <span className="brand-name">
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
