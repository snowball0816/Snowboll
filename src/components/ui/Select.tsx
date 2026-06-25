import { cn } from '@/lib/utils'
import { SelectHTMLAttributes, forwardRef } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn('w-full rounded-xl text-sm py-2.5 px-3.5 outline-none transition-all', className)}
          style={{
            background: 'var(--bg-raised)',
            border: error ? '1px solid var(--red)' : '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} style={{ background: 'var(--bg-raised)' }}>
              {o.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs" style={{ color: 'var(--red)' }}>{error}</p>}
      </div>
    )
  },
)

Select.displayName = 'Select'
export default Select
