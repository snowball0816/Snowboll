'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { frenchInstallment, monthlyRate } from '@/lib/engines/calculations'

const schema = z.object({
  type:                      z.enum(['credit_card', 'loan']),
  name:                      z.string().min(1, 'Requerido'),
  entity:                    z.string().min(1, 'Requerido'),
  initial_balance:           z.coerce.number().min(0).optional(),
  current_balance:           z.coerce.number().min(0).optional(),
  paid_installments_before:  z.coerce.number().min(0).optional(),
  interest_rate:             z.coerce.number().positive('Ingresa la tasa anual'),
  monthly_payment:           z.coerce.number().min(0).optional(),
  credit_limit:              z.coerce.number().optional(),
  insurance_monthly:         z.coerce.number().min(0).optional(),
  loan_type:                 z.string().optional(),
  term_months:               z.coerce.number().optional(),
  disbursement_date:         z.string().optional(),
  due_date:                  z.string().optional(),
  cut_date:                  z.coerce.number().optional(),
  payment_due_date:          z.coerce.number().optional(),
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

function balanceAfterNPayments(
  initialBalance: number,
  annualEA: number,
  termMonths: number,
  n: number,
): number {
  if (n <= 0) return initialBalance
  const r = monthlyRate(annualEA)
  const C = frenchInstallment(initialBalance, annualEA, termMonths)
  let balance = initialBalance
  for (let i = 0; i < Math.min(n, termMonths); i++) {
    const interest = balance * r
    const principal = C - interest
    balance = Math.max(0, balance - principal)
  }
  return Math.round(balance)
}

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

  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<FormValues, unknown, FormValues>({
      resolver: zodResolver(schema) as never,
      defaultValues: initial ?? { type: 'credit_card' },
    })

  const debtType           = watch('type')
  const initialBalance     = watch('initial_balance')
  const interestRate       = watch('interest_rate')
  const termMonths         = watch('term_months')
  const paidBefore         = watch('paid_installments_before')
  const [autoCalc, setAutoCalc] = useState(false)

  useEffect(() => {
    const n  = Number(paidBefore)
    const P  = Number(initialBalance)
    const EA = Number(interestRate)
    const T  = Number(termMonths)
    if (n > 0 && P > 0 && EA > 0 && T > 0) {
      setValue('current_balance', balanceAfterNPayments(P, EA, T, n))
      setAutoCalc(true)
    } else {
      setAutoCalc(false)
    }
  }, [paidBefore, initialBalance, interestRate, termMonths, setValue])

  async function onSubmit(values: FormValues) {
    setLoading(true)
    setError(null)
    try {
      const isCard = values.type === 'credit_card'
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { paid_installments_before: _drop, ...rest } = values
      const payload = {
        ...rest,
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
          <>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Saldo inicial del crédito" type="number" prefix="$" placeholder="0"
                error={errors.initial_balance?.message} {...register('initial_balance')} />
              <Input label="Cuotas ya pagadas antes de registrar" type="number" placeholder="0"
                hint="Déjalo en 0 si el crédito es nuevo"
                {...register('paid_installments_before')} />
            </div>
            <div>
              <Input label="Saldo actual" type="number" prefix="$" placeholder="0"
                error={errors.current_balance?.message} {...register('current_balance')} />
              {autoCalc && (
                <p className="text-xs mt-1.5 px-1" style={{ color: 'var(--mint)' }}>
                  ✓ Calculado automáticamente desde las cuotas pagadas
                </p>
              )}
            </div>
          </>
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
