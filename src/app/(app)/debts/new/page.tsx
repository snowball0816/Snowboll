import DebtForm from '@/components/debts/DebtForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewDebtPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <div>
        <Link href="/debts"
          className="inline-flex items-center gap-1.5 text-sm mb-4"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={15} /> Mis deudas
        </Link>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1"
          style={{ color: 'var(--mint)', letterSpacing: '0.1em' }}>
          Registrar
        </p>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Nueva Deuda
        </h1>
      </div>
      <DebtForm />
    </div>
  )
}
