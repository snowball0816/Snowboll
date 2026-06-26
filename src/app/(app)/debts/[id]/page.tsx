import { getDebtWithPayments, getPurchases } from '@/lib/db'
import { MOCK_USER_ID } from '@/lib/mock/data'
import { notFound } from 'next/navigation'
import { Debt, Payment } from '@/types'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import {
  monthsToPayoff, payoffDate as calcPayoffDate,
  buildAmortizationTable, frenchInstallment,
} from '@/lib/engines/calculations'
import { monthlyCardObligation, totalInstallmentPayment } from '@/lib/engines/creditCard'
import PaymentModal from '@/components/payments/PaymentModal'
import EditPaymentModal from '@/components/payments/EditPaymentModal'
import DeletePaymentButton from '@/components/payments/DeletePaymentButton'
import DeleteDebtButton from '@/components/debts/DeleteDebtButton'
import PurchasesList from '@/components/purchases/PurchasesList'
import AddPurchaseModal from '@/components/purchases/AddPurchaseModal'
import Link from 'next/link'
import {
  ArrowLeft, Calendar, Percent, TrendingDown, CreditCard,
  Layers, ShieldCheck, Landmark, ChevronDown, Pencil,
} from 'lucide-react'

type Params = { params: Promise<{ id: string }> }

