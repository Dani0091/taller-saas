'use client'

import { useState } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { ClienteFormData } from '@/types/cliente'

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
  const [guardando, setGuardando] = useState(false)
  const [formData, setFormData] = useState<ClienteFormData>({
    nombre: '',
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

  const handleGuardar = async () => {
    if (!formData.nombre || !formData.nif) {
      toast.error('Nombre y NIF son requeridos')
      return
    }

    try {
      setGuardando(true)
      const res = await fetch('/api/clientes/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      toast.success('✅ Cliente creado')
      onActualizar()
    } catch (error: any) {
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
                  placeholder="Nombre completo"
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">NIF/CIF *</Label>
                <Input
                  placeholder="Ej: 12345678A"
                  value={formData.nif}
                  onChange={(e) => setFormData(prev => ({ ...prev, nif: e.target.value.toUpperCase() }))}
                />
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
                    placeholder="Madrid"
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
            disabled={guardando}
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
