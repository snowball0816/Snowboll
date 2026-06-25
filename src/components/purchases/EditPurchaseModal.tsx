'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CreditCardPurchase } from '@/types'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Pencil, X } from 'lucide-react'
import { installmentWithInterest } from '@/lib/engines/calculations'

const schema = z.object({
  description:       z.string().min(1, 'Requerido'),
  purchase_date:     z.string(),
  total_amount:      z.coerce.number().positive('Requerido'),
  purchase_type:     z.enum(['installment_free', 'installment_interest']),
  num_installments:  z.coerce.number().min(1),
  paid_installments: z.coerce.number().min(0),
  interest_rate:     z.coerce.number().min(0).optional(),
  notes:             z.string().optional(),
})

type FormValues = z.infer<typeof schema>

function purchaseTypeFromRecord(p: CreditCardPurchase): FormValues['purchase_type'] {
  return p.interest_free ? 'installment_free' : 'installment_interest'
}

export default function EditPurchaseModal({
  purchase,
  cardRate,
}: {
  purchase: CreditCardPurchase
  cardRate: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, watch, reset, formState: { errors } } =
    useForm<FormValues, unknown, FormValues>({
      resolver: zodResolver(schema) as never,
      defaultValues: {
        description:       purchase.description,
        purchase_date:     purchase.purchase_date,
        total_amount:      purchase.total_amount,
        purchase_type:     purchaseTypeFromRecord(purchase),
        num_installments:  purchase.num_installments,
        paid_installments: purchase.paid_installments,
        interest_rate:     purchase.interest_rate ?? cardRate,
        notes:             purchase.notes ?? '',
      },
    })

  const purchaseType = watch('purchase_type')
  const totalAmount  = watch('total_amount') || 0
  const numInstall   = watch('num_installments') || 1
  const customRate   = watch('interest_rate')

  const effectiveRate =
    purchaseType === 'installment_interest' ? (customRate ?? cardRate) : 0

  const installAmount =
    numInstall > 1
      ? installmentWithInterest(totalAmount, effectiveRate, numInstall)
      : totalAmount

  async function onSubmit(values: FormValues) {
    setLoading(true)
    setError(null)
    try {
      const interestFree = values.purchase_type === 'installment_free'

      const payload = {
        debtId:             purchase.debt_id,
        description:        values.description,
        purchase_date:      values.purchase_date,
        total_amount:       values.total_amount,
        num_installments:   values.num_installments,
        paid_installments:  values.paid_installments,
        installment_amount: installAmount,
        interest_free:      interestFree,
        interest_rate:      interestFree ? 0 : (values.interest_rate ?? cardRate),
        notes:              values.notes || undefined,
      }

      const res = await fetch(`/api/purchases/${purchase.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  function handleClose() {
    reset()
    setError(null)
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
        style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
      >
        <Pencil size={13} /> Editar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/60">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Editar compra</h2>
              <button onClick={handleClose} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Descripción"
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
                    label="Total de cuotas"
                    type="number"
                    min={1}
                    max={60}
                    hint="1 = pago completo este mes"
                    error={errors.num_installments?.message}
                    {...register('num_installments')}
                  />
                    <Input
                      label="Cuotas ya pagadas"
                      type="number"
                      min={0}
                      {...register('paid_installments')}
                    />
                  </div>

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
                            <span style={{ color: 'var(--text-muted)' }}>Total a pagar</span>
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
                    <Input
                      label="Tasa de interés anual"
                      type="number"
                      step="0.01"
                      suffix="% EA"
                      placeholder={String(cardRate)}
                      {...register('interest_rate')}
                    />
                  )}
              </>

              <Input
                label="Notas (opcional)"
                {...register('notes')}
              />

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Guardando…' : 'Guardar cambios'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  )
}
