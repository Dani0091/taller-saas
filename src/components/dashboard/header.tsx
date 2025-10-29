'use client'

import { Bell, User } from 'lucide-react'

export function Header({ user }: { user: any }) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>
      <div className="flex items-center gap-4">
        <Bell className="w-5 h-5 cursor-pointer" />
        <User className="w-5 h-5 cursor-pointer" />
      </div>
    </header>
  )
}
