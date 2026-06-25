import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  mint?: boolean
}

export function Card({ children, className, style, mint }: CardProps) {
  return (
    <div
      className={cn('rounded-2xl p-5', className)}
      style={{
        background: 'var(--bg-surface)',
        border: mint ? '1px solid var(--mint-border)' : '1px solid var(--border)',
        ...(mint && { boxShadow: '0 0 0 0 transparent, 0 4px 24px rgba(45,212,160,0.08)' }),
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn('text-xs font-semibold uppercase tracking-widest', className)}
      style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
      {children}
    </h3>
  )
}
