'use client'

import { useState, useMemo } from 'react'
import { Debt } from '@/types'
import { runSnowball, SnowballResult } from '@/lib/engines/snowball'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Zap, ArrowRight, TrendingDown, CheckCircle2 } from 'lucide-react'

interface Props {
  debts: Debt[]
  baseResult: SnowballResult
  totalMinimums: number
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

export default function SnowballSimulator({ debts, baseResult, totalMinimums }: Props) {
  const [extra, setExtra] = useState(0)
  const [displayExtra, setDisplayExtra] = useState('')

  const result = useMemo(
    () => extra > 0 ? runSnowball(debts, extra) : baseResult,
    [debts, extra, baseResult]
  )

  const monthsSaved = baseResult.totalMonths - result.totalMonths
  const interestSaved = baseResult.totalInterest - result.totalInterest

  // Smart milestones: what extra is needed to save 1, 3, 6 months
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

  // Per-debt impact: compare payoff dates base vs with extra
  const debtImpact = useMemo(() => {
    if (extra <= 0) return []
    return debts.map(d => {
      const baseEntry = baseResult.schedule.find(s => s.debtId === d.id)
      const newEntry = result.schedule.find(s => s.debtId === d.id)
      if (!baseEntry || !newEntry) return null
      return {
        id: d.id,
        name: `${d.entity} — ${d.name}`,
        baseMonths: baseEntry.monthsToPayoff,
        newMonths: newEntry.monthsToPayoff,
        baseDate: baseEntry.payoffDate,
        newDate: newEntry.payoffDate,
        monthsSaved: baseEntry.monthsToPayoff - newEntry.monthsToPayoff,
        baseInterest: baseEntry.totalInterest,
        newInterest: newEntry.totalInterest,
      }
    }).filter(Boolean).filter(d => d!.monthsSaved > 0) as NonNullable<ReturnType<typeof debts.map>[0]>[]
  }, [debts, extra, result, baseResult])

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <div className="px-5 py-4" style={{ background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-0.5">
          <Zap size={15} style={{ color: 'var(--amber)' }} />
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
            Simula un abono extra
          </p>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          ¿Cuánto más puedes pagar al mes? Ve el impacto en cada deuda.
        </p>
      </div>

      <div className="px-5 py-5 space-y-5" style={{ background: 'var(--bg-surface)' }}>

        {/* Input */}
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
              placeholder="Ingresa el monto extra mensual"
              onChange={e => {
                const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '')
                setExtra(Number(raw) || 0)
                setDisplayExtra(raw)
              }}
              onFocus={e => {
                setDisplayExtra(extra > 0 ? String(extra) : '')
                e.currentTarget.style.border = '1px solid var(--mint-border)'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.08)'
              }}
              onBlur={e => {
                if (extra > 0) setDisplayExtra(extra.toLocaleString('es-CO'))
                else setDisplayExtra('')
                e.currentTarget.style.border = '1px solid var(--border)'
                e.currentTarget.style.boxShadow = 'none'
              }}
              className="w-full rounded-xl text-sm py-3 pl-8 pr-4 outline-none font-semibold"
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

        {/* Sugerencias inteligentes — solo cuando no hay valor */}
        {extra === 0 && milestones.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>¿Cuánto necesitas para adelantarte?</p>
            <div className="space-y-2">
              {milestones.map(m => (
                <button
                  key={m.save}
                  onClick={() => { setExtra(m.needed); setDisplayExtra(m.needed.toLocaleString('es-CO')) }}
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

        {/* Resultados con extra */}
        {extra > 0 && (
          <div className="space-y-4">

            {/* Resumen global */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl p-4 text-center"
                style={{ background: monthsSaved > 0 ? 'var(--mint-dim)' : 'var(--bg-raised)', border: `1px solid ${monthsSaved > 0 ? 'var(--mint-border)' : 'var(--border)'}` }}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Libre en</p>
                <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{result.totalMonths} meses</p>
                {monthsSaved > 0
                  ? <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--mint)' }}>−{monthsSaved} {monthsSaved === 1 ? 'mes' : 'meses'}</p>
                  : <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>sin cambio</p>}
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Fecha</p>
                <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{formatDate(result.payoffDate)}</p>
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
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
                  Deudas que se aceleran
                </p>
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
                        {d.baseInterest - d.newInterest > 100 && (
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            −{formatCurrency(Math.round(d.baseInterest - d.newInterest))}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Banner o mensaje */}
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
              <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>
                Con ese abono el resultado es similar al actual. Prueba con un valor mayor.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
