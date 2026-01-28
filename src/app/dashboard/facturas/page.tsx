'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FileText, Plus, Download, Eye, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { listarFacturasAction, anularFacturaAction } from '@/actions/facturas'
import type { FacturaListadoDTO } from '@/application/dtos'
import { EstadoFactura } from '@/domain/types'

const estadoColors: Record<string, string> = {
  'borrador': 'bg-gray-100 text-gray-800',
  'emitida': 'bg-blue-100 text-blue-800',
  'pagada': 'bg-green-100 text-green-800',
  'anulada': 'bg-red-100 text-red-800',
}

export default function FacturasPage() {
  const [facturas, setFacturas] = useState<FacturaListadoDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<EstadoFactura | ''>('')
  const [busqueda, setBusqueda] = useState<string>('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchFacturas()
  }, [filtroEstado])

  const fetchFacturas = async () => {
    try {
      setLoading(true)
      setError(null)

      // Usar Server Action blindada en lugar de API route
      const resultado = await listarFacturasAction({
        estado: filtroEstado || undefined,
        page: 1,
        pageSize: 100
      })

      if (!resultado.success) {
        throw new Error(resultado.error)
      }

      setFacturas(resultado.data.data)
    } catch (err: any) {
      console.error('Error cargando facturas:', err)
      setError(err.message || 'Error al cargar facturas')
      toast.error('Error al cargar facturas')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas anular esta factura?')) return

    setDeletingId(id)
    try {
      // Usar Server Action para anular (no eliminar)
      const resultado = await anularFacturaAction({
        facturaId: id,
        motivo: 'Anulada desde el listado de facturas'
      })

      if (!resultado.success) {
        throw new Error(resultado.error)
      }

      toast.success('Factura anulada correctamente')
      fetchFacturas()
    } catch (err: any) {
      console.error('Error anulando factura:', err)
      toast.error(err.message || 'Error al anular factura')
    } finally {
      setDeletingId(null)
    }
  }

  const facturasFiltradas = facturas.filter(f =>
    (f.numeroFactura || '').toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Facturas</h1>
          <p className="text-gray-600 mt-1">Gestiona todas tus facturas</p>
        </div>
        <Link href="/dashboard/facturas/nueva">
          <Button className="gap-2 bg-sky-600 hover:bg-sky-700 w-full sm:w-auto">
            <Plus className="w-5 h-5" />
            Nueva Factura
          </Button>
        </Link>
      </div>

      {/* FILTROS */}
      <Card className="p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Buscar</label>
            <Input
              placeholder="Buscar por número..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as EstadoFactura | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            >
              <option value="">Todos los estados</option>
              <option value="borrador">Borrador</option>
              <option value="emitida">Emitida</option>
              <option value="pagada">Pagada</option>
              <option value="anulada">Anulada</option>
            </select>
          </div>
        </div>
      </Card>

      {/* LISTADO */}
      {error ? (
        <Card className="p-12 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 font-medium mb-2">Error al cargar datos</p>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <Button onClick={() => { setError(null); fetchFacturas(); }}>
            Reintentar
          </Button>
        </Card>
      ) : loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
        </div>
      ) : facturasFiltradas.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No hay facturas</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-left text-sm font-semibold text-gray-700">Número</th>
                  <th className="px-4 md:px-6 py-3 text-left text-sm font-semibold text-gray-700 hidden sm:table-cell">Fecha</th>
                  <th className="px-4 md:px-6 py-3 text-left text-sm font-semibold text-gray-700">Total</th>
                  <th className="px-4 md:px-6 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
                  <th className="px-4 md:px-6 py-3 text-center text-sm font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {facturasFiltradas.map((factura) => (
                  <tr key={factura.id} className="border-b hover:bg-gray-50 transition">
                    <td className="px-4 md:px-6 py-4 font-semibold text-gray-900">{factura.numeroFactura || '—'}</td>
                    <td className="px-4 md:px-6 py-4 text-gray-600 hidden sm:table-cell">
                      {new Date(factura.fechaEmision).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-4 md:px-6 py-4 font-semibold text-gray-900">
                      {factura.totalFormateado}
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <Badge className={estadoColors[factura.estado] || 'bg-gray-100'}>
                        {factura.estado}
                      </Badge>
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <div className="flex justify-center gap-1 md:gap-2">
                        <Link href={`/dashboard/facturas/ver?id=${factura.id}`}>
                          <Button variant="ghost" size="sm" className="text-sky-600 p-2">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        {factura.estado === 'emitida' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(factura.id)}
                            disabled={deletingId === factura.id}
                            className="text-red-600 p-2"
                          >
                            {deletingId === factura.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
