'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Plus, Phone, Mail, Trash2, Edit } from 'lucide-react'
import { toast } from 'sonner'

interface Cliente {
  id: string
  nombre: string
  apellidos: string
  email: string
  telefono: string
  nif: string
  created_at: string
}

const TALLER_ID = 'f919c111-341d-4c43-a37a-66656ec3cb4d'

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchClientes()
  }, [])

  async function fetchClientes() {
    try {
      const res = await fetch('/api/clientes')
      const data = await res.json()
      setClientes(data || [])
    } catch (err) {
      console.error('Error fetching clientes:', err)
      toast.error('Error al cargar clientes')
    } finally {
      setLoading(false)
    }
  }

  async function deleteCliente(id: string) {
    if (!confirm('¿Eliminar este cliente?')) return
    
    try {
      // Aquí irá la llamada DELETE cuando creemos el endpoint
      toast.success('Cliente eliminado')
      setClientes(clientes.filter(c => c.id !== id))
    } catch (err) {
      toast.error('Error al eliminar')
    }
  }

  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Clientes</h1>
        <Link href="/dashboard/clientes/nuevo">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Cliente
          </Button>
        </Link>
      </div>

      <Input
        placeholder="Buscar por nombre o email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <Card className="p-8 text-center">
          <p className="text-gray-600">Cargando clientes...</p>
        </Card>
      ) : clientesFiltrados.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-600 mb-4">No hay clientes aún</p>
          <Link href="/dashboard/clientes/nuevo">
            <Button>Crear primer cliente</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientesFiltrados.map((cliente) => (
            <Card key={cliente.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {cliente.nombre} {cliente.apellidos}
                  </h3>
                  {cliente.nif && (
                    <p className="text-sm text-gray-600">{cliente.nif}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link href={`/dashboard/clientes/${cliente.id}/editar`}>
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCliente(cliente.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                {cliente.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {cliente.email}
                  </div>
                )}
                {cliente.telefono && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {cliente.telefono}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
