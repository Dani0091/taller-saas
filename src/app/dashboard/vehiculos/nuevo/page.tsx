'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export default function NuevoVehiculoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [tallerId, setTallerId] = useState<string | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [formData, setFormData] = useState({
    cliente_id: '',
    matricula: '',
    marca: '',
    modelo: '',
    versión: '',
    año: '',
    color: '',
    kilometros: '',
    tipo_combustible: '',
    carroceria: '',
    potencia_cv: '',
    cilindrada: '',
  })

  // Obtener taller_id del usuario autenticado
  useEffect(() => {
    const obtenerTallerId = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session?.user?.email) {
          toast.error('No hay sesión activa')
          setLoadingAuth(false)
          return
        }

        const { data: usuario, error } = await supabase
          .from('usuarios')
          .select('taller_id')
          .eq('email', session.user.email)
          .single()

        if (error || !usuario) {
          toast.error('No se pudo obtener datos del usuario')
          setLoadingAuth(false)
          return
        }

        setTallerId(usuario.taller_id)
      } catch (error) {
        console.error('Error obteniendo taller_id:', error)
        toast.error('Error de autenticación')
      } finally {
        setLoadingAuth(false)
      }
    }
    obtenerTallerId()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!tallerId) {
      toast.error('No se encontró taller_id')
      return
    }

    setLoading(true)

    try {
      if (!formData.matricula) {
        toast.error('La matrícula es obligatoria')
        setLoading(false)
        return
      }

      const response = await fetch('/api/vehiculos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taller_id: tallerId,
          cliente_id: formData.cliente_id || null,
          matricula: formData.matricula,
          marca: formData.marca || null,
          modelo: formData.modelo || null,
          año: formData.año ? parseInt(formData.año) : null,
          color: formData.color || null,
          kilometros: formData.kilometros ? parseInt(formData.kilometros) : null,
          tipo_combustible: formData.tipo_combustible || null,
          carroceria: formData.carroceria || null,
          potencia_cv: formData.potencia_cv ? parseFloat(formData.potencia_cv) : null,
          cilindrada: formData.cilindrada ? parseInt(formData.cilindrada) : null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error(error.error || 'Error al crear vehículo')
        setLoading(false)
        return
      }

      toast.success('Vehículo creado correctamente')
      router.back()
    } catch (error) {
      console.error(error)
      toast.error('Error al crear vehículo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </button>
        <div>
          <h1 className="text-3xl font-bold">Nuevo Vehículo</h1>
          <p className="text-gray-500 text-sm">Agrega los datos del vehículo</p>
        </div>
      </div>

      <Card className="p-6 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Fila 1: Datos básicos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Matrícula *</Label>
              <Input
                name="matricula"
                placeholder="ABC-1234"
                value={formData.matricula}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label>Marca</Label>
              <Input
                name="marca"
                placeholder="BMW"
                value={formData.marca}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label>Modelo</Label>
              <Input
                name="modelo"
                placeholder="320i"
                value={formData.modelo}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Fila 2: Versión, Año, Color */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Versión</Label>
              <Input
                name="versión"
                placeholder="Sport, Luxury, etc"
                value={formData.versión}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label>Año</Label>
              <Input
                name="año"
                type="number"
                placeholder="2022"
                min="1900"
                max={new Date().getFullYear() + 1}
                value={formData.año}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label>Color</Label>
              <Input
                name="color"
                placeholder="Gris, Blanco, Negro"
                value={formData.color}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Fila 3: Kilometros, Combustible, Carrocería */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Kilómetros</Label>
              <Input
                name="kilometros"
                type="number"
                placeholder="45000"
                min="0"
                value={formData.kilometros}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label>Combustible</Label>
              <select
                name="tipo_combustible"
                value={formData.tipo_combustible}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Selecciona...</option>
                <option value="gasolina">Gasolina</option>
                <option value="diésel">Diésel</option>
                <option value="híbrido">Híbrido</option>
                <option value="eléctrico">Eléctrico</option>
                <option value="GLP">GLP</option>
              </select>
            </div>
            <div>
              <Label>Carrocería</Label>
              <select
                name="carroceria"
                value={formData.carroceria}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Selecciona...</option>
                <option value="Berlina">Berlina</option>
                <option value="SUV">SUV</option>
                <option value="Monovolumen">Monovolumen</option>
                <option value="Deportivo">Deportivo</option>
                <option value="Coupé">Coupé</option>
                <option value="Descapotable">Descapotable</option>
                <option value="Camioneta">Camioneta</option>
                <option value="Furgoneta">Furgoneta</option>
              </select>
            </div>
          </div>

          {/* Fila 4: Potencia y Cilindrada */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Potencia (CV)</Label>
              <Input
                name="potencia_cv"
                type="number"
                placeholder="120"
                min="0"
                step="0.1"
                value={formData.potencia_cv}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label>Cilindrada (cc)</Label>
              <Input
                name="cilindrada"
                type="number"
                placeholder="1998"
                min="0"
                value={formData.cilindrada}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-2 pt-6 border-t">
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Vehículo'}
            </Button>
            <button onClick={() => router.back()}>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </button>
          </div>
        </form>
      </Card>

      <div className="text-xs text-gray-500 max-w-3xl">
        <p>* Campo obligatorio. Los demás datos son opcionales pero recomendados para un mejor seguimiento del vehículo.</p>
      </div>
    </div>
  )
}
