import { getActiveDebts } from '@/lib/db'
import { MOCK_USER_ID } from '@/lib/mock/data'
import { Debt } from '@/types'
import { runSnowball } from '@/lib/engines/snowball'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Target, Snowflake, ArrowRight, CheckCircle2, TrendingDown, Calendar, DollarSign, Zap } from 'lucide-react'
import Link from 'next/link'
import StrategySimulator from '@/components/strategy/StrategySimulator'

export default async function StrategyPage() {
  const debts: Debt[] = await getActiveDebts(MOCK_USER_ID)

  if (debts.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--mint)' }}>Estrategia</p>
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Plan Bola de Nieve</h1>
        <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <Snowflake size={32} style={{ color: 'var(--mint)', margin: '0 auto 12px' }} />
          <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Sin deudas registradas</p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Registra tus deudas para generar tu plan personalizado.</p>
          <Link href="/debts/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--mint)', color: '#fff' }}>
            Registrar deuda <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    )
  }

  const result = runSnowball(debts)
  const totalMinimums = debts.reduce((s, d) => s + d.monthly_payment, 0)
  const totalDebt = debts.reduce((s, d) => s + d.current_balance, 0)
  const targetDebt = result.schedule[0]
    ? debts.find(d => d.id === result.schedule[0].debtId) ?? null
    : null

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--mint)' }}>Estrategia</p>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Plan Bola de Nieve</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Paga el mínimo en todas las deudas y concentra todo lo extra en la más pequeña.
        </p>
      </div>

      {/* Resumen del plan */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl p-4 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <DollarSign size={16} className="mx-auto mb-2" style={{ color: 'var(--red)' }} />
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Deuda total</p>
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalDebt)}</p>
        </div>
        <div className="rounded-2xl p-4 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <TrendingDown size={16} className="mx-auto mb-2" style={{ color: 'var(--red)' }} />
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Pagarás de intereses</p>
          <p className="font-bold text-sm" style={{ color: 'var(--red)' }}>{formatCurrency(result.totalInterest)}</p>
        </div>
        <div className="rounded-2xl p-4 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <Calendar size={16} className="mx-auto mb-2" style={{ color: 'var(--sky)' }} />
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Libre de deudas</p>
          <p className="font-bold text-sm" style={{ color: 'var(--sky)' }}>{formatDate(result.payoffDate)}</p>
        </div>
      </div>

      {/* Deuda objetivo */}
      {result.schedule[0] && (
        <div className="rounded-2xl p-5"
          style={{ background: 'var(--bg-surface)', border: '2px solid var(--mint-border)', boxShadow: '0 4px 20px rgba(16,185,129,0.08)' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--mint-dim)' }}>
              <Target size={14} style={{ color: 'var(--mint)' }} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--mint)' }}>
              Ataca esta deuda ahora
            </p>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {result.schedule[0].debtName}
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                La de menor saldo — más fácil de liquidar
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Intereses restantes</p>
              <p className="text-lg font-bold" style={{ color: 'var(--red)' }}>
                {formatCurrency(result.schedule[0].totalInterest)}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--mint)' }}>
                Libre en {result.schedule[0].monthsToPayoff} meses
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <Zap size={13} style={{ color: 'var(--amber)' }} />
              <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Paga el mínimo en todas las demás y agrega todo lo que puedas a esta.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Simulador + Calculadora de fecha (componente client) */}
      <StrategySimulator
        debts={debts}
        baseResult={result}
        totalMinimums={totalMinimums}
        targetDebt={targetDebt}
      />

      {/* Plan de liquidación */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <div className="px-5 py-4" style={{ background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Plan de liquidación</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Cuota mínima total: {formatCurrency(totalMinimums)}/mes — cada deuda liberada suma a la siguiente
          </p>
        </div>
        <div style={{ background: 'var(--bg-surface)' }}>
          {result.schedule.map((s, i) => {
            const isTarget = i === 0
            const thisMonthly = debts.find(d => d.id === s.debtId)?.monthly_payment ?? 0
            const freedBeforeMe = result.schedule
              .slice(0, i)
              .filter(prev => prev.monthsToPayoff < s.monthsToPayoff)
              .reduce((sum, prev) => sum + prev.freedAmount, 0)

            return (
              <div key={s.debtId}
                className="flex items-start gap-4 px-5 py-4"
                style={{ borderBottom: i < result.schedule.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div className="flex flex-col items-center shrink-0 pt-0.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: isTarget ? 'var(--mint)' : 'var(--bg-raised)',
                      color: isTarget ? '#fff' : 'var(--text-muted)',
                      border: isTarget ? 'none' : '1px solid var(--border)',
                    }}>
                    {s.order}
                  </div>
                  {i < result.schedule.length - 1 && (
                    <div className="w-px flex-1 mt-1.5" style={{ background: 'var(--border)', minHeight: '20px' }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {s.debtName}
                        {isTarget && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                            style={{ background: 'var(--mint-dim)', color: 'var(--mint)' }}>
                            AHORA
                          </span>
                        )}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        Cuota mínima: {formatCurrency(thisMonthly)}/mes
                        {freedBeforeMe > 0 && (
                          <span style={{ color: 'var(--mint)' }}> + {formatCurrency(freedBeforeMe)} bola de nieve</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Libre en</p>
                      <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {formatDate(s.payoffDate)}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--red)' }}>
                        {formatCurrency(s.totalInterest)} en intereses
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tips */}
      <div className="rounded-2xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
          Claves del método
        </p>
        <div className="space-y-2.5">
          {[
            'Paga el mínimo exacto en TODAS las deudas cada mes, sin falta',
            'Todo dinero extra va directo a la deuda más pequeña',
            'Cuando una deuda se liquida, su cuota se suma a la siguiente',
            'Primas, bonos y extras: úsalos como abonos extraordinarios',
            'No uses el cupo liberado para gastar más',
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-2.5 text-sm">
              <CheckCircle2 size={15} className="shrink-0 mt-0.5" style={{ color: 'var(--mint)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>{tip}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
