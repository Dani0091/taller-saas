'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Calendar } from 'lucide-react'

interface Orden {
  id: string
  numero_orden: string
  estado: string
  descripcion_problema: string
  kilometros_entrada: number
  created_at: string
}

export default function OrdenesPage() {
  const [ordenes, setOrdenes] = useState<Orden[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchOrdenes() {
      try {
        const res = await fetch('/api/ors')
        const data = await res.json()
        setOrdenes(data || [])
      } catch (err) {
        console.error('Error fetching ordenes:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchOrdenes()
  }, [])

  const getEstadoColor = (estado: string) => {
    switch(estado) {
      case 'recibido':
        return 'bg-blue-500'
      case 'diagnostico':
        return 'bg-yellow-500'
      case 'en_proceso':
        return 'bg-orange-500'
      case 'finalizado':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Órdenes de Reparación</h1>
        <Link href="/dashboard/ors/nueva">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Orden
          </Button>
        </Link>
      </div>

      {loading ? (
        <Card className="p-8 text-center">
          <p className="text-gray-600">Cargando órdenes...</p>
        </Card>
      ) : ordenes.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-600 mb-4">No hay órdenes aún</p>
          <Link href="/dashboard/ors/nueva">
            <Button>Crear primera orden</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {ordenes.map((orden) => (
            <Card key={orden.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Badge>{orden.numero_orden}</Badge>
                    <Badge className={getEstadoColor(orden.estado)}>
                      {orden.estado}
                    </Badge>
                  </div>

                  <p className="text-gray-700 mb-3">{orden.descripcion_problema}</p>

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(orden.created_at).toLocaleDateString()}
                    </div>
                    {orden.kilometros_entrada && (
                      <div>Km entrada: {orden.kilometros_entrada}</div>
                    )}
                  </div>
                </div>

                <Button variant="outline" className="ml-4">
                  Ver Detalles
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
