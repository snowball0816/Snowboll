import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3 text-sm',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  style,
  ...props
}: ButtonProps) {
  const baseStyle: React.CSSProperties =
    variant === 'primary'
      ? { background: 'var(--mint)', color: '#071a12', fontWeight: 600 }
      : variant === 'secondary'
      ? { background: 'var(--bg-raised)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
      : variant === 'danger'
      ? { background: '#dc2626', color: '#fff' }
      : { background: 'transparent', color: 'var(--text-secondary)' }

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed',
        sizes[size],
        className,
      )}
      style={{ ...baseStyle, ...style }}
      {...props}
    >
      {children}
    </button>
  )
}
