'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCardPurchase } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Banknote, X, Minus, Plus } from 'lucide-react'

interface Props {
  purchase: CreditCardPurchase
  debtId: string
}

export default function PurchaseAbonoModal({ purchase: p, debtId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [cuotas, setCuotas] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remaining = p.num_installments - p.paid_installments
  const totalAbono = cuotas * p.installment_amount

  function increment() { setCuotas(c => Math.min(c + 1, remaining)) }
  function decrement() { setCuotas(c => Math.max(c - 1, 1)) }

  function handleOpen() {
    setCuotas(1)
    setError(null)
    setOpen(true)
  }

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/purchases/${p.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ debtId, cuotas }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error')
      setOpen(false)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-semibold transition-all"
        style={{ background: 'var(--mint)', color: '#fff' }}
      >
        <Banknote size={13} />
        Abonar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/60">
          <Card className="w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold">Abonar a compra</h2>
              <button onClick={() => setOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {/* Purchase summary */}
            <div className="rounded-xl px-4 py-3 mb-5 text-sm"
              style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
              <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {p.description}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {formatCurrency(p.installment_amount)}/cuota · {remaining} restante{remaining !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Cuotas stepper */}
            <div className="mb-5">
              <p className="text-xs mb-3 font-medium" style={{ color: 'var(--text-muted)' }}>
                ¿Cuántas cuotas quieres abonar?
              </p>
              <div className="flex items-center gap-4">
                <button
                  onClick={decrement}
                  disabled={cuotas <= 1}
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold disabled:opacity-30 transition-all"
                  style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  <Minus size={16} />
                </button>

                <div className="flex-1 text-center">
                  <p className="text-3xl font-bold" style={{ color: 'var(--mint)' }}>{cuotas}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    de {remaining} disponible{remaining !== 1 ? 's' : ''}
                  </p>
                </div>

                <button
                  onClick={increment}
                  disabled={cuotas >= remaining}
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold disabled:opacity-30 transition-all"
                  style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Total */}
            <div className="rounded-xl px-4 py-3 mb-5 flex justify-between items-center"
              style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Total a pagar</span>
              <span className="text-lg font-bold" style={{ color: 'var(--mint)' }}>
                {formatCurrency(totalAbono)}
              </span>
            </div>

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                {loading ? 'Abonando…' : 'Confirmar abono'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
