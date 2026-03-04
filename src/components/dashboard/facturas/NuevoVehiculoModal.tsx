'use client'

/**
 * Modal de Alta Rápida de Vehículo
 * Invocable desde Factura Rápida sin perder el progreso de la factura.
 * Reutiliza la misma lógica que /dashboard/vehiculos/nuevo/page.tsx
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Car, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'

interface NuevoVehiculoModalProps {
  open: boolean
  onClose: () => void
  /** Llamado con los datos del vehículo creado para sincronizar la pantalla padre */
  onCreado?: (vehiculo: { id: string; matricula: string; marca?: string; modelo?: string }) => void
  /** Matrícula prerellenada desde el campo de búsqueda */
  matriculaInicial?: string
}

const MARCAS_COMUNES = ['Audi', 'BMW', 'Citroën', 'Fiat', 'Ford', 'Honda', 'Hyundai', 'Kia',
  'Mazda', 'Mercedes', 'Nissan', 'Opel', 'Peugeot', 'Renault', 'Seat', 'Skoda', 'Toyota',
  'Volkswagen', 'Volvo']

/** Detecta si un texto parece una matrícula española (guardarraíl) */
function esMatricula(value: string): boolean {
  return /^[0-9]{4}[BCDFGHJKLMNPRSTUVWXYZ]{3}$/i.test(value.trim())
}

export function NuevoVehiculoModal({ open, onClose, onCreado, matriculaInicial = '' }: NuevoVehiculoModalProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    matricula: matriculaInicial.toUpperCase(),
    marca: '',
    modelo: '',
    año: '',
    color: '',
    tipo_combustible: '',
  })

  // Sync matriculaInicial when modal opens with a new value
  const handleOpen = () => {
    if (matriculaInicial) {
      setForm(prev => ({ ...prev, matricula: matriculaInicial.toUpperCase() }))
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm(prev => ({
      ...prev,
      [name]: name === 'matricula' ? value.toUpperCase().replace(/[\s]/g, '') : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.matricula.trim()) {
      toast.error('La matrícula es obligatoria')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/vehiculos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matricula: form.matricula.trim(),
          marca: form.marca || null,
          modelo: form.modelo || null,
          año: form.año ? parseInt(form.año) : null,
          color: form.color || null,
          tipo_combustible: form.tipo_combustible || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Error al crear el vehículo')
        return
      }

      toast.success(`Vehículo ${data.matricula} creado correctamente`)
      onCreado?.({ id: data.id, matricula: data.matricula, marca: data.marca, modelo: data.modelo })
      onClose()
      // Reset form
      setForm({ matricula: '', marca: '', modelo: '', año: '', color: '', tipo_combustible: '' })
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); else handleOpen() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
              <Car className="w-4 h-4 text-sky-600" />
            </div>
            Nuevo Vehículo
          </DialogTitle>
          <DialogDescription>
            Alta rápida. Solo la matrícula es obligatoria.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Matrícula */}
          <div>
            <Label htmlFor="v-matricula">Matrícula *</Label>
            <Input
              id="v-matricula"
              name="matricula"
              value={form.matricula}
              onChange={handleChange}
              placeholder="1234ABC"
              className="font-mono text-lg tracking-widest uppercase"
              required
              autoFocus
            />
          </div>

          {/* Marca + Modelo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="v-marca">Marca</Label>
              <Input
                id="v-marca"
                name="marca"
                list="marcas-list"
                value={form.marca}
                onChange={handleChange}
                placeholder="Seat"
              />
              <datalist id="marcas-list">
                {MARCAS_COMUNES.map(m => <option key={m} value={m} />)}
              </datalist>
            </div>
            <div>
              <Label htmlFor="v-modelo">Modelo</Label>
              <Input
                id="v-modelo"
                name="modelo"
                value={form.modelo}
                onChange={handleChange}
                placeholder="Ibiza"
              />
            </div>
          </div>

          {/* Año + Combustible */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="v-año">Año</Label>
              <Input
                id="v-año"
                name="año"
                type="number"
                min={1990}
                max={new Date().getFullYear() + 1}
                value={form.año}
                onChange={handleChange}
                placeholder="2020"
              />
            </div>
            <div>
              <Label htmlFor="v-combustible">Combustible</Label>
              <select
                id="v-combustible"
                name="tipo_combustible"
                value={form.tipo_combustible}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">—</option>
                <option value="gasolina">Gasolina</option>
                <option value="diésel">Diésel</option>
                <option value="híbrido">Híbrido</option>
                <option value="eléctrico">Eléctrico</option>
                <option value="GLP">GLP</option>
              </select>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {loading ? 'Creando...' : 'Crear Vehículo'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Utilidad exportada: detecta si un NIF parece una matrícula española */
export function nifParecematricula(nif: string): boolean {
  return esMatricula(nif)
}
