'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export default function NuevoClientePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [tallerId, setTallerId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    nif: '',
    email: '',
    telefono: '',
    direccion: '',
    notas: '',
  })

  // Obtener taller_id del usuario autenticado
  useEffect(() => {
    const obtenerTallerId = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user?.email) {
          toast.error('No hay sesión activa')
          return
        }

        const { data: usuario, error } = await supabase
          .from('usuarios')
          .select('taller_id')
          .eq('email', user.email)
          .single()

        if (error || !usuario) {
          toast.error('No se pudo obtener datos del usuario')
          return
        }

        setTallerId(usuario.taller_id)
      } catch (error) {
        console.error('Error obteniendo taller_id:', error)
        toast.error('Error de autenticación')
      }
    }
    obtenerTallerId()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!tallerId) {
      toast.error('No se encontró taller_id')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/clientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taller_id: tallerId,
          nombre: formData.nombre,
          apellidos: formData.apellidos || null,
          nif: formData.nif || null,
          email: formData.email || null,
          telefono: formData.telefono || null,
          direccion: formData.direccion || null,
          notas: formData.notas || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error(error.error || 'Error al crear cliente')
        setLoading(false)
        return
      }

      toast.success('¡Cliente creado correctamente!')
      router.push('/dashboard/clientes')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al crear cliente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/clientes">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nuevo Cliente</h1>
          <p className="text-gray-500 mt-1">Crea un nuevo cliente en tu taller</p>
        </div>
      </div>

      {/* Formulario */}
      <Card className="p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nombre */}
          <div>
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              name="nombre"
              placeholder="Juan"
              value={formData.nombre}
              onChange={handleChange}
              required
            />
          </div>

          {/* Apellidos */}
          <div>
            <Label htmlFor="apellidos">Apellidos</Label>
            <Input
              id="apellidos"
              name="apellidos"
              placeholder="García López"
              value={formData.apellidos}
              onChange={handleChange}
            />
          </div>

          {/* NIF */}
          <div>
            <Label htmlFor="nif">NIF/DNI</Label>
            <Input
              id="nif"
              name="nif"
              placeholder="12345678A"
              value={formData.nif}
              onChange={handleChange}
            />
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="juan@example.com"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          {/* Teléfono */}
          <div>
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              name="telefono"
              placeholder="600 123 456"
              value={formData.telefono}
              onChange={handleChange}
            />
          </div>

          {/* Dirección */}
          <div>
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              name="direccion"
              placeholder="Calle Principal 123"
              value={formData.direccion}
              onChange={handleChange}
            />
          </div>

          {/* Notas */}
          <div>
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              name="notas"
              placeholder="Notas adicionales sobre el cliente..."
              value={formData.notas}
              onChange={handleChange}
              rows={4}
            />
          </div>

          {/* Botones */}
          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Creando...' : 'Crear Cliente'}
            </Button>
            <Link href="/dashboard/clientes">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  )
}