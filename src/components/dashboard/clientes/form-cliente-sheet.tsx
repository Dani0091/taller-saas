'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { ClienteFormData } from '@/types/cliente'
import { validarDocumentoIdentidad, validarEmail } from '@/lib/validaciones'

interface FormClienteSheetProps {
  onClose: () => void
  onActualizar: () => void
}

const PROVINCIAS_ES = [
  'Álava', 'Albacete', 'Alicante', 'Almería', 'Ávila', 'Badajoz', 'Barcelona', 'Burgos',
  'Cáceres', 'Cádiz', 'Cantabria', 'Castellón', 'Ciudad Real', 'Córdoba', 'Cuenca',
  'Girona', 'Granada', 'Guadalajara', 'Guipúzcoa', 'Huelva', 'Huesca', 'Jaén', 'La Coruña',
  'La Rioja', 'Las Palmas', 'León', 'Lleida', 'Lugo', 'Madrid', 'Málaga', 'Murcia',
  'Navarra', 'Ourense', 'Palencia', 'Palma de Mallorca', 'Palmas de Gran Canaria',
  'Pontevedra', 'Salamanca', 'Segovia', 'Sevilla', 'Soria', 'Tarragona', 'Teruel',
  'Toledo', 'Valencia', 'Valladolid', 'Vizcaya', 'Zamora', 'Zaragoza'
]

const FORMAS_PAGO = [
  { value: 'transferencia', label: '🏦 Transferencia bancaria' },
  { value: 'efectivo', label: '💵 Efectivo' },
  { value: 'tarjeta', label: '💳 Tarjeta' },
  { value: 'cheque', label: '📄 Cheque' }
]

