'use client'

import Link from 'next/link'
import { Home, Wrench, Users, FileText, Settings, LogOut } from 'lucide-react'

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/dashboard/ors', label: 'Órdenes', icon: Wrench },
  { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
  { href: '/dashboard/facturas', label: 'Facturas', icon: FileText },
  { href: '/dashboard/settings', label: 'Configuración', icon: Settings },
]

export function Sidebar({ user }: { user: any }) {
  return (
    <aside className="w-64 bg-gray-900 text-white p-6 flex flex-col">
      <h1 className="text-2xl font-bold mb-8">🔧 TallerAgil</h1>
      <nav className="flex-1 space-y-2">
        {links.map((link) => {
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-800"
            >
              <Icon className="w-5 h-5" />
              {link.label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-gray-700 pt-4">
        <p className="text-sm text-gray-400">{user?.email}</p>
      </div>
    </aside>
  )
}
