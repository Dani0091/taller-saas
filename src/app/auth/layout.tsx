'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const hasChecked = useRef(false)

  useEffect(() => {
    // Prevenir múltiples chequeos
    if (hasChecked.current) return
    hasChecked.current = true

    let mounted = true

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (mounted && session) {
          router.push('/dashboard')
        }
      } catch (error) {
        console.error('Error checking session:', error)
      }
    }

    checkSession()

    return () => {
      mounted = false
    }
  }, [supabase, router])

  return <>{children}</>
}
