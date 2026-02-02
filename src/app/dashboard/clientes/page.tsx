'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { listarClientesAction } from '@/actions/clientes'
import type { ClienteListadoDTO } from '@/application/dtos'
import { ListadoClientes } from '@/components/dashboard/clientes/listado-clientes'
import { Button } from '@/components/ui/button'

export default function ClientesPage() {
  const [clientes, setClientes] = useState<ClienteListadoDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const initRef = useRef(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !initRef.current) {
      initRef.current = true
      cargarClientes()
    }
  }, [mounted])

  const cargarClientes = async () => {
    try {
      setLoading(true)
      setError(null)

      // Usar Server Action blindada en lugar de API route o Supabase directo
      const resultado = await listarClientesAction({
        incluirEliminados: false,
        page: 1,
        pageSize: 100
      })

      if (!resultado.success) {
        throw new Error(resultado.error)
      }

      setClientes(resultado.data.data)
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
          <Button onClick={() => { setError(null); cargarClientes(); }}>
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
