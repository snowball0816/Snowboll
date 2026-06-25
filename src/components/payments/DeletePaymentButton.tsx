'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export default function DeletePaymentButton({ paymentId, debtId }: { paymentId: string; debtId: string }) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    await fetch(`/api/debts/${debtId}/payments/${paymentId}`, { method: 'DELETE' })
    router.refresh()
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-1.5">
        <button onClick={handleDelete} disabled={loading}
          className="text-xs px-2 py-1 rounded-lg font-semibold"
          style={{ background: 'var(--red)', color: '#fff' }}>
          {loading ? '…' : 'Sí'}
        </button>
        <button onClick={() => setConfirm(false)}
          className="text-xs px-2 py-1 rounded-lg"
          style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          No
        </button>
      </div>
    )
  }

  return (
    <button onClick={() => setConfirm(true)}
      className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
      style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
      <Trash2 size={11} />
    </button>
  )
}
