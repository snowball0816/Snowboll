'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export default function DeleteDebtButton({ debtId }: { debtId: string }) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    await fetch(`/api/debts/${debtId}`, { method: 'DELETE' })
    router.push('/debts')
    router.refresh()
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>¿Eliminar?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg font-semibold"
          style={{ background: 'var(--red)', color: '#fff' }}>
          {loading ? 'Eliminando…' : 'Sí, eliminar'}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="text-xs px-3 py-1.5 rounded-lg"
          style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
      style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
      <Trash2 size={13} /> Eliminar deuda
    </button>
  )
}
