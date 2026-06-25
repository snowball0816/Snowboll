import { getActiveDebts, getPurchases } from '@/lib/db'
import { MOCK_USER_ID } from '@/lib/mock/data'
import { Debt } from '@/types'
import { runSnowball } from '@/lib/engines/snowball'
import { formatCurrency, formatDate } from '@/lib/utils'
import { monthlyCardObligation } from '@/lib/engines/creditCard'
import { TrendingDown, Calendar, DollarSign, Target, ArrowRight, CreditCard, Landmark } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const debts: Debt[] = await getActiveDebts(MOCK_USER_ID)

  const debtPayments = await Promise.all(
    debts.map(async (debt) => {
      let cuota = 0
      if (debt.type === 'credit_card') {
        const purchases = await getPurchases(debt.id)
        cuota = monthlyCardObligation(debt, purchases)
      } else {
        cuota = debt.monthly_payment
      }
      const seguro = debt.insurance_monthly ?? 0
      return { debt, cuota, seguro, total: cuota + seguro }
    })
  )

  const totalDebt = debts.reduce((s, d) => s + d.current_balance, 0)
  const totalMes  = debtPayments.reduce((s, x) => s + x.total, 0)
  const snowball  = debts.length > 0 ? runSnowball(debts) : null
  const target    = debts[0] ?? null

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ color: 'var(--mint)', letterSpacing: '0.1em' }}>Panel principal</p>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Resumen financiero</h1>
        </div>
        <Link href="/debts/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--mint)', color: '#fff' }}>
          + Nueva deuda
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="rounded-2xl p-5"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
            style={{ background: 'rgba(239,68,68,0.1)' }}>
            <DollarSign size={17} style={{ color: 'var(--red)' }} />
          </div>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Total adeudado</p>
          <p className="text-xl font-bold" style={{ color: 'var(--red)' }}>{formatCurrency(totalDebt)}</p>
        </div>
        <div className="rounded-2xl p-5"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
            style={{ background: 'var(--mint-dim)' }}>
            <TrendingDown size={17} style={{ color: 'var(--mint)' }} />
          </div>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Pago este mes</p>
          <p className="text-xl font-bold" style={{ color: 'var(--mint)' }}>{formatCurrency(totalMes)}</p>
        </div>
        <div className="rounded-2xl p-5 col-span-2 md:col-span-1"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
            style={{ background: 'rgba(14,165,233,0.1)' }}>
            <Calendar size={17} style={{ color: 'var(--sky)' }} />
          </div>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Fecha de libertad</p>
          <p className="text-base font-bold" style={{ color: 'var(--sky)' }}>
            {snowball ? formatDate(snowball.payoffDate) : '—'}
          </p>
        </div>
      </div>

      {/* Pagos este mes */}
      <div className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid var(--border)' }}>
        <div className="px-5 py-4 flex items-center justify-between"
          style={{ background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--text-muted)' }}>Obligaciones</p>
            <p className="font-bold" style={{ color: 'var(--text-primary)' }}>Pagos de este mes</p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total</p>
            <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalMes)}</p>
          </div>
        </div>
        {debtPayments.length === 0 ? (
          <div className="py-10 text-center" style={{ background: 'var(--bg-surface)' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin deudas activas</p>
            <Link href="/debts/new" className="text-sm font-medium mt-2 inline-block"
              style={{ color: 'var(--mint)' }}>Registrar primera deuda →</Link>
          </div>
        ) : (
          <div style={{ background: 'var(--bg-surface)' }}>
            {debtPayments.map(({ debt, cuota, seguro, total }, i) => (
              <Link key={debt.id} href={`/debts/${debt.id}`}>
                <div className="row-hover flex items-center gap-4 px-5 py-4"
                  style={{ borderBottom: i < debtPayments.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: debt.type === 'credit_card' ? 'rgba(99,102,241,0.1)' : 'rgba(245,158,11,0.1)' }}>
                    {debt.type === 'credit_card'
                      ? <CreditCard size={15} style={{ color: '#6366f1' }} />
                      : <Landmark size={15} style={{ color: 'var(--amber)' }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      {debt.entity}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      {debt.name} · {debt.interest_rate}% EA
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(total)}
                    </p>
                    {seguro > 0 && (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        cuota {formatCurrency(cuota)} + seguro {formatCurrency(seguro)}
                      </p>
                    )}
                  </div>
                  <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} className="shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Objetivo Bola de Nieve */}
      {target && (
        <div className="rounded-2xl p-5"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--mint-border)',
            boxShadow: '0 4px 24px rgba(16,185,129,0.06)',
          }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--mint-dim)' }}>
              <Target size={14} style={{ color: 'var(--mint)' }} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--mint)', letterSpacing: '0.08em' }}>
              Objetivo actual — Bola de Nieve
            </p>
          </div>
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{target.entity}</p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {target.name} · {target.interest_rate}% EA
              </p>
              {target.insurance_monthly ? (
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  + seguro {formatCurrency(target.insurance_monthly)}/mes
                </p>
              ) : null}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold" style={{ color: 'var(--mint)' }}>
                {formatCurrency(target.current_balance)}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>saldo pendiente</p>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
              <span>Progreso</span>
              <span>{Math.round(((target.initial_balance - target.current_balance) / target.initial_balance) * 100)}% pagado</span>
            </div>
            <div className="h-2 rounded-full" style={{ background: 'var(--bg-raised)' }}>
              <div className="h-full rounded-full"
                style={{
                  background: 'var(--mint)',
                  width: `${Math.min(100, ((target.initial_balance - target.current_balance) / target.initial_balance) * 100)}%`,
                  boxShadow: '0 0 8px rgba(16,185,129,0.3)',
                }} />
            </div>
          </div>
        </div>
      )}

      {/* Proyección + orden de ataque */}
      {snowball && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl p-5"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ color: 'var(--text-muted)' }}>Proyección Bola de Nieve</p>
            <div className="space-y-3">
              <div className="rounded-xl p-4" style={{ background: 'var(--bg-raised)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Intereses totales proyectados</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--red)' }}>
                  {formatCurrency(snowball.totalInterest)}
                </p>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'var(--bg-raised)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Libre de deudas en</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--mint)' }}>
                  {snowball.totalMonths} meses
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{formatDate(snowball.payoffDate)}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl p-5"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'var(--text-muted)' }}>Orden de ataque</p>
              <Link href="/strategy"
                className="flex items-center gap-1 text-xs font-medium"
                style={{ color: 'var(--mint)' }}>
                Ver estrategia <ArrowRight size={12} />
              </Link>
            </div>
            <div className="space-y-2">
              {snowball.schedule.slice(0, 4).map((s) => (
                <div key={s.debtId} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'var(--bg-raised)' }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: 'var(--mint-dim)', color: 'var(--mint)' }}>
                    {s.order}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{s.debtName}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.monthsToPayoff} meses</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/simulator"
              className="flex items-center justify-center gap-2 w-full mt-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--mint-dim)', color: 'var(--mint)', border: '1px solid var(--mint-border)' }}>
              Simular abono extra <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
