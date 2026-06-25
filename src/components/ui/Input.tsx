import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef, useEffect, useRef, useCallback } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  prefix?: string
  suffix?: string
}

function fmtCOP(raw: string): string {
  const digits = raw.replace(/\./g, '').replace(/[^0-9-]/g, '')
  if (digits === '' || digits === '-') return digits
  const n = Number(digits)
  if (isNaN(n)) return digits
  return n.toLocaleString('es-CO')
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, prefix, suffix, className, type, onChange, onFocus, onBlur, ...props }, ref) => {
    const isCurrency = type === 'number' && prefix === '$'
    const isNumber = type === 'number'
    const localRef = useRef<HTMLInputElement>(null)

    const combinedRef = useCallback((node: HTMLInputElement | null) => {
      localRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node
    }, [ref])

    // Format initial value set by react-hook-form defaultValues
    useEffect(() => {
      if (isCurrency && localRef.current && localRef.current.value !== '') {
        localRef.current.value = fmtCOP(localRef.current.value)
      }
    }, [isCurrency])

    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-3.5 text-sm pointer-events-none"
              style={{ color: 'var(--text-muted)' }}>
              {prefix}
            </span>
          )}
          <input
            ref={combinedRef}
            type={isCurrency ? 'text' : type}
            inputMode={isCurrency ? 'numeric' : undefined}
            className={cn(
              'w-full rounded-xl text-sm transition-all outline-none',
              'py-2.5',
              prefix ? 'pl-8 pr-3.5' : 'px-3.5',
              suffix ? 'pr-10' : '',
              className,
            )}
            style={{
              background: 'var(--bg-raised)',
              border: error ? '1px solid var(--red)' : '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
            onFocus={e => {
              if (isCurrency) {
                e.currentTarget.value = e.currentTarget.value.replace(/\./g, '')
              }
              e.currentTarget.style.border = '1px solid var(--mint-border)'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45,212,160,0.08)'
              onFocus?.(e)
            }}
            onBlur={e => {
              if (isCurrency) {
                const raw = e.currentTarget.value.replace(/\./g, '')
                e.currentTarget.value = raw   // raw value for react-hook-form to read
                onBlur?.(e)                   // react-hook-form validates against raw
                e.currentTarget.value = fmtCOP(raw)  // then format for display
              } else {
                onBlur?.(e)
              }
              e.currentTarget.style.border = error ? '1px solid var(--red)' : '1px solid var(--border)'
              e.currentTarget.style.boxShadow = 'none'
            }}
            onChange={e => {
              if (isCurrency) {
                const raw = e.target.value.replace(/[^0-9-]/g, '')
                e.target.value = raw   // keep raw so react-hook-form stores clean number
              }
              onChange?.(e)
            }}
            onWheel={e => { if (isNumber) e.currentTarget.blur() }}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3.5 text-sm pointer-events-none"
              style={{ color: 'var(--text-muted)' }}>
              {suffix}
            </span>
          )}
        </div>
        {hint && !error && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
        {error && <p className="text-xs" style={{ color: 'var(--red)' }}>{error}</p>}
      </div>
    )
  },
)

Input.displayName = 'Input'
export default Input
