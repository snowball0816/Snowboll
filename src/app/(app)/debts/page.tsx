import { getDebts } from '@/lib/db'
import { MOCK_USER_ID } from '@/lib/mock/data'
import { Debt } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { CreditCard, TrendingDown, Plus, Lock } from 'lucide-react'
import Link from 'next/link'

export default async function DebtsPage() {
  const debts: Debt[] = await getDebts(MOCK_USER_ID)
  const active = debts.filter((d) => d.status === 'active')
  const paid   = debts.filter((d) => d.status === 'paid')

  const totalBalance  = active.reduce((s, d) => s + d.current_balance, 0)
  const totalMonthly  = active.reduce((s, d) => s + d.monthly_payment + (d.insurance_monthly ?? 0), 0)

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ color: 'var(--mint)', letterSpacing: '0.1em' }}>Gestión</p>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Mis Deudas</h1>
        </div>
        <Link href="/debts/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--mint)', color: '#071a12' }}>
          <Plus size={15} /> Nueva
        </Link>
      </div>

      {/* Totals strip */}
      {active.length > 0 && (
        <div className="grid grid-cols-3 gap-px rounded-2xl overflow-hidden"
          style={{ background: 'var(--border)' }}>
          {[
            { label: 'Total adeudado',   value: formatCurrency(totalBalance),  color: '#f87171' },
            { label: 'Cuotas mensuales', value: formatCurrency(totalMonthly),  color: 'var(--mint)' },
            { label: 'Deudas activas',   value: String(active.length),         color: 'var(--text-primary)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="px-5 py-3.5" style={{ background: 'var(--bg-surface)' }}>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
              <p className="text-lg font-bold" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Active list */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
          Activas ({active.length})
        </p>
        {active.length === 0 ? (
          <div className="text-center py-10 rounded-2xl"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin deudas activas</p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            {active.map((debt, i) => (
              <DebtRow key={debt.id} debt={debt} order={i + 1} last={i === active.length - 1} />
            ))}
          </div>
        )}
      </section>

      {/* Paid */}
      {paid.length > 0 && (
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
            Liquidadas ({paid.length})
          </p>
          <div className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid var(--border)', background: 'var(--bg-surface)', opacity: 0.6 }}>
            {paid.map((debt, i) => (
              <DebtRow key={debt.id} debt={debt} last={i === paid.length - 1} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function DebtRow({ debt, order, last }: { debt: Debt; order?: number; last?: boolean }) {
  const progress = debt.initial_balance > 0
    ? ((debt.initial_balance - debt.current_balance) / debt.initial_balance) * 100
    : 100

  return (
    <Link href={`/debts/${debt.id}`}>
      <div
        className="row-hover flex items-center gap-4 px-5 py-3.5"
        style={{ borderBottom: last ? 'none' : '1px solid var(--border)' }}
      >
        {/* Order badge */}
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={
            order
              ? { background: 'var(--mint-dim)', color: 'var(--mint)' }
              : { background: 'var(--bg-raised)', color: 'var(--text-muted)' }
          }>
          {order ?? <Lock size={10} />}
        </div>

        {/* Type icon */}
        <div className="shrink-0" style={{ color: 'var(--text-muted)' }}>
          {debt.type === 'credit_card' ? <CreditCard size={14} /> : <TrendingDown size={14} />}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {debt.entity}
          </p>
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{debt.name}</p>
          {debt.type === 'credit_card' && debt.payment_due_date && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Pago límite día <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{debt.payment_due_date}</span>
            </p>
          )}
          {debt.type === 'loan' && debt.due_date && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Vence <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{new Date(debt.due_date).toLocaleDateString('es-CO', { year: 'numeric', month: 'short' })}</span>
            </p>
          )}
        </div>

        {/* Rate */}
        <div className="hidden sm:block text-center w-16 shrink-0">
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            {debt.interest_rate}%
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>EA</p>
        </div>

        {/* Progress bar */}
        <div className="hidden md:block w-28 shrink-0">
          <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            <span>{Math.round(progress)}% pagado</span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-raised)' }}>
            <div className="h-full rounded-full"
              style={{
                width: `${Math.min(100, progress)}%`,
                background: 'var(--mint)',
                boxShadow: '0 0 5px rgba(16,185,129,0.35)',
              }} />
          </div>
        </div>

        {/* Monthly */}
        <div className="text-right shrink-0 w-28">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {formatCurrency(debt.monthly_payment + (debt.insurance_monthly ?? 0))}<span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/mes</span>
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {formatCurrency(debt.current_balance)} restante
          </p>
        </div>
      </div>
    </Link>
  )
}
