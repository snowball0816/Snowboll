'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CreditCard, PlusCircle, BarChart3 } from 'lucide-react'

const nav = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Inicio'     },
  { href: '/debts',     icon: CreditCard,      label: 'Deudas'     },
  { href: '/debts/new', icon: PlusCircle,      label: 'Nueva'      },
  { href: '/strategy',  icon: BarChart3,       label: 'Estrategia' },
]

export default function BottomNav() {
  const path = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50"
      style={{
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
      <div className="flex">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = path === href
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium"
              style={{ color: active ? 'var(--mint)' : 'var(--text-muted)' }}
            >
              <Icon size={19} />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