export function FormClienteSheet({ onClose, onActualizar }: FormClienteSheetProps) {
  const supabase = createClient()
  const [guardando, setGuardando] = useState(false)
  const [tallerId, setTallerId] = useState<string>('')
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState<ClienteFormData>({
    nombre: '',
    primer_apellido: '',
    segundo_apellido: '',
    nif: '',
    email: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    provincia: '',
    codigo_postal: '',
    pais: 'ES',
    notas: '',
    tipo_cliente: 'personal',
    forma_pago: 'transferencia'
  })

  // Validar NIF en tiempo real
  const validarCampoNIF = (valor: string) => {
    if (!valor) {
      setErrores(prev => ({ ...prev, nif: '' }))
      return
    }
    const resultado = validarDocumentoIdentidad(valor)
    if (!resultado.valido) {
      setErrores(prev => ({ ...prev, nif: 'Formato de NIF/NIE/CIF inválido' }))
    } else {
      setErrores(prev => ({ ...prev, nif: '' }))
    }
  }

  // Validar Email en tiempo real
  const validarCampoEmail = (valor: string) => {
    if (!valor) {
      setErrores(prev => ({ ...prev, email: '' }))
      return
    }
    if (!validarEmail(valor)) {
      setErrores(prev => ({ ...prev, email: 'Formato de email inválido' }))
    } else {
      setErrores(prev => ({ ...prev, email: '' }))
    }
  }

  useEffect(() => {
    obtenerTallerId()
  }, [])

  const obtenerTallerId = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        toast.error('No autenticado')
        return
      }

      const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('taller_id')
        .eq('email', session.user.email)
        .single()

      if (error || !usuario) {
        toast.error('No se pudo obtener taller')
        return
      }

      setTallerId(usuario.taller_id)
    } catch (error) {
      toast.error('Error obtener taller')
    }
  }

  const handleGuardar = async () => {
    // Validaciones básicas
    if (!formData.nombre) {
      toast.error('El nombre es requerido')
      return
    }

    if (!formData.nif) {
      toast.error('El NIF/CIF es requerido')
      return
    }

    // Validar formato de NIF/CIF
    const validacionNIF = validarDocumentoIdentidad(formData.nif)
    if (!validacionNIF.valido) {
      toast.error('El formato del NIF/NIE/CIF no es válido')
      setErrores(prev => ({ ...prev, nif: 'Formato inválido' }))
      return
    }

    // Validar email si se proporciona
    if (formData.email && !validarEmail(formData.email)) {
      toast.error('El formato del email no es válido')
      setErrores(prev => ({ ...prev, email: 'Formato inválido' }))
      return
    }

    if (!tallerId) {
      toast.error('Taller no cargado')
      return
    }

    try {
      setGuardando(true)
      const res = await fetch('/api/clientes/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          taller_id: tallerId
        })
      })

      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      toast.success('✅ Cliente creado')
      onActualizar()
      onClose()
    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end">
      <div className="w-full bg-white rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-4 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">➕ Nuevo Cliente</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* DATOS BÁSICOS */}
          <Card className="p-4 border-l-4 border-l-blue-600">
            <h3 className="font-bold mb-3">👤 Datos Básicos</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold">Nombre *</Label>
                <Input
                  placeholder="Nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-semibold">Primer Apellido</Label>
                  <Input
                    placeholder="Primer apellido"
                    value={formData.primer_apellido || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, primer_apellido: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Segundo Apellido</Label>
                  <Input
                    placeholder="Segundo apellido"
                    value={formData.segundo_apellido || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, segundo_apellido: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold">NIF/CIF *</Label>
                <div className="relative">
                  <Input
                    placeholder="Ej: 12345678A"
                    value={formData.nif}
                    onChange={(e) => {
                      const valor = e.target.value.toUpperCase()
                      setFormData(prev => ({ ...prev, nif: valor }))
                      validarCampoNIF(valor)
                    }}
                    className={errores.nif ? 'border-red-500 pr-10' : formData.nif && !errores.nif ? 'border-green-500 pr-10' : ''}
                  />
                  {formData.nif && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {errores.nif ? (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  )}
                </div>
                {errores.nif && (
                  <p className="text-xs text-red-500 mt-1">{errores.nif}</p>
                )}
              </div>
              <div>
                <Label className="text-xs font-semibold">Tipo de cliente</Label>
                <select
                  value={formData.tipo_cliente}
                  onChange={(e) => setFormData(prev => ({ ...prev, tipo_cliente: e.target.value as any }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="personal">Particular</option>
                  <option value="empresa">Empresa</option>
                </select>
              </div>
            </div>
          </Card>

          {/* CONTACTO */}
          <Card className="p-4 border-l-4 border-l-green-600">
            <h3 className="font-bold mb-3">📞 Contacto</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold">Teléfono</Label>
                <Input
                  placeholder="+34 666 123 456"
                  value={formData.telefono}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Email</Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
            </div>
          </Card>

          {/* DIRECCIÓN - VERIFACTU */}
          <Card className="p-4 border-l-4 border-l-orange-600">
            <h3 className="font-bold mb-3">📍 Dirección Fiscal</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold">Dirección</Label>
                <Input
                  placeholder="Calle, número, piso"
                  value={formData.direccion}
                  onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-semibold">Código Postal</Label>
                  <Input
                    placeholder="28001"
                    value={formData.codigo_postal}
                    onChange={(e) => setFormData(prev => ({ ...prev, codigo_postal: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Ciudad</Label>
                  <Input
                    placeholder="Valencia"
                    value={formData.ciudad}
                    onChange={(e) => setFormData(prev => ({ ...prev, ciudad: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold">Provincia</Label>
                <select
                  value={formData.provincia || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, provincia: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecciona provincia...</option>
                  {PROVINCIAS_ES.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* PAGO Y IBAN */}
          <Card className="p-4 border-l-4 border-l-purple-600">
            <h3 className="font-bold mb-3">💳 Pago e IBAN</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold">Forma de pago</Label>
                <select
                  value={formData.forma_pago || 'transferencia'}
                  onChange={(e) => setFormData(prev => ({ ...prev, forma_pago: e.target.value as any }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {FORMAS_PAGO.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold">IBAN</Label>
                <Input
                  placeholder="ES91 1234 5678 9012 3456 7890"
                  value={formData.iban}
                  onChange={(e) => setFormData(prev => ({ ...prev, iban: e.target.value.toUpperCase() }))}
                />
              </div>
            </div>
          </Card>

          {/* NOTAS */}
          <Card className="p-4 border-l-4 border-l-red-600">
            <h3 className="font-bold mb-3">📝 Notas</h3>
            <Textarea
              placeholder="Notas adicionales..."
              value={formData.notas}
              onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
              rows={2}
            />
          </Card>

          {/* BOTÓN GUARDAR */}
          <Button
            onClick={handleGuardar}
            disabled={guardando || !tallerId}
            className="w-full py-6 text-lg font-bold gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {guardando ? 'Guardando...' : '✅ Crear Cliente'}
          </Button>
        </div>
      </div>
    </div>
  )
}
