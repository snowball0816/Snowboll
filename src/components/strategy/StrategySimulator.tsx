'use client'

import { useState, useMemo } from 'react'
import { Debt } from '@/types'
import { runSnowball, SnowballResult } from '@/lib/engines/snowball'
import { formatCurrency, formatDate } from '@/lib/utils'
import { monthlyRate } from '@/lib/engines/calculations'
import { Zap, Calendar, ArrowRight, CheckCircle2, AlertCircle, Target } from 'lucide-react'

interface Props {
  debts: Debt[]
  baseResult: SnowballResult
  totalMinimums: number
  targetDebt: Debt | null
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

export default function StrategySimulator({ debts, baseResult, totalMinimums, targetDebt }: Props) {
  const [extra, setExtra] = useState(0)
  const [displayExtra, setDisplayExtra] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [targetMode, setTargetMode] = useState<'objetivo' | 'todas'>('todas')

  const result = useMemo(
    () => extra > 0 ? runSnowball(debts, extra) : baseResult,
    [debts, extra, baseResult]
  )

  const monthsSaved = baseResult.totalMonths - result.totalMonths
  const interestSaved = baseResult.totalInterest - result.totalInterest

  const milestones = useMemo(() => {
    return [1, 3, 6]
      .map(save => ({ save, targetMonths: baseResult.totalMonths - save }))
      .filter(m => m.targetMonths >= 1)
      .map(({ save, targetMonths }) => {
        const needed = findMinExtraAll(debts, targetMonths)
        const r = runSnowball(debts, needed)
        return { save, needed, interestSaved: baseResult.totalInterest - r.totalInterest }
      })
      .filter(m => m.needed < 50_000_000)
  }, [debts, baseResult])

  const debtImpact = useMemo(() => {
    if (extra <= 0) return []
    return debts.map(d => {
      const base = baseResult.schedule.find(s => s.debtId === d.id)
      const next = result.schedule.find(s => s.debtId === d.id)
      if (!base || !next) return null
      const saved = base.monthsToPayoff - next.monthsToPayoff
      if (saved <= 0) return null
      return {
        id: d.id,
        name: `${d.entity} — ${d.name}`,
        baseDate: base.payoffDate,
        newDate: next.payoffDate,
        monthsSaved: saved,
        interestSaved: base.totalInterest - next.totalInterest,
      }
    }).filter(Boolean) as NonNullable<{
      id: string; name: string; baseDate: Date; newDate: Date; monthsSaved: number; interestSaved: number
    }>[]
  }, [debts, extra, result, baseResult])

  const todayStr = new Date().toISOString().slice(0, 7)

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
      const baseMonths = baseResult.totalMonths
      if (months >= baseMonths) return { extra: 0, months, baseMonths, impossible: false, tooClose: true }
      const minExtra = findMinExtraAll(debts, months)
      const totalDebt = debts.reduce((s, d) => s + d.current_balance, 0)
      if (minExtra > totalDebt) return { extra: 0, months, baseMonths, impossible: true, tooClose: false }
      return { extra: minExtra, months, baseMonths, impossible: false, tooClose: false }
    }
  }, [targetDate, targetMode, targetDebt, debts, baseResult])

  return (
    <div className="space-y-5">

      {/* ── SIMULADOR DE ABONO EXTRA ── */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <div className="px-5 py-4" style={{ background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-0.5">
            <Zap size={15} style={{ color: 'var(--amber)' }} />
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
              ¿Cuánto puedes pagar de más?
            </p>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Ingresa un abono extra y ve el impacto en cada deuda en tiempo real.
          </p>
        </div>

        <div className="px-5 py-5 space-y-5" style={{ background: 'var(--bg-surface)' }}>

          {/* Input */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
              Abono extra mensual (además de tus cuotas mínimas)
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
                  setExtra(Number(raw) || 0)
                  setDisplayExtra(raw)
                }}
                onFocus={e => {
                  setDisplayExtra(extra > 0 ? String(extra) : '')
                  e.currentTarget.style.border = '1px solid var(--mint-border)'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45,212,160,0.08)'
                }}
                onBlur={e => {
                  if (extra > 0) setDisplayExtra(extra.toLocaleString('es-CO'))
                  else setDisplayExtra('')
                  e.currentTarget.style.border = '1px solid var(--border)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                className="w-full rounded-xl py-3 pl-8 pr-4 outline-none font-semibold"
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '1rem' }}
              />
            </div>
            {extra > 0 && (
              <button onClick={() => { setExtra(0); setDisplayExtra('') }}
                className="text-xs mt-2 px-3 py-1 rounded-lg"
                style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                Limpiar
              </button>
            )}
          </div>

          {/* Sugerencias inteligentes */}
          {extra === 0 && milestones.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
                ¿Cuánto necesitas para adelantarte?
              </p>
              <div className="space-y-2">
                {milestones.map(m => (
                  <button key={m.save}
                    onClick={() => { setExtra(m.needed); setDisplayExtra(m.needed.toLocaleString('es-CO')) }}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all"
                    style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2">
                      <ArrowRight size={13} style={{ color: 'var(--mint)' }} />
                      <span style={{ color: 'var(--text-secondary)' }}>
                        Ahorrar <strong style={{ color: 'var(--mint)' }}>{m.save} {m.save === 1 ? 'mes' : 'meses'}</strong>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold" style={{ color: 'var(--text-primary)' }}>+{formatCurrency(m.needed)}/mes</span>
                      <span className="text-xs ml-2" style={{ color: 'var(--mint)' }}>
                        ahorra {formatCurrency(Math.round(m.interestSaved))}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Resultados en tiempo real */}
          {extra > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl p-4 text-center"
                  style={{ background: monthsSaved > 0 ? 'var(--mint-dim)' : 'var(--bg-raised)', border: `1px solid ${monthsSaved > 0 ? 'var(--mint-border)' : 'var(--border)'}` }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Libre de deudas</p>
                  <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{result.totalMonths} meses</p>
                  {monthsSaved > 0
                    ? <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--mint)' }}>−{monthsSaved} {monthsSaved === 1 ? 'mes' : 'meses'}</p>
                    : <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>sin cambio</p>}
                </div>
                <div className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Fecha</p>
                  <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{formatDate(result.payoffDate)}</p>
                  {monthsSaved > 0 && (
                    <p className="text-xs mt-0.5 line-through" style={{ color: 'var(--text-muted)' }}>{formatDate(baseResult.payoffDate)}</p>
                  )}
                </div>
                <div className="rounded-xl p-4 text-center"
                  style={{ background: interestSaved > 500 ? 'rgba(16,185,129,0.06)' : 'var(--bg-raised)', border: '1px solid var(--border)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Ahorras</p>
                  <p className="font-bold" style={{ color: interestSaved > 500 ? 'var(--mint)' : 'var(--text-muted)' }}>
                    {interestSaved > 500 ? formatCurrency(Math.round(interestSaved)) : '—'}
                  </p>
                  {interestSaved > 500 && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>en intereses</p>}
                </div>
              </div>

              {/* Impacto por deuda */}
              {debtImpact.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Deudas que se aceleran</p>
                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    {debtImpact.map((d, i) => (
                      <div key={d.id}
                        className="flex items-center justify-between px-4 py-3 gap-3"
                        style={{ borderBottom: i < debtImpact.length - 1 ? '1px solid var(--border)' : 'none', background: 'var(--bg-raised)' }}>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{d.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            <span className="line-through">{formatDate(d.baseDate)}</span>
                            {' → '}
                            <span style={{ color: 'var(--mint)' }}>{formatDate(d.newDate)}</span>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold" style={{ color: 'var(--mint)' }}>
                            −{d.monthsSaved} {d.monthsSaved === 1 ? 'mes' : 'meses'}
                          </p>
                          {d.interestSaved > 100 && (
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              −{formatCurrency(Math.round(d.interestSaved))}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(monthsSaved > 0 || interestSaved > 500) ? (
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
                      Pagando {formatCurrency(totalMinimums + extra)}/mes en total
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-center py-1" style={{ color: 'var(--text-muted)' }}>
                  Con ese abono el resultado es similar. Prueba con un valor mayor.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── CALCULADORA DE FECHA META ── */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <div className="px-5 py-4" style={{ background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-0.5">
            <Calendar size={15} style={{ color: 'var(--sky)' }} />
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>¿Para cuándo quieres quedar libre?</p>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Elige una fecha y te calculo cuánto extra necesitas pagar al mes.
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
                  ? `Deuda objetivo${targetDebt ? ` (${formatCurrency(targetDebt.current_balance)})` : ''}`
                  : 'Todas las deudas'}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
              {targetMode === 'objetivo'
                ? `Fecha para liquidar ${targetDebt?.entity ?? 'la deuda objetivo'}`
                : 'Fecha para quedar libre de todas las deudas'}
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
                <p className="text-sm" style={{ color: 'var(--red)' }}>Esa fecha es muy pronto. Elige una fecha más lejana.</p>
              </div>
            ) : targetCalc.tooClose ? (
              <div className="rounded-xl px-4 py-3.5 flex items-start gap-3"
                style={{ background: 'var(--mint-dim)', border: '1px solid var(--mint-border)' }}>
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--mint)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--mint)' }}>
                  ¡Ya lo logras con tus cuotas actuales! Quedas libre antes de esa fecha sin pagar extra.
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
                    en {targetCalc.months} meses · total {formatCurrency(totalMinimums + targetCalc.extra)}/mes
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl p-4" style={{ background: 'var(--bg-raised)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Intereses que ahorras</p>
                    <p className="font-bold" style={{ color: 'var(--mint)' }}>
                      {formatCurrency(Math.max(0, Math.round(
                        baseResult.totalInterest - runSnowball(debts, targetCalc.extra).totalInterest
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
