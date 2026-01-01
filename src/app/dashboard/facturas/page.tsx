'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FileText, Plus, Download, Eye, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface Factura {
  id: string
  numero_factura: string
  fecha_emision: string
  cliente_id: string
  total: number
  estado: string
  pdf_url?: string
}

const estadoColors: Record<string, string> = {
  'borrador': 'bg-gray-100 text-gray-800',
  'emitida': 'bg-blue-100 text-blue-800',
  'pagada': 'bg-green-100 text-green-800',
  'anulada': 'bg-red-100 text-red-800',
}

export default function FacturasPage() {
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<string>('')
  const [busqueda, setBusqueda] = useState<string>('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [tallerId, setTallerId] = useState<string | null>(null)

  // Obtener taller_id del usuario autenticado
  useEffect(() => {
    const obtenerTallerId = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session?.user?.email) {
          toast.error('No hay sesión activa')
          setLoading(false)
          return
        }

        const { data: usuario, error } = await supabase
          .from('usuarios')
          .select('taller_id')
          .eq('email', session.user.email)
          .single()

        if (error || !usuario) {
          toast.error('No se pudo obtener datos del usuario')
          setLoading(false)
          return
        }

        setTallerId(usuario.taller_id)
      } catch (error) {
        console.error('Error obteniendo taller_id:', error)
        toast.error('Error de autenticación')
        setLoading(false)
      }
    }
    obtenerTallerId()
  }, [])

  // Cargar facturas cuando tengamos el taller_id
  useEffect(() => {
    if (tallerId) {
      fetchFacturas()
    }
  }, [tallerId, filtroEstado])

  const fetchFacturas = async () => {
    if (!tallerId) return

    try {
      setLoading(true)

      let url = `/api/facturas/obtener?taller_id=${tallerId}`
      if (filtroEstado) {
        url += `&estado=${filtroEstado}`
      }

      const response = await fetch(url)
      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
      } else {
        setFacturas(data || [])
      }
    } catch (error) {
      console.error(error)
      toast.error('Error al cargar facturas')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta factura?')) return

    setDeletingId(id)
    try {
      const response = await fetch(`/api/facturas/eliminar?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Factura eliminada')
        fetchFacturas()
      } else {
        toast.error('Error al eliminar')
      }
    } catch (error) {
      toast.error('Error')
    } finally {
      setDeletingId(null)
    }
  }

  const facturasFiltradas = facturas.filter(f =>
    f.numero_factura.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Facturas</h1>
            <p className="text-gray-600 mt-1">Gestiona todas tus facturas</p>
          </div>
          <Link href="/dashboard/facturas/nueva">
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="w-5 h-5" />
              Nueva Factura
            </Button>
          </Link>
        </div>

        {/* FILTROS */}
        <Card className="p-6 mb-6">
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
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : facturasFiltradas.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No hay facturas</p>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Número</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Fecha</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Total</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {facturasFiltradas.map((factura) => (
                  <tr key={factura.id} className="border-b hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-semibold text-gray-900">{factura.numero_factura}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(factura.fecha_emision).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      €{factura.total?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={estadoColors[factura.estado] || 'bg-gray-100'}>
                        {factura.estado}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <Link href={`/dashboard/facturas/ver?id=${factura.id}`}>
                          <Button variant="ghost" size="sm" className="gap-2 text-blue-600">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        {factura.pdf_url && (
                          <a href={factura.pdf_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" className="gap-2 text-green-600">
                              <Download className="w-4 h-4" />
                            </Button>
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(factura.id)}
                          disabled={deletingId === factura.id}
                          className="gap-2 text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
