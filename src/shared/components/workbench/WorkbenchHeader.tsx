import { type ReactNode } from 'react'

interface WorkbenchHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  sticky?: boolean
  className?: string
  descriptionClassName?: string
  eyebrowClassName?: string
  actionsClassName?: string
}

export function WorkbenchHeader({
  eyebrow,
  title,
  description,
  actions,
  sticky = true,
  className = '',
  descriptionClassName,
  eyebrowClassName,
  actionsClassName,
}: WorkbenchHeaderProps) {
  const stickyClasses = sticky 
    ? 'sticky top-0 z-20 bg-bg/95 backdrop-blur-md shadow-sm border-b border-border' 
    : ''

  return (
    <header className={`${stickyClasses} px-5 lg:px-8 py-3 lg:py-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-stretch justify-between gap-3 sm:gap-4">
        <div className="workspace-head compact !mb-0 min-w-0">
          {eyebrow && (
            <div className={eyebrowClassName ?? "crumbline hidden sm:block"}>
              {eyebrow}
            </div>
          )}
          <h1>{title}</h1>
          {description && (
            <p className={descriptionClassName ?? "muted text-[11px] leading-relaxed max-w-sm mt-1 hidden lg:block"}>
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className={actionsClassName ?? "pt-0.5 shrink-0 self-start sm:self-start"}>
            {actions}
          </div>
        )}
      </div>
    </header>
  )
}
