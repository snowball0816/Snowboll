'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { DollarSign, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const schema = z.object({
  amount:       z.coerce.number().positive('El monto debe ser mayor a 0'),
  type:         z.enum(['normal', 'partial', 'extraordinary', 'total']),
  payment_date: z.string(),
  notes:        z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export default function PaymentModal({
  debtId,
  currentBalance,
  suggestedAmount,
}: {
  debtId: string
  currentBalance: number
  suggestedAmount?: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<FormValues, unknown, FormValues>({
      resolver: zodResolver(schema) as never,
      defaultValues: {
        type: 'normal',
        payment_date: new Date().toISOString().split('T')[0],
      },
    })

  async function onSubmit(values: FormValues) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/debts/${debtId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al registrar')
      setOpen(false)
      reset()
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all"
        style={{ background: 'var(--mint)', color: '#071a12' }}>
        <DollarSign size={17} /> Registrar pago
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>

            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-0.5"
                  style={{ color: 'var(--mint)', letterSpacing: '0.08em' }}>
                  Registrar
                </p>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  Nuevo pago
                </h2>
              </div>
              <button onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Select
                label="Tipo de pago"
                options={[
                  { value: 'normal',        label: 'Pago normal (cuota)' },
                  { value: 'partial',       label: 'Pago parcial' },
                  { value: 'extraordinary', label: 'Abono extraordinario' },
                  { value: 'total',         label: `Pago total (${formatCurrency(currentBalance)})` },
                ]}
                {...register('type')}
              />

              <Input
                label="Monto"
                type="number"
                prefix="$"
                placeholder={suggestedAmount ? String(suggestedAmount) : '0'}
                error={errors.amount?.message}
                {...register('amount')}
              />

              {suggestedAmount && (
                <p className="text-xs -mt-2" style={{ color: 'var(--mint)' }}>
                  Obligación calculada este mes: {formatCurrency(suggestedAmount)}
                </p>
              )}

              <Input label="Fecha de pago" type="date" {...register('payment_date')} />
              <Input label="Notas (opcional)" placeholder="Ej. Prima de diciembre" {...register('notes')} />

              {error && <p className="text-sm" style={{ color: 'var(--red)' }}>{error}</p>}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Guardando…' : 'Registrar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
