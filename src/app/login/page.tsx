'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SnowbollWordmark } from '@/components/brand/SnowbollLogo'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Error al iniciar sesión')
        return
      }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-page)',
      padding: '1.5rem',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '380px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <SnowbollWordmark size="lg" />
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Ingresa tu contraseña para continuar
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoFocus
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '15px',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                background: 'var(--bg-raised)',
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <p style={{ fontSize: '13px', color: 'var(--red)', margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%',
              padding: '11px',
              fontSize: '14px',
              fontWeight: 600,
              borderRadius: '10px',
              border: 'none',
              background: loading || !password ? 'rgba(16,185,129,0.4)' : '#10b981',
              color: '#fff',
              cursor: loading || !password ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? 'Ingresando…' : 'Entrar'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginTop: '1.5rem' }}>
          Contraseña por defecto: <code style={{ fontFamily: 'monospace' }}>demo</code>
          <br />
          Cambia con la variable <code style={{ fontFamily: 'monospace' }}>SNOWBOLL_PASSWORD</code>
        </p>
      </div>
    </div>
  )
}
