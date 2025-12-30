'use client'

import { Bell, User, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function Header({ user }: { user?: any }) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>
        {user?.email && (
          <p className="text-xs text-gray-600 mt-1">{user.email}</p>
        )}
      </div>
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleLogout}
          className="gap-2 text-red-600 hover:text-red-700"
        >
          <LogOut className="w-4 h-4" />
          Salir
        </Button>
      </div>
    </header>
  )
}
