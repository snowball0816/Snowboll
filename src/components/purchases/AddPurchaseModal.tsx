'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Plus, X } from 'lucide-react'
import { installmentWithInterest } from '@/lib/engines/calculations'

const schema = z.object({
  description:      z.string().min(1, 'Describe la compra'),
  purchase_date:    z.string(),
  total_amount:     z.coerce.number().positive('Monto requerido'),
  purchase_type:    z.enum(['installment_free', 'installment_interest']),
  num_installments:  z.coerce.number().min(1),
  paid_installments: z.coerce.number().min(0).default(0),
  interest_rate:     z.coerce.number().min(0).optional(),
  notes:            z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export default function AddPurchaseModal({ debtId, cardRate }: { debtId: string; cardRate: number }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [rateInputType, setRateInputType] = useState<'EA' | 'MV'>('EA')
  const [mvRate, setMvRate] = useState('')

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } =
    useForm<FormValues, unknown, FormValues>({
      resolver: zodResolver(schema) as never,
      defaultValues: {
        purchase_date:     new Date().toISOString().split('T')[0],
        purchase_type:     'installment_free',
        num_installments:  1,
        paid_installments: 0,
      },
    })

  const purchaseType  = watch('purchase_type')
  const totalAmount   = watch('total_amount') || 0
  const numInstall    = watch('num_installments') || 1
  const paidInstall   = watch('paid_installments') || 0
  const customRate    = watch('interest_rate')

  // Convert MV → EA: (1 + mv/100)^12 - 1) * 100
  const mvToEA = (mv: number) => ((1 + mv / 100) ** 12 - 1) * 100

  const enteredEA =
    rateInputType === 'MV' && mvRate !== ''
      ? mvToEA(parseFloat(mvRate))
      : customRate

  // Use card rate for installment_interest, 0 for interest_free
  const effectiveRate =
    purchaseType === 'installment_interest'
      ? (enteredEA ?? cardRate)
      : 0

  function handleRateTypeToggle(type: 'EA' | 'MV') {
    setRateInputType(type)
    if (type === 'EA' && mvRate !== '') {
      // pre-fill EA field with converted value
      setValue('interest_rate', parseFloat(mvToEA(parseFloat(mvRate)).toFixed(4)))
    }
    if (type === 'MV' && customRate) {
      // pre-fill MV field with converted value
      const mv = (((1 + customRate / 100) ** (1 / 12) - 1) * 100)
      setMvRate(mv.toFixed(4))
      setValue('interest_rate', undefined)
    }
  }

  const installAmount =
    numInstall > 1
      ? installmentWithInterest(totalAmount, effectiveRate, numInstall)
      : totalAmount

  async function onSubmit(values: FormValues) {
    setLoading(true)
    setError(null)
    try {
      const interestFree = values.purchase_type === 'installment_free'

      const paid = Math.min(values.paid_installments ?? 0, values.num_installments - 1)
      const finalEA = interestFree ? 0 : (enteredEA ?? cardRate)
      const payload = {
        description:        values.description,
        purchase_date:      values.purchase_date,
        total_amount:       values.total_amount,
        num_installments:   values.num_installments,
        paid_installments:  paid,
        installment_amount: installAmount,
        interest_free:      interestFree,
        interest_rate:      finalEA,
        notes:              values.notes,
        status:             paid >= values.num_installments ? 'paid' : 'active',
      }

      const res = await fetch(`/api/debts/${debtId}/purchases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error')
      reset()
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
      <Button onClick={() => setOpen(true)} variant="secondary" size="sm">
        <Plus size={15} /> Nueva compra
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/60">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Registrar compra</h2>
              <button onClick={() => setOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Descripción"
                placeholder="Ej. iPhone 15 — Falabella"
                error={errors.description?.message}
                {...register('description')}
              />

              <Input
                label="Fecha de compra"
                type="date"
                {...register('purchase_date')}
              />

              <Input
                label="Monto total"
                type="number"
                prefix="$"
                placeholder="0"
                error={errors.total_amount?.message}
                {...register('total_amount')}
              />

              <Select
                label="Tipo de compra"
                options={[
                  { value: 'installment_free',     label: '🎁 Sin interés (1 cuota o diferida)' },
                  { value: 'installment_interest', label: '📈 Con interés' },
                ]}
                {...register('purchase_type')}
              />

              <>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Número de cuotas"
                    type="number"
                    min={1}
                    max={60}
                    placeholder="1"
                    hint="1 = pago completo este mes"
                    error={errors.num_installments?.message}
                    {...register('num_installments')}
                  />
                  {numInstall > 1 && (
                    <Input
                      label="Cuotas ya pagadas"
                      type="number"
                      min={0}
                      max={numInstall - 1}
                      placeholder="0"
                      hint="Para compras anteriores"
                      {...register('paid_installments')}
                    />
                  )}
                </div>
                {numInstall > 1 && paidInstall > 0 && (
                  <div className="rounded-xl px-3 py-2.5 text-xs flex justify-between"
                    style={{ background: 'var(--mint-dim)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Quedan por pagar</span>
                    <span className="font-semibold" style={{ color: 'var(--mint)' }}>
                      {numInstall - paidInstall} de {numInstall} cuotas
                      {installAmount > 0 && ` · ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format((numInstall - paidInstall) * installAmount)}`}
                    </span>
                  </div>
                )}

                  {totalAmount > 0 && numInstall > 1 && (
                    <div className="rounded-xl px-4 py-3 text-sm space-y-1.5"
                      style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--text-muted)' }}>Cuota mensual</span>
                        <span className="font-bold" style={{ color: 'var(--mint)' }}>
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(installAmount)}
                        </span>
                      </div>
                      {effectiveRate > 0 && (
                        <>
                          <div className="flex justify-between text-xs">
                            <span style={{ color: 'var(--text-muted)' }}>Total a pagar (con interés)</span>
                            <span style={{ color: 'var(--red)' }}>
                              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(installAmount * numInstall)}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span style={{ color: 'var(--text-muted)' }}>Interés total</span>
                            <span style={{ color: '#f97316' }}>
                              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(installAmount * numInstall - totalAmount)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {purchaseType === 'installment_interest' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                          Tasa de interés
                        </span>
                        <div className="flex rounded-lg overflow-hidden border text-xs font-medium"
                          style={{ borderColor: 'var(--border)' }}>
                          {(['EA', 'MV'] as const).map(t => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => handleRateTypeToggle(t)}
                              className="px-3 py-1 transition-colors"
                              style={{
                                background: rateInputType === t ? 'var(--mint)' : 'var(--bg-raised)',
                                color: rateInputType === t ? '#fff' : 'var(--text-muted)',
                              }}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>

                      {rateInputType === 'EA' ? (
                        <Input
                          type="number"
                          step="0.01"
                          suffix="% EA"
                          placeholder={String(cardRate)}
                          {...register('interest_rate')}
                        />
                      ) : (
                        <Input
                          type="number"
                          step="0.0001"
                          suffix="% MV"
                          placeholder={(((1 + cardRate / 100) ** (1 / 12) - 1) * 100).toFixed(4)}
                          value={mvRate}
                          onChange={e => setMvRate(e.target.value)}
                        />
                      )}

                      {rateInputType === 'MV' && mvRate !== '' && !isNaN(parseFloat(mvRate)) && (
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Equivale a{' '}
                          <strong style={{ color: 'var(--mint)' }}>
                            {mvToEA(parseFloat(mvRate)).toFixed(2)}% EA
                          </strong>
                        </p>
                      )}
                      {rateInputType === 'EA' && customRate != null && (
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Equivale a{' '}
                          <strong style={{ color: 'var(--mint)' }}>
                            {(((1 + customRate / 100) ** (1 / 12) - 1) * 100).toFixed(4)}% MV
                          </strong>
                        </p>
                      )}
                    </div>
                  )}
              </>

              <Input
                label="Notas (opcional)"
                placeholder="Descripción adicional"
                {...register('notes')}
              />

              {error && <p className="text-sm" style={{ color: 'var(--red)' }}>{error}</p>}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Guardando…' : 'Registrar compra'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  )
}
