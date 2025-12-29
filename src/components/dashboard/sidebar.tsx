'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Wrench, Users, FileText, Settings } from 'lucide-react'

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/dashboard/ordenes', label: 'Órdenes', icon: Wrench },
  { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
  { href: '/dashboard/facturas', label: 'Facturas', icon: FileText },
  { href: '/dashboard/configuracion', label: 'Configuración', icon: Settings },
]

export function Sidebar({ user }: { user?: any }) {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-gray-900 text-white p-6 flex flex-col border-r border-gray-800">
      <h1 className="text-2xl font-bold mb-8">🔧 TallerAgil</h1>
      
      <nav className="flex-1 space-y-2">
        {links.map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.href
          
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <Icon className="w-5 h-5" />
              {link.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-gray-700 pt-4">
        {user?.email ? (
          <>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
            <p className="text-xs text-gray-500 mt-1">TallerAgil v1.0</p>
          </>
        ) : (
          <p className="text-xs text-gray-400">Cargando...</p>
        )}
      </div>
    </aside>
  )
}
