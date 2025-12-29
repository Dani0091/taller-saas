'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Cliente } from '@/types/cliente'
import { ListadoClientes } from '@/components/dashboard/clientes/listado-clientes'

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      cargarClientes()
    }
  }, [mounted])

  const cargarClientes = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/clientes')
      const data = await res.json()
      
      if (!data.success) throw new Error(data.error)
      setClientes(data.clientes)
    } catch (error: any) {
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
