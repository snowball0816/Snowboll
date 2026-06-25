'use client'

import { useState, useMemo } from 'react'
import { Debt } from '@/types'
import { runSnowball, SnowballResult } from '@/lib/engines/snowball'
import { formatCurrency, formatDate } from '@/lib/utils'
import { monthlyRate, frenchInstallment } from '@/lib/engines/calculations'
import { Target, Zap, Calendar, TrendingDown, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'

interface Props {
  debts: Debt[]
  base: SnowballResult
}

function findMinExtraAll(debts: Debt[], targetMonths: number): number {
  let lo = 0, hi = 100_000_000
  for (let i = 0; i < 50; i++) {
    const mid = Math.round((lo + hi) / 2)
    if (runSnowball(debts, mid).totalMonths <= targetMonths) hi = mid
    else lo = mid + 1
  }
  return hi
}

function monthsForDebt(debt: Debt, extraMonthly: number): number {
  const payment = debt.monthly_payment + extraMonthly
  if (payment <= 0) return Infinity
  const r = monthlyRate(debt.interest_rate)
  if (r <= 0) return Math.ceil(debt.current_balance / payment)
  if (payment <= debt.current_balance * r) return Infinity
  return Math.ceil(-Math.log(1 - (debt.current_balance * r) / payment) / Math.log(1 + r))
}

function findMinExtraDebt(debt: Debt, targetMonths: number): number {
  if (monthsForDebt(debt, 0) <= targetMonths) return 0
  let lo = 0, hi = debt.current_balance
  for (let i = 0; i < 50; i++) {
    const mid = Math.round((lo + hi) / 2)
    if (monthsForDebt(debt, mid) <= targetMonths) hi = mid
    else lo = mid + 1
  }
  return hi
}

export default function SimulatorClient({ debts, base }: Props) {
  const [extra, setExtra] = useState<string>('')
  const [displayExtra, setDisplayExtra] = useState<string>('')
  const [targetDate, setTargetDate] = useState<string>('')
  const [targetMode, setTargetMode] = useState<'objetivo' | 'todas'>('objetivo')

  const targetDebt = base.schedule[0]
    ? debts.find(d => d.id === base.schedule[0].debtId) ?? null
    : null

  const totalMinimums = debts.reduce((s, d) => s + d.monthly_payment, 0)

  const extraNum = Number(extra) || 0

  const customResult = useMemo(() => {
    if (extraNum <= 0) return null
    return runSnowball(debts, extraNum)
  }, [debts, extraNum])

  // Auto-generate 3 smart milestones: save 1 month, 3 months, 6 months
  const milestones = useMemo(() => {
    const targets = [1, 3, 6].map(save => ({
      save,
      targetMonths: base.totalMonths - save,
    })).filter(m => m.targetMonths >= 1)

    return targets.map(({ save, targetMonths }) => {
      const needed = findMinExtraAll(debts, targetMonths)
      const result = runSnowball(debts, needed)
      return { save, needed, months: result.totalMonths, interestSaved: base.totalInterest - result.totalInterest }
    }).filter(m => m.needed < 50_000_000)
  }, [debts, base])

  const targetCalc = useMemo(() => {
    if (!targetDate || !targetDebt) return null
    const target = new Date(targetDate + '-01')
    const today = new Date()
    const months = Math.max(1,
      (target.getFullYear() - today.getFullYear()) * 12 +
      (target.getMonth() - today.getMonth())
    )

    if (targetMode === 'objetivo') {
      const baseMonths = monthsForDebt(targetDebt, 0)
      if (months >= baseMonths) return { extra: 0, months, baseMonths, impossible: false, tooClose: true }
      if (months < 1) return { extra: 0, months, baseMonths, impossible: true, tooClose: false }
      const minExtra = findMinExtraDebt(targetDebt, months)
      if (minExtra > targetDebt.current_balance * 2) return { extra: 0, months, baseMonths, impossible: true, tooClose: false }
      return { extra: minExtra, months, baseMonths, impossible: false, tooClose: false }
    } else {
      const baseMonths = base.totalMonths
      if (months >= baseMonths) return { extra: 0, months, baseMonths, impossible: false, tooClose: true }
      const minExtra = findMinExtraAll(debts, months)
      const totalDebt = debts.reduce((s, d) => s + d.current_balance, 0)
      if (minExtra > totalDebt) return { extra: 0, months, baseMonths, impossible: true, tooClose: false }
      return { extra: minExtra, months, baseMonths, impossible: false, tooClose: false }
    }
  }, [targetDate, targetMode, targetDebt, debts, base])

  const todayStr = new Date().toISOString().slice(0, 7)

  const monthsSaved = customResult ? base.totalMonths - customResult.totalMonths : 0
  const interestSaved = customResult ? base.totalInterest - customResult.totalInterest : 0

  return (
    <div className="space-y-6">

      {/* 1. Deuda objetivo */}
      {targetDebt && (
        <div className="rounded-2xl p-5"
          style={{ background: 'var(--bg-surface)', border: '2px solid var(--mint-border)', boxShadow: '0 4px 20px rgba(16,185,129,0.06)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--mint-dim)' }}>
              <Target size={14} style={{ color: 'var(--mint)' }} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--mint)' }}>
              El abono extra va aquí
            </p>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
                {targetDebt.entity} — {targetDebt.name}
              </p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Saldo: {formatCurrency(targetDebt.current_balance)} · {targetDebt.interest_rate}% EA
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sin extra, libre en</p>
              <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
                {base.schedule[0]?.monthsToPayoff ?? '?'} meses
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-xl px-4 py-2.5" style={{ background: 'var(--bg-raised)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text-secondary)' }}>¿Por qué esta?</strong>{' '}
              Es la de menor saldo ({formatCurrency(targetDebt.current_balance)}).
              Al liquidarla, su cuota de {formatCurrency(targetDebt.monthly_payment)}/mes
              se suma automáticamente a la siguiente deuda en el plan.
            </p>
          </div>
        </div>
      )}

      {/* 2. Simulador dinámico */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <div className="px-5 py-4" style={{ background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-0.5">
            <Zap size={15} style={{ color: 'var(--amber)' }} />
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>¿Cuánto puedes pagar de más?</p>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Sin extra: libre de todas las deudas en <strong>{base.totalMonths} meses</strong> ({formatDate(base.payoffDate)}) ·{' '}
            {formatCurrency(base.totalInterest)} en intereses
          </p>
        </div>

        <div className="px-5 py-5 space-y-5" style={{ background: 'var(--bg-surface)' }}>

          {/* Input principal */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
              Abono extra mensual
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
                style={{ color: 'var(--text-muted)' }}>$</span>
              <input
                type="text"
                inputMode="numeric"
                value={displayExtra}
                placeholder="0"
                onChange={e => {
                  const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '')
                  setExtra(raw)
                  setDisplayExtra(raw)
                }}
                onFocus={e => {
                  setDisplayExtra(extra)
                  e.currentTarget.style.border = '1px solid var(--mint-border)'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45,212,160,0.08)'
                }}
                onBlur={e => {
                  const n = Number(extra)
                  if (n > 0) setDisplayExtra(n.toLocaleString('es-CO'))
                  else setDisplayExtra('')
                  e.currentTarget.style.border = '1px solid var(--border)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                className="w-full rounded-xl text-sm py-3 pl-8 pr-4 outline-none font-semibold"
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '1rem' }}
              />
            </div>
          </div>

          {/* Sugerencias inteligentes */}
          {milestones.length > 0 && extraNum === 0 && (
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Sugerencias para avanzar</p>
              <div className="space-y-2">
                {milestones.map(m => (
                  <button
                    key={m.save}
                    onClick={() => { setExtra(String(m.needed)); setDisplayExtra(m.needed.toLocaleString('es-CO')) }}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all"
                    style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}
                  >
                    <div className="flex items-center gap-2">
                      <ArrowRight size={13} style={{ color: 'var(--mint)' }} />
                      <span style={{ color: 'var(--text-secondary)' }}>
                        Ahorrar <strong style={{ color: 'var(--mint)' }}>{m.save} {m.save === 1 ? 'mes' : 'meses'}</strong>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                        +{formatCurrency(m.needed)}/mes
                      </span>
                      <span className="text-xs ml-2" style={{ color: 'var(--mint)' }}>
                        ahorra {formatCurrency(Math.round(m.interestSaved))}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Resultado en tiempo real */}
          {customResult && extraNum > 0 && (
            <div className="space-y-3">
              {/* Métricas principales */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl p-4 text-center" style={{ background: monthsSaved > 0 ? 'var(--mint-dim)' : 'var(--bg-raised)', border: `1px solid ${monthsSaved > 0 ? 'var(--mint-border)' : 'var(--border)'}` }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Libre de deudas</p>
                  <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{customResult.totalMonths} meses</p>
                  {monthsSaved > 0
                    ? <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--mint)' }}>−{monthsSaved} {monthsSaved === 1 ? 'mes' : 'meses'}</p>
                    : <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>sin cambio</p>
                  }
                </div>
                <div className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Fecha</p>
                  <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{formatDate(customResult.payoffDate)}</p>
                </div>
                <div className="rounded-xl p-4 text-center" style={{ background: interestSaved > 500 ? 'rgba(16,185,129,0.06)' : 'var(--bg-raised)', border: '1px solid var(--border)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Ahorras</p>
                  <p className="font-bold" style={{ color: interestSaved > 500 ? 'var(--mint)' : 'var(--text-muted)' }}>
                    {interestSaved > 500 ? formatCurrency(Math.round(interestSaved)) : '—'}
                  </p>
                  {interestSaved > 500 && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>en intereses</p>}
                </div>
              </div>

              {/* Banner resumen */}
              {(monthsSaved > 0 || interestSaved > 500) && (
                <div className="rounded-xl px-4 py-3.5 flex items-start gap-3"
                  style={{ background: 'var(--mint-dim)', border: '1px solid var(--mint-border)' }}>
                  <Zap size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--mint)' }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--mint)' }}>
                      {monthsSaved > 0 ? `Quedarías libre ${monthsSaved} ${monthsSaved === 1 ? 'mes' : 'meses'} antes` : ''}
                      {monthsSaved > 0 && interestSaved > 500 ? ' · ' : ''}
                      {interestSaved > 500 ? `ahorrarías ${formatCurrency(Math.round(interestSaved))} en intereses` : ''}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--mint-dark)' }}>
                      Pagarías {formatCurrency(totalMinimums + extraNum)}/mes en total
                    </p>
                  </div>
                </div>
              )}

              {monthsSaved === 0 && interestSaved <= 500 && (
                <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>
                  Con ese abono el resultado es similar. Prueba con un valor mayor.
                </p>
              )}

              {targetDebt && (
                <div className="flex items-start gap-2.5 rounded-xl px-4 py-3" style={{ background: 'var(--bg-raised)' }}>
                  <Target size={13} className="shrink-0 mt-0.5" style={{ color: 'var(--mint)' }} />
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Los +{formatCurrency(extraNum)} van a <strong>{targetDebt.entity} — {targetDebt.name}</strong> hasta liquidarla,
                    luego pasan a la siguiente deuda automáticamente.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Calculadora de fecha meta */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <div className="px-5 py-4" style={{ background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-0.5">
            <Calendar size={15} style={{ color: 'var(--sky)' }} />
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>¿Para cuándo quieres quedar libre?</p>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Elige una fecha y te calculo exactamente cuánto extra necesitas pagar cada mes.
          </p>
        </div>

        <div className="px-5 py-5 space-y-4" style={{ background: 'var(--bg-surface)' }}>
          <div className="flex gap-2">
            {(['objetivo', 'todas'] as const).map(mode => (
              <button key={mode} onClick={() => setTargetMode(mode)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: targetMode === mode ? 'var(--mint)' : 'var(--bg-raised)',
                  color: targetMode === mode ? '#fff' : 'var(--text-muted)',
                  border: `1px solid ${targetMode === mode ? 'var(--mint)' : 'var(--border)'}`,
                }}>
                {mode === 'objetivo'
                  ? `Liquidar deuda objetivo (${targetDebt ? formatCurrency(targetDebt.current_balance) : ''})`
                  : `Libre de todas las deudas`}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
              {targetMode === 'objetivo'
                ? `¿Para cuándo quieres liquidar ${targetDebt?.entity}?`
                : '¿Para cuándo quieres quedar libre de todas tus deudas?'}
            </label>
            <input type="month" value={targetDate} onChange={e => setTargetDate(e.target.value)}
              min={todayStr}
              className="w-full rounded-xl text-sm py-2.5 px-4 outline-none"
              style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              onFocus={e => { e.currentTarget.style.border = '1px solid var(--mint-border)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.08)' }}
              onBlur={e => { e.currentTarget.style.border = '1px solid var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>

          {targetCalc && (
            targetCalc.impossible ? (
              <div className="rounded-xl px-4 py-3.5 flex items-start gap-3"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertCircle size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--red)' }} />
                <p className="text-sm" style={{ color: 'var(--red)' }}>
                  Esa fecha es muy pronto. Elige una fecha más lejana.
                </p>
              </div>
            ) : targetCalc.tooClose ? (
              <div className="rounded-xl px-4 py-3.5 flex items-start gap-3"
                style={{ background: 'var(--mint-dim)', border: '1px solid var(--mint-border)' }}>
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--mint)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--mint)' }}>
                  ¡Ya lo logras con tus cuotas actuales! Sin pagar extra quedas libre antes de esa fecha.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl p-5 text-center"
                  style={{ background: 'var(--mint-dim)', border: '1px solid var(--mint-border)' }}>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--mint)' }}>
                    Abono extra mensual necesario
                  </p>
                  <p className="text-4xl font-bold" style={{ color: 'var(--mint)' }}>
                    {formatCurrency(targetCalc.extra)}
                  </p>
                  <p className="text-sm mt-1.5" style={{ color: 'var(--text-secondary)' }}>
                    en {targetCalc.months} meses ·{' '}
                    pagas {formatCurrency(totalMinimums + targetCalc.extra)}/mes en total
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl p-4" style={{ background: 'var(--bg-raised)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                      {targetMode === 'objetivo' ? 'Ahorras vs pagar solo mínimos' : 'Intereses que ahorras'}
                    </p>
                    <p className="font-bold" style={{ color: 'var(--mint)' }}>
                      {formatCurrency(Math.max(0, Math.round(
                        targetMode === 'objetivo'
                          ? 0
                          : base.totalInterest - runSnowball(debts, targetCalc.extra).totalInterest
                      )))}
                    </p>
                  </div>
                  <div className="rounded-xl p-4" style={{ background: 'var(--bg-raised)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Meses que te adelantas</p>
                    <p className="font-bold" style={{ color: 'var(--sky)' }}>
                      {targetCalc.baseMonths - targetCalc.months} meses
                    </p>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>

    </div>
  )
}
