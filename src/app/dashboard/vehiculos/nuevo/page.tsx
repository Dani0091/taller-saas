'use client'

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { NumberInput } from '@/components/ui/number-input'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { InputScanner } from '@/components/ui/input-scanner'

// Importaciones de conversión y tipos (Senior Level Architecture)
import { 
  toDbString, 
  toDbNumber, 
  createNumericHandler, 
  createTextHandler,
  sanitizeMatricula,
  sanitizeKilometros,
  sanitizeAño 
} from '@/lib/utils/converters'
import { 
  VehiculoFormulario, 
  VehiculoDefaults, 
  VehiculoValidationRules,
  vehiculoFormularioToBD,
  TIPOS_COMBUSTIBLE_OPTIONS 
} from '@/types/vehiculo'

export default function NuevoVehiculoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [tallerId, setTallerId] = useState<string | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [formData, setFormData] = useState<VehiculoFormulario>(VehiculoDefaults)

  // Obtener taller_id del usuario autenticado
  useEffect(() => {
    const obtenerTallerId = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user?.email) {
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
    
    // Sanitización específica por campo usando utilidades senior
    let sanitizedValue = value
    
    switch (name) {
      case 'matricula':
        sanitizedValue = sanitizeMatricula(value)
        break
      case 'marca':
      case 'modelo':
      case 'color':
      case 'carroceria':
        sanitizedValue = toDbString(value, '')
        break
      case 'vin':
      case 'bastidor_vin':
        sanitizedValue = toDbString(value, '').toUpperCase()
        break
      default:
        sanitizedValue = toDbString(value, '')
    }

    setFormData((prev: VehiculoFormulario) => ({ ...prev, [name]: sanitizedValue }))
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

      // Conversión robusta usando utilidades de conversión Senior Level
      const vehiculoParaBD = vehiculoFormularioToBD(formData)
      
      const response = await fetch('/api/vehiculos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...vehiculoParaBD,
          taller_id: tallerId,
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
              <div className="flex gap-1">
                <Input
                  name="matricula"
                  placeholder="ABC-1234"
                  value={formData.matricula || ''}
                  onChange={handleChange}
                  required
                  className="flex-1"
                />
                <InputScanner
                  tipo="matricula"
                  onResult={(val) => setFormData((prev: VehiculoFormulario) => ({ ...prev, matricula: val }))}
                />
              </div>
            </div>
            <div>
              <Label>Marca</Label>
              <Input
                name="marca"
                placeholder="BMW"
                value={formData.marca || ''}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label>Modelo</Label>
              <Input
                name="modelo"
                placeholder="320i"
                value={formData.modelo || ''}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Fila 2: Versión, Año, Color */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* <div>
              <Label>Versión</Label>
              <Input
                name="versión"
                placeholder="Sport, Luxury, etc"
                value={formData.versión || ''}
                onChange={handleChange}
              />
            </div> */}
            <div>
              <Label>Año</Label>
              <NumberInput
                value={formData.año}
                onChange={(value) => {
                  const anioMax = new Date().getFullYear() + 1
                  const añoValidado = sanitizeAño(value, anioMax)

                  if (añoValidado !== undefined) {
                    setFormData((prev: VehiculoFormulario) => ({ ...prev, año: añoValidado }))
                  } else if (value !== null && value !== undefined) {
                    toast.error(VehiculoValidationRules.año.message)
                  }
                }}
                placeholder="2022"
                min={1900}
                max={new Date().getFullYear() + 1}
                allowEmpty={true}
              />
            </div>
            <div>
              <Label>Color</Label>
              <Input
                name="color"
                placeholder="Gris, Blanco, Negro"
                value={formData.color || ''}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Fila 3: Kilometros, Combustible, Carrocería */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Kilómetros</Label>
              <div className="flex gap-1">
              <NumberInput
                value={formData.kilometros}
                onChange={createNumericHandler(setFormData, 'kilometros', undefined)}
                placeholder="45000"
                className="flex-1"
                min={0}
                allowEmpty={true}
              />
                <InputScanner
                  tipo="km"
                  onResult={(val) => {
                    const kmSanitizados = sanitizeKilometros(val)
                    setFormData((prev: VehiculoFormulario) => ({ ...prev, kilometros: kmSanitizados > 0 ? kmSanitizados : prev.kilometros }))
                  }}
                />
              </div>
            </div>
            <div>
              <Label>Combustible</Label>
              <select
                name="tipo_combustible"
                value={formData.tipo_combustible || ''}
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
                value={formData.carroceria || ''}
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
              <NumberInput
                value={formData.potencia_cv}
                onChange={createNumericHandler(setFormData, 'potencia_cv', undefined)}
                placeholder="120"
                min={0}
                step={0.1}
                allowEmpty={true}
              />
            </div>
            <div>
              <Label>Cilindrada (cc)</Label>
              <NumberInput
                value={formData.cilindrada}
                onChange={createNumericHandler(setFormData, 'cilindrada', undefined)}
                placeholder="1998"
                min={0}
                allowEmpty={true}
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
