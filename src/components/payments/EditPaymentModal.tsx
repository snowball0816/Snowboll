'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, X } from 'lucide-react'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { Payment } from '@/types'

const schema = z.object({
  amount:       z.coerce.number().positive('Requerido'),
  type:         z.enum(['normal', 'partial', 'extraordinary', 'total']),
  payment_date: z.string(),
  notes:        z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export default function EditPaymentModal({ payment, debtId }: { payment: Payment; debtId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues, unknown, FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      amount:       payment.amount,
      type:         payment.type,
      payment_date: payment.payment_date,
      notes:        payment.notes ?? '',
    },
  })

  async function onSubmit(values: FormValues) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/debts/${debtId}/payments/${payment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
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
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
        style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
        <Pencil size={11} /> Editar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Editar pago</h2>
              <button onClick={() => setOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <Input label="Monto" type="number" prefix="$"
                error={errors.amount?.message} {...register('amount')} />
              <Select label="Tipo" options={[
                { value: 'normal',         label: 'Pago normal' },
                { value: 'partial',        label: 'Pago parcial' },
                { value: 'extraordinary',  label: 'Abono extraordinario' },
                { value: 'total',          label: 'Pago total' },
              ]} {...register('type')} />
              <Input label="Fecha" type="date" {...register('payment_date')} />
              <Input label="Notas (opcional)" {...register('notes')} />
              {error && <p className="text-xs" style={{ color: 'var(--red)' }}>{error}</p>}
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Guardando…' : 'Guardar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
