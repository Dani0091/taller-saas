'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { NumberInput } from '@/components/ui/number-input'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function NuevaFacturaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    numero_factura: '',
    cliente_id: '',
    base_imponible: 0,
    iva: 0,
    total: 0,
    metodo_pago: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'base_imponible' || name === 'iva' || name === 'total') 
        ? (value === '' ? 0 : Number(value)) 
        : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const tallerId = localStorage.getItem('taller_id')
      
      if (!tallerId) {
        toast.error('No se encontró taller_id')
        setLoading(false)
        return
      }

      const response = await fetch('/api/facturas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taller_id: tallerId,
          numero_factura: formData.numero_factura,
          cliente_id: formData.cliente_id || null,
          base_imponible: formData.base_imponible || 0,
          iva: formData.iva || 0,
          total: formData.total || 0,
          metodo_pago: formData.metodo_pago || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error(error.error || 'Error al crear factura')
        setLoading(false)
        return
      }

      toast.success('¡Factura creada correctamente!')
      router.push('/dashboard/facturas')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al crear factura')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/facturas">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nueva Factura</h1>
          <p className="text-gray-500 mt-1">Crea una nueva factura</p>
        </div>
      </div>

      <Card className="p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="numero_factura">Número de Factura *</Label>
            <Input
              id="numero_factura"
              name="numero_factura"
              placeholder="FAC-2025-00001"
              value={formData.numero_factura}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <Label htmlFor="cliente_id">ID Cliente</Label>
            <Input
              id="cliente_id"
              name="cliente_id"
              placeholder="UUID del cliente"
              value={formData.cliente_id}
              onChange={handleChange}
            />
          </div>

          <div>
            <Label htmlFor="base_imponible">Base Imponible *</Label>
            <NumberInput
              id="base_imponible"
              value={formData.base_imponible}
              onChange={(value) => setFormData(prev => ({ ...prev, base_imponible: value ?? 0 }))}
              placeholder="0.00"
              step={0.01}
              min={0}
              allowEmpty={true}
            />
          </div>

          <div>
            <Label htmlFor="iva">IVA (21%) *</Label>
            <NumberInput
              id="iva"
              value={formData.iva}
              onChange={(value) => setFormData(prev => ({ ...prev, iva: value ?? 0 }))}
              placeholder="0.00"
              step={0.01}
              min={0}
              allowEmpty={true}
            />
          </div>

          <div>
            <Label htmlFor="total">Total *</Label>
            <NumberInput
              id="total"
              value={formData.total}
              onChange={(value) => setFormData(prev => ({ ...prev, total: value ?? 0 }))}
              placeholder="0.00"
              step={0.01}
              min={0}
              allowEmpty={true}
            />
          </div>

          <div>
            <Label htmlFor="metodo_pago">Método de Pago</Label>
            <select
              id="metodo_pago"
              name="metodo_pago"
              value={formData.metodo_pago}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Selecciona...</option>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Creando...' : 'Crear Factura'}
            </Button>
            <Link href="/dashboard/facturas">
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