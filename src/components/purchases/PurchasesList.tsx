'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCardPurchase } from '@/types'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { purchaseProgress, remainingInstallmentValue, outstandingPrincipal } from '@/lib/engines/creditCard'
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import EditPurchaseModal from './EditPurchaseModal'
import PurchaseAbonoModal from './PurchaseAbonoModal'

interface Props {
  purchases: CreditCardPurchase[]
  debtId: string
  cardRate: number
}

export default function PurchasesList({ purchases, debtId, cardRate }: Props) {
  const router = useRouter()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  const active = purchases.filter((p) => p.status === 'active')
  const paid   = purchases.filter((p) => p.status === 'paid')

  async function deletePurchase(p: CreditCardPurchase) {
    if (!confirm(`¿Eliminar "${p.description}"?`)) return
    setLoading(p.id)
    try {
      await fetch(`/api/purchases/${p.id}?debtId=${debtId}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  if (purchases.length === 0) {
    return (
      <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
        Sin compras registradas
      </p>
    )
  }

  return (
    <div>
      {active.map((p, i) => (
        <PurchaseRow
          key={p.id}
          purchase={p}
          debtId={debtId}
          cardRate={cardRate}
          expanded={expanded === p.id}
          loadingId={loading}
          isLast={i === active.length - 1 && paid.length === 0}
          onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
          onDelete={deletePurchase}
        />
      ))}

      {paid.length > 0 && (
        <details className="group">
          <summary
            className="flex items-center gap-1.5 px-5 py-3 cursor-pointer select-none list-none text-xs font-medium"
            style={{
              color: 'var(--text-muted)',
              borderTop: active.length > 0 ? '1px solid var(--border)' : 'none',
            }}
          >
            <ChevronDown size={12} className="group-open:rotate-180 transition-transform" />
            {paid.length} compra(s) liquidada(s)
          </summary>
          <div style={{ opacity: 0.6 }}>
            {paid.map((p, i) => (
              <PurchaseRow
                key={p.id}
                purchase={p}
                debtId={debtId}
                expanded={false}
                loadingId={null}
                isLast={i === paid.length - 1}
                onToggle={() => {}}
                onDelete={deletePurchase}
                readonly
              />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

function PurchaseRow({
  purchase: p,
  debtId,
  cardRate,
  expanded,
  loadingId,
  isLast,
  onToggle,
  onDelete,
  readonly = false,
}: {
  purchase: CreditCardPurchase
  debtId: string
  cardRate?: number
  expanded: boolean
  loadingId: string | null
  isLast: boolean
  onToggle: () => void
  onDelete: (p: CreditCardPurchase) => Promise<void>
  readonly?: boolean
}) {
  const isInstallment = p.num_installments > 1
  const progress      = purchaseProgress(p)
  const remaining     = remainingInstallmentValue(p)
  const principal     = outstandingPrincipal(p)
  const isLoading     = loadingId === p.id

  type BadgeStyle = { label: string; color: string; bg: string }
  const badge: BadgeStyle = p.status === 'paid'
    ? { label: 'Liquidada',   color: 'var(--mint)',  bg: 'var(--mint-dim)' }
    : p.interest_free
    ? { label: 'Sin interés', color: 'var(--sky)',   bg: 'rgba(14,165,233,0.1)' }
    : { label: 'Con interés', color: 'var(--red)',   bg: 'rgba(239,68,68,0.1)' }

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>
      {/* Row header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors row-hover"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {p.description}
            </p>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ color: badge.color, background: badge.bg }}>
              {badge.label}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {formatDateShort(p.purchase_date)}
            {isInstallment && ` · ${p.paid_installments}/${p.num_installments} cuotas`}
          </p>
        </div>

        <div className="text-right shrink-0 mr-1">
          {isInstallment ? (
            <>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                {formatCurrency(p.installment_amount)}
                <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/mes</span>
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {formatCurrency(principal)} restante
              </p>
            </>
          ) : (
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(p.total_amount)}
            </p>
          )}
        </div>
        {expanded
          ? <ChevronUp size={15} style={{ color: 'var(--text-muted)' }} className="shrink-0" />
          : <ChevronDown size={15} style={{ color: 'var(--text-muted)' }} className="shrink-0" />}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-4 space-y-4"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-raised)', paddingTop: '16px' }}>

          {/* Progress bar */}
          {isInstallment && (
            <div>
              <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                <span>{Math.round(progress)}% pagado</span>
                <span>{p.num_installments - p.paid_installments} cuotas restantes</span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, progress)}%`, background: 'var(--mint)' }} />
              </div>
            </div>
          )}

          {/* Detail grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <StatItem label="Total compra" value={formatCurrency(p.total_amount)} />
            {isInstallment && (
              <>
                <StatItem label="Cuota mensual" value={formatCurrency(p.installment_amount)} />
                <StatItem label="Cuotas pagadas" value={`${p.paid_installments} de ${p.num_installments}`} />
                <StatItem label="Saldo restante" value={formatCurrency(principal)} />
              </>
            )}
            {!p.interest_free && p.num_installments > 1 && (
              <StatItem label="Tasa" value={`${p.interest_rate ?? '—'}% EA`} />
            )}
            {!p.interest_free && p.num_installments > 1 && p.interest_rate != null && (
              <StatItem
                label="Tasa mes vencido"
                value={`${(((1 + p.interest_rate / 100) ** (1 / 12) - 1) * 100).toFixed(4)}% MV`}
              />
            )}
            {!p.interest_free && p.num_installments > 1 && p.interest_rate != null && principal > 0 && (
              <StatItem
                label="Interés del mes"
                value={formatCurrency(principal * ((1 + p.interest_rate / 100) ** (1 / 12) - 1))}
              />
            )}
            {p.notes && <StatItem label="Nota" value={p.notes} />}
          </div>

          {/* Actions */}
          {!readonly && p.status === 'active' && (
            <div className="flex flex-wrap gap-2 pt-1">
              {p.paid_installments < p.num_installments && (
                <PurchaseAbonoModal purchase={p} debtId={debtId} />
              )}
              {cardRate !== undefined && (
                <EditPurchaseModal purchase={p} cardRate={cardRate} />
              )}
              <button
                onClick={() => onDelete(p)}
                disabled={isLoading}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-medium disabled:opacity-50 transition-all ml-auto"
                style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <Trash2 size={13} /> Eliminar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  )
}
