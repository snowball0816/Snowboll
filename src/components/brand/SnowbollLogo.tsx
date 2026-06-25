import { cn } from '@/lib/utils'

interface IconProps {
  size?: number
  className?: string
}

/** Ícono cuadrado redondeado — para sidebar colapsado, favicon, etc. */
export function SnowbollIcon({ size = 36, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Snowboll"
    >
      {/* Fondo */}
      <rect width="100" height="100" rx="24" fill="#10b981" />

      {/* Trayectoria punteada */}
      <path
        d="M22 80 Q40 66 58 52 Q72 40 84 26"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="3 6"
        opacity="0.35"
      />

      {/* Bolas crecientes en arco diagonal */}
      <circle cx="22" cy="80" r="6"  fill="white" opacity="0.30" />
      <circle cx="38" cy="68" r="10" fill="white" opacity="0.50" />
      <circle cx="58" cy="52" r="15" fill="white" opacity="0.72" />
      <circle cx="81" cy="30" r="21" fill="white" />
    </svg>
  )
}

/** Logo completo: ícono + wordmark */
export function SnowbollWordmark({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const iconSize = size === 'sm' ? 28 : size === 'lg' ? 44 : 34
  const textSize = size === 'sm' ? 15 : size === 'lg' ? 22 : 17

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <SnowbollIcon size={iconSize} />
      <span
        style={{
          fontSize: textSize,
          fontWeight: 700,
          letterSpacing: '-0.5px',
          color: 'var(--text-primary)',
          lineHeight: 1,
        }}
      >
        Snow<span style={{ color: '#10b981' }}>boll</span>
      </span>
    </div>
  )
}
