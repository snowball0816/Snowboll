'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  CreditCard,
  PlusCircle,
  BarChart3,
  LogOut,
} from 'lucide-react'
import { SnowbollIcon, SnowbollWordmark } from '@/components/brand/SnowbollLogo'

const nav = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Resumen'     },
  { href: '/debts',     icon: CreditCard,      label: 'Mis Deudas'  },
  { href: '/debts/new', icon: PlusCircle,      label: 'Nueva Deuda' },
  { href: '/strategy',  icon: BarChart3,       label: 'Estrategia'  },
]

export default function Sidebar() {
  const path = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      className="hidden md:flex flex-col w-56 shrink-0 min-h-screen"
      style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}
    >
      {/* Logo */}
      <div className="px-4 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <Link href="/dashboard">
          <SnowbollWordmark size="md" />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = path === href ||
            (href === '/debts' && path.startsWith('/debts') && path !== '/debts/new')
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium relative transition-all"
              style={{
                background: active ? 'rgba(16,185,129,0.10)' : 'transparent',
                color: active ? '#10b981' : 'var(--text-secondary)',
              }}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                  style={{ background: '#10b981' }}
                />
              )}
              <Icon
                size={16}
                style={{ color: active ? '#10b981' : 'var(--text-muted)' }}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 pb-4 pt-3 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <SnowbollIcon size={18} />
          <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
            Método Bola de Nieve
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm"
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <LogOut size={14} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
