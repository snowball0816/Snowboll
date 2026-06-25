import { getDebtWithPayments } from '@/lib/db'
import { MOCK_USER_ID } from '@/lib/mock/data'
import { notFound } from 'next/navigation'
import DebtForm from '@/components/debts/DebtForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

type Params = { params: Promise<{ id: string }> }

export default async function EditDebtPage({ params }: Params) {
  const { id } = await params
  const data = await getDebtWithPayments(id, MOCK_USER_ID)
  if (!data) return notFound()

  const initial = {
    type:              data.type,
    name:              data.name,
    entity:            data.entity,
    initial_balance:   data.initial_balance,
    current_balance:   data.current_balance,
    interest_rate:     data.interest_rate,
    monthly_payment:   data.monthly_payment,
    credit_limit:      data.credit_limit,
    insurance_monthly: data.insurance_monthly,
    loan_type:         data.loan_type,
    term_months:       data.term_months,
    disbursement_date: data.disbursement_date,
    due_date:          data.due_date,
    cut_date:          data.cut_date,
    payment_due_date:  data.payment_due_date,
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <div>
        <Link href={`/debts/${id}`}
          className="inline-flex items-center gap-1.5 text-sm mb-4"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={15} /> Volver al detalle
        </Link>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1"
          style={{ color: 'var(--mint)', letterSpacing: '0.1em' }}>
          Editar
        </p>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {data.entity} — {data.name}
        </h1>
      </div>
      <DebtForm debtId={id} initial={initial} />
    </div>
  )
}
