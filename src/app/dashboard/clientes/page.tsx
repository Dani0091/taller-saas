'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Cliente } from '@/types/cliente'
import { ListadoClientes } from '@/components/dashboard/clientes/listado-clientes'

export default function ClientesPage() {
  const supabase = createClientComponentClient()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [tallerId, setTallerId] = useState<string>('')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      obtenerTallerId()
    }
  }, [mounted])

  useEffect(() => {
    if (tallerId) {
      cargarClientes()
    }
  }, [tallerId])

  const obtenerTallerId = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        toast.error('No autenticado')
        return
      }

      const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('taller_id')
        .eq('email', session.user.email)
        .single()

      if (error || !usuario) {
        toast.error('No se pudo obtener taller')
        return
      }

      console.log('✅ Taller ID:', usuario.taller_id)
      setTallerId(usuario.taller_id)
    } catch (error: any) {
      console.error('❌ Error obtener taller:', error)
      toast.error('Error obtener taller')
    }
  }

  const cargarClientes = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/clientes?taller_id=${tallerId}`)
      const data = await res.json()
      
      console.log('📋 Clientes cargados:', data.length)
      setClientes(data || [])
    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">👥 Clientes</h1>
        <p className="text-gray-600 mt-1">Gestiona todos tus clientes</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <ListadoClientes clientes={clientes} onActualizar={cargarClientes} />
      )}
    </div>
  )
}
