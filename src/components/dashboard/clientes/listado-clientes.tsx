'use client'

import { useState, useEffect } from 'react'
import { Search, Edit, Phone, Mail, MapPin, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { Cliente } from '@/types/cliente'
import { EditarClienteSheet } from './editar-cliente-sheet'
import { FormClienteSheet } from './form-cliente-sheet'

interface ListadoClientesProps {
  clientes: Cliente[]
  onActualizar: () => void
}

export function ListadoClientes({ clientes, onActualizar }: ListadoClientesProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [clienteEditando, setClienteEditando] = useState<string | null>(null)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [cargando, setCargando] = useState(false)

  const clientesFiltrados = clientes
    .filter(c => c.estado === 'activo')
    .filter(c =>
      !searchTerm ||
      c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.nif?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.telefono?.includes(searchTerm)
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Eliminar cliente? (Se archivará, no se borrará)')) return

    try {
      setCargando(true)
      const res = await fetch(`/api/clientes/actualizar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estado: 'archivado' })
      })

      if (!res.ok) throw new Error('Error al eliminar')
      toast.success('Cliente archivado')
      onActualizar()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre, NIF o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          onClick={() => setMostrarFormulario(true)}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Nuevo cliente
        </Button>
      </div>

      {clientesFiltrados.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          {clientes.length === 0 ? 'No hay clientes' : 'No se encontraron resultados'}
        </Card>
      ) : (
        <div className="space-y-2">
          {clientesFiltrados.map(cliente => (
            <Card
              key={cliente.id}
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setClienteEditando(cliente.id)}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg truncate">{cliente.nombre}</h3>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-600">
                    {cliente.nif && <div>📌 {cliente.nif}</div>}
                    {cliente.telefono && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          window.location.href = `tel:${cliente.telefono}`
                        }}
                        className="flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        <Phone className="w-4 h-4" /> {cliente.telefono}
                      </button>
                    )}
                    {cliente.email && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          window.location.href = `mailto:${cliente.email}`
                        }}
                        className="flex items-center gap-1 text-blue-600 hover:underline col-span-2"
                      >
                        <Mail className="w-4 h-4" /> {cliente.email}
                      </button>
                    )}
                    {cliente.direccion && (
                      <div className="flex items-center gap-1 col-span-2">
                        <MapPin className="w-4 h-4" /> {cliente.direccion}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      setClienteEditando(cliente.id)
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEliminar(cliente.id)
                    }}
                    disabled={cargando}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {mostrarFormulario && (
        <FormClienteSheet
          onClose={() => setMostrarFormulario(false)}
          onActualizar={() => {
            setMostrarFormulario(false)
            onActualizar()
          }}
        />
      )}

      {clienteEditando && (
        <EditarClienteSheet
          clienteId={clienteEditando}
          onClose={() => setClienteEditando(null)}
          onActualizar={() => {
            setClienteEditando(null)
            onActualizar()
          }}
        />
      )}
    </div>
  )
}
