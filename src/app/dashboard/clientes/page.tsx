'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Cliente } from '@/types/cliente'
import { ListadoClientes } from '@/components/dashboard/clientes/listado-clientes'
import { Button } from '@/components/ui/button'

export default function ClientesPage() {
  const supabase = createClient()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [tallerId, setTallerId] = useState<string>('')
  const initRef = useRef(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !initRef.current) {
      initRef.current = true
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
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.email) {
        setError('No autenticado')
        setLoading(false)
        return
      }

      const { data: usuario, error: usuarioError } = await supabase
        .from('usuarios')
        .select('taller_id')
        .eq('email', session.user.email)
        .single()

      if (usuarioError || !usuario?.taller_id) {
        setError('Usuario no encontrado o sin taller asignado')
        setLoading(false)
        return
      }

      setTallerId(usuario.taller_id)
    } catch (err: any) {
      console.error('❌ Error obtener taller:', err)
      setError(err.message || 'Error al obtener datos del usuario')
      setLoading(false)
    }
  }

  const cargarClientes = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/clientes?taller_id=${tallerId}`)

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `Error ${res.status}`)
      }

      const data = await res.json()
      setClientes(Array.isArray(data) ? data : [])
    } catch (err: any) {
      console.error('Error cargando clientes:', err)
      setError(err.message || 'Error al cargar clientes')
      toast.error('Error al cargar clientes')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Clientes</h1>
        <p className="text-gray-600 mt-1">Gestiona todos tus clientes</p>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-red-600 font-medium mb-2">Error al cargar datos</p>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <Button onClick={() => { setError(null); obtenerTallerId(); }}>
            Reintentar
          </Button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
        </div>
      ) : (
        <ListadoClientes clientes={clientes} onActualizar={cargarClientes} />
      )}
    </div>
  )
}
