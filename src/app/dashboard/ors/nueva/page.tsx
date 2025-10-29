'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

const TALLER_ID = 'f919c111-341d-4c43-a37a-66656ec3cb4d'

export default function NuevaOrdenPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    kilometros_entrada: '',
    descripcion_problema: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/ors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taller_id: TALLER_ID,
          numero_orden: `OR-${Date.now()}`,
          estado: 'recibido',
          kilometros_entrada: formData.kilometros_entrada ? parseInt(formData.kilometros_entrada) : null,
          descripcion_problema: formData.descripcion_problema,
        }),
      })

      const responseData = await res.json()

      if (res.ok) {
        toast.success('¡Orden creada exitosamente!')
        router.push('/dashboard/ors')
      } else {
        toast.error(`Error: ${responseData.error}`)
      }
    } catch (err) {
      console.error('Error:', err)
      toast.error('Error al crear la orden')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="p-8">
        <h1 className="text-2xl font-bold mb-6">Nueva Orden de Reparación</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="kilometros_entrada">Kilómetros de entrada</Label>
            <Input
              id="kilometros_entrada"
              name="kilometros_entrada"
              type="number"
              placeholder="Ej: 125000"
              value={formData.kilometros_entrada}
              onChange={handleChange}
            />
          </div>

          <div>
            <Label htmlFor="descripcion_problema">Descripción del problema</Label>
            <Textarea
              id="descripcion_problema"
              name="descripcion_problema"
              rows={4}
              placeholder="Describe el problema del vehículo..."
              value={formData.descripcion_problema}
              onChange={handleChange}
              required
            />
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => router.back()}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Orden'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
