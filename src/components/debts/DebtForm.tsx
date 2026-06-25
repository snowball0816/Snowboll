'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'

const schema = z.object({
  type:              z.enum(['credit_card', 'loan']),
  name:              z.string().min(1, 'Requerido'),
  entity:            z.string().min(1, 'Requerido'),
  initial_balance:   z.coerce.number().min(0).optional(),
  current_balance:   z.coerce.number().min(0).optional(),
  interest_rate:     z.coerce.number().positive('Ingresa la tasa anual'),
  monthly_payment:   z.coerce.number().min(0).optional(),
  credit_limit:      z.coerce.number().optional(),
  insurance_monthly: z.coerce.number().min(0).optional(),
  loan_type:         z.string().optional(),
  term_months:       z.coerce.number().optional(),
  disbursement_date: z.string().optional(),
  due_date:          z.string().optional(),
  cut_date:          z.coerce.number().optional(),
  payment_due_date:  z.coerce.number().optional(),
}).superRefine((data, ctx) => {
  if (data.type === 'loan') {
    if (!data.initial_balance || data.initial_balance <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Debe ser mayor a 0', path: ['initial_balance'] })
    }
    if (data.current_balance === undefined || data.current_balance < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ingresa el saldo actual', path: ['current_balance'] })
    }
  }
})

type FormValues = z.infer<typeof schema>

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5 space-y-4"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <p className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
        {title}
      </p>
      {children}
    </div>
  )
}

export default function DebtForm({ debtId, initial }: { debtId?: string; initial?: Partial<FormValues> }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, watch, formState: { errors } } =
    useForm<FormValues, unknown, FormValues>({
      resolver: zodResolver(schema) as never,
      defaultValues: initial ?? { type: 'credit_card' },
    })

  const debtType = watch('type')

  async function onSubmit(values: FormValues) {
    setLoading(true)
    setError(null)
    try {
      const isCard = values.type === 'credit_card'
      // For credit cards, omit financial fields — they're derived from purchases at read time.
      // undefined values are stripped by JSON.stringify so the server won't overwrite existing data.
      const payload = {
        ...values,
        initial_balance:  isCard ? undefined : values.initial_balance,
        current_balance:  isCard ? undefined : values.current_balance,
        monthly_payment:  isCard ? undefined : (values.monthly_payment ?? 0),
      }
      const res = await fetch(debtId ? `/api/debts/${debtId}` : '/api/debts', {
        method: debtId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al guardar')
      router.push('/debts')
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Section title="Tipo de deuda">
        <Select
          options={[
            { value: 'credit_card', label: '💳  Tarjeta de crédito' },
            { value: 'loan',        label: '🏦  Crédito / Préstamo'  },
          ]}
          {...register('type')}
        />
      </Section>

      <Section title="Información básica">
        <Input label="Entidad / Banco" placeholder="Ej. Bancolombia"
          error={errors.entity?.message} {...register('entity')} />
        <Input label="Nombre / Descripción" placeholder="Ej. Visa Platinum"
          error={errors.name?.message} {...register('name')} />
      </Section>

      <Section title="Datos financieros">
        {debtType === 'loan' ? (
          <div className="grid grid-cols-2 gap-4">
            <Input label="Saldo inicial" type="number" prefix="$" placeholder="0"
              error={errors.initial_balance?.message} {...register('initial_balance')} />
            <Input label="Saldo actual" type="number" prefix="$" placeholder="0"
              error={errors.current_balance?.message} {...register('current_balance')} />
          </div>
        ) : (
          <div className="rounded-xl px-4 py-3 text-sm"
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
            <p className="font-medium mb-0.5" style={{ color: 'var(--text-secondary)' }}>Saldo y cuota</p>
            <p style={{ color: 'var(--text-muted)' }}>
              Se calculan automáticamente desde tus compras registradas.
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Input label="Tasa de interés anual" type="number" step="0.01" suffix="% EA"
            placeholder="24.00" error={errors.interest_rate?.message} {...register('interest_rate')} />
          {debtType === 'loan' ? (
            <Input label="Cuota mensual" type="number" prefix="$" placeholder="0"
              error={errors.monthly_payment?.message} {...register('monthly_payment')} />
          ) : (
            <div className="flex flex-col justify-end pb-0.5">
              <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Cuota mensual</p>
              <div className="rounded-xl px-3 py-2.5 text-sm"
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                Se calcula de tus compras
              </div>
            </div>
          )}
        </div>
        {debtType === 'credit_card' && (
          <Input label="Cupo total (opcional)" type="number" prefix="$" placeholder="0"
            {...register('credit_limit')} />
        )}
        <Input
          label="Seguro mensual (cuota de manejo, seguro de vida, etc.)"
          type="number" prefix="$" placeholder="0"
          hint="Monto fijo que se suma cada mes a tu cuota"
          {...register('insurance_monthly')}
        />
      </Section>

      {debtType === 'loan' && (
        <Section title="Datos del crédito">
          <Select label="Tipo de crédito"
            options={[
              { value: 'libre_inversion', label: 'Libre inversión' },
              { value: 'vehiculo',        label: 'Vehículo' },
              { value: 'hipotecario',     label: 'Hipotecario' },
              { value: 'libranza',        label: 'Libranza' },
              { value: 'cooperativa',     label: 'Cooperativa' },
              { value: 'familiar',        label: 'Familiar' },
              { value: 'otro',            label: 'Otro' },
            ]}
            {...register('loan_type')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Plazo (meses)" type="number" placeholder="36" {...register('term_months')} />
            <Input label="Fecha desembolso" type="date" {...register('disbursement_date')} />
          </div>
          <Input label="Fecha vencimiento" type="date" {...register('due_date')} />
        </Section>
      )}

      {debtType === 'credit_card' && (
        <Section title="Fechas de la tarjeta">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Día de corte" type="number" min={1} max={31} placeholder="1"
              {...register('cut_date')} />
            <Input label="Día límite de pago" type="number" min={1} max={31} placeholder="15"
              {...register('payment_due_date')} />
          </div>
        </Section>
      )}

      {error && (
        <p className="text-sm px-1" style={{ color: 'var(--red)' }}>{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={() => router.back()} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Guardando…' : 'Guardar deuda'}
        </Button>
      </div>
    </form>
  )
}
