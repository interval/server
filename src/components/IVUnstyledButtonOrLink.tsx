import { Link } from 'react-router-dom'
import { logger } from '~/utils/logger'

export interface IVUnstyledButtonOrLinkProps
  extends React.HTMLAttributes<HTMLAnchorElement | HTMLButtonElement> {
  href?: string
  state?: Record<string, string>
  onClick?: () => void
  className?: string
  children: React.ReactNode
}

export default function IVUnstyledButtonOrLink({
  href,
  state,
  onClick,
  className,
  children,
  ...rest
}: IVUnstyledButtonOrLinkProps) {
  if (href) {
    return (
      <Link to={href} state={state} className={className} {...rest}>
        {children}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button onClick={onClick} className={className} {...rest}>
        {children}
      </button>
    )
  }
  logger.warn('Neither href nor onClick were provided')
  return null
}