export default async function DebtDetailPage({ params }: Params) {
  const { id } = await params
  const data = await getDebtWithPayments(id, MOCK_USER_ID)
  if (!data) return notFound()

  const debt = data as Debt & { payments: Payment[] }
  const payments = [...(debt.payments ?? [])].sort(
    (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
  )

  const isCreditCard = debt.type === 'credit_card'
  const purchases = isCreditCard ? await getPurchases(id) : []

  const insurance = debt.insurance_monthly ?? 0

  const cuota = isCreditCard
    ? monthlyCardObligation(debt, purchases)
    : debt.monthly_payment

  const totalMes = cuota + insurance
  const displayBalance = debt.current_balance

  const progress = debt.initial_balance > 0
    ? Math.max(0, ((debt.initial_balance - displayBalance) / debt.initial_balance) * 100)
    : 100

  const months = monthsToPayoff(displayBalance, debt.interest_rate, cuota)
  const pDate = isFinite(months) ? calcPayoffDate(months) : null

  // Amortization table for loans
  const amortRows = !isCreditCard && debt.term_months
    ? buildAmortizationTable(displayBalance, debt.interest_rate, isFinite(months) && months > 0 ? Math.ceil(months) : debt.term_months, insurance, debt.monthly_payment || undefined)
    : []

  // Credit card breakdown
  const installmentsTotal = isCreditCard ? totalInstallmentPayment(purchases) : 0
  const singlePayments    = isCreditCard
    ? purchases.filter(p => p.status === 'active' && p.num_installments === 1 && p.paid_installments === 0).reduce((s, p) => s + p.installment_amount, 0)
    : 0

  const PAYMENT_LABELS: Record<string, string> = {
    normal: 'Pago normal',
    partial: 'Pago parcial',
    extraordinary: 'Abono extraordinario',
    total: 'Pago total',
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

      {/* Back */}
      <Link href="/debts"
        className="inline-flex items-center gap-1.5 text-sm"
        style={{ color: 'var(--text-muted)' }}>
        <ArrowLeft size={15} /> Mis deudas
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {isCreditCard
              ? <CreditCard size={18} style={{ color: '#6366f1' }} />
              : <Landmark size={18} style={{ color: 'var(--amber)' }} />}
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{debt.entity}</h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{debt.name}</p>
          {isCreditCard && debt.cut_date && (
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Corte día {debt.cut_date} · Pago límite día {debt.payment_due_date}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{
              background: debt.status === 'paid' ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)',
              color: debt.status === 'paid' ? 'var(--mint)' : '#6366f1',
            }}>
            {debt.status === 'paid' ? 'Liquidada' : 'Activa'}
          </span>
          <div className="flex items-center gap-2">
            <Link href={`/debts/${id}/edit`}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <Pencil size={12} /> Editar
            </Link>
            <DeleteDebtButton debtId={id} />
          </div>
        </div>
      </div>

      {/* Balance principal */}
      <div className="rounded-2xl p-5"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="flex justify-between items-start mb-5">
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              {isCreditCard ? 'Saldo en compras' : 'Saldo pendiente'}
            </p>
            <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(displayBalance)}
            </p>
            {isCreditCard && debt.credit_limit && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Disponible: {formatCurrency(debt.credit_limit - displayBalance)} de {formatCurrency(debt.credit_limit)}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Pago este mes</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--mint)' }}>
              {formatCurrency(totalMes)}
            </p>
            {insurance > 0 && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                cuota {formatCurrency(cuota)} + seguro {formatCurrency(insurance)}
              </p>
            )}
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
            <span>{Math.round(progress)}% pagado</span>
            <span>{pDate ? `Libre aprox. ${formatDateShort(pDate)}` : 'Sin plazo definido'}</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: 'var(--bg-raised)' }}>
            <div className="h-full rounded-full"
              style={{
                width: `${Math.min(100, progress)}%`,
                background: 'var(--mint)',
                boxShadow: '0 0 6px rgba(16,185,129,0.35)',
              }} />
          </div>
        </div>
      </div>

      {/* Datos clave */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<Percent size={14} style={{ color: 'var(--sky)' }} />}
          label="Tasa"
          value={`${debt.interest_rate}% EA`}
          bg="rgba(14,165,233,0.08)"
        />
        {isCreditCard ? (
          <>
            <StatCard
              icon={<Layers size={14} style={{ color: '#6366f1' }} />}
              label="Cuotas/mes"
              value={formatCurrency(installmentsTotal)}
              bg="rgba(99,102,241,0.08)"
            />
            <StatCard
              icon={<TrendingDown size={14} style={{ color: 'var(--amber)' }} />}
              label="1 cuota"
              value={formatCurrency(singlePayments)}
              bg="rgba(245,158,11,0.08)"
            />
          </>
        ) : (
          <>
            <StatCard
              icon={<TrendingDown size={14} style={{ color: 'var(--amber)' }} />}
              label="Cuota base"
              value={formatCurrency(debt.monthly_payment)}
              bg="rgba(245,158,11,0.08)"
            />
            <StatCard
              icon={<Calendar size={14} style={{ color: 'var(--mint)' }} />}
              label="Pago aprox."
              value={pDate ? formatDateShort(pDate) : '∞'}
              bg="var(--mint-dim)"
            />
          </>
        )}
      </div>

      {/* Seguro */}
      {insurance > 0 && (
        <div className="flex items-center gap-3 rounded-2xl px-5 py-3.5"
          style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid var(--mint-border)' }}>
          <ShieldCheck size={16} style={{ color: 'var(--mint)' }} />
          <div>
            <p className="text-xs font-semibold" style={{ color: 'var(--mint)' }}>Seguro mensual incluido</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Se suman {formatCurrency(insurance)}/mes a tu cuota real
            </p>
          </div>
          <p className="ml-auto font-bold text-sm" style={{ color: 'var(--mint)' }}>
            {formatCurrency(insurance)}/mes
          </p>
        </div>
      )}

      {/* Compras tarjeta */}
      {isCreditCard && debt.status === 'active' && (
        <div className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between px-5 py-4"
            style={{ background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <CreditCard size={14} style={{ color: '#6366f1' }} />
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                Compras ({purchases.filter(p => p.status === 'active').length} activas)
              </p>
            </div>
            <AddPurchaseModal debtId={debt.id} cardRate={debt.interest_rate} />
          </div>
          <div style={{ background: 'var(--bg-surface)' }}>
            <PurchasesList purchases={purchases} debtId={debt.id} cardRate={debt.interest_rate} />
          </div>
        </div>
      )}

      {/* Tabla de amortización (solo créditos) */}
      {!isCreditCard && amortRows.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--border)' }}>
          <div className="px-5 py-4"
            style={{ background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Tabla de amortización — Método Francés
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Tasa mensual: {((Math.pow(1 + debt.interest_rate / 100, 1 / 12) - 1) * 100).toFixed(4)}% · Cuota fija: {formatCurrency(frenchInstallment(displayBalance, debt.interest_rate, Math.ceil(months)))}
              {insurance > 0 ? ` + seguro ${formatCurrency(insurance)}` : ''}
            </p>
          </div>
          <div style={{ background: 'var(--bg-surface)', overflowX: 'auto' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-raised)' }}>
                  {['#', 'Fecha', 'Cuota', 'Interés', 'Capital', insurance > 0 ? 'Seguro' : null, 'Total', 'Saldo'].filter(Boolean).map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-semibold"
                      style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {amortRows.slice(0, 36).map((row, i) => (
                  <tr key={row.period}
                    style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-raised)' }}>
                    <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--text-muted)' }}>{row.period}</td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>{formatDateShort(row.date)}</td>
                    <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(row.payment)}</td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--red)' }}>{formatCurrency(row.interest)}</td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--mint)' }}>{formatCurrency(row.principal)}</td>
                    {insurance > 0 && (
                      <td className="px-4 py-2.5" style={{ color: 'var(--sky)' }}>{formatCurrency(row.insurance)}</td>
                    )}
                    <td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(row.totalPayment)}</td>
                    <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {amortRows.length > 36 && (
              <div className="px-5 py-3 text-center">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Mostrando primeras 36 cuotas de {amortRows.length}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Registrar pago */}
      {debt.status === 'active' && (
        <PaymentModal
          debtId={debt.id}
          currentBalance={displayBalance}
          suggestedAmount={totalMes}
        />
      )}

      {/* Historial de pagos */}
      <div className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid var(--border)' }}>
        <div className="px-5 py-4"
          style={{ background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Historial de pagos</p>
        </div>
        {payments.length === 0 ? (
          <div className="py-8 text-center" style={{ background: 'var(--bg-surface)' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin pagos registrados aún</p>
          </div>
        ) : (
          <div style={{ background: 'var(--bg-surface)' }}>
            {payments.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3.5"
                style={{ borderBottom: i < payments.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {PAYMENT_LABELS[p.type] ?? p.type}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {formatDateShort(p.payment_date)}
                    {p.principal_amount > 0 && ` · capital ${formatCurrency(p.principal_amount)}`}
                    {p.interest_amount > 0 && ` · interés ${formatCurrency(p.interest_amount)}`}
                  </p>
                  {p.notes && <p className="text-xs mt-0.5 italic" style={{ color: 'var(--text-muted)' }}>{p.notes}</p>}
                </div>
                <p className="font-bold text-sm shrink-0" style={{ color: 'var(--mint)' }}>
                  {formatCurrency(p.amount)}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  <EditPaymentModal payment={p} debtId={id} />
                  <DeletePaymentButton paymentId={p.id} debtId={id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

function StatCard({ icon, label, value, bg }: {
  icon: React.ReactNode
  label: string
  value: string
  bg: string
}) {
  return (
    <div className="rounded-2xl p-4 text-center"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2"
        style={{ background: bg }}>
        {icon}
      </div>
      <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  )
}
