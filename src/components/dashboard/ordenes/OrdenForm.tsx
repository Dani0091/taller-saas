/**
 * @fileoverview Component "Dumb" - Formulario Principal de Orden
 * @description Maneja solo el layout del formulario principal
 */

'use client'

import { NumberInput } from '@/components/ui/number-input'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import type { OrdenFormulario } from '@/types/workshop'

interface OrdenFormProps {
  formData: OrdenFormulario
  onChange: (data: Partial<OrdenFormulario>) => void
  disabled?: boolean
}

export function OrdenForm({ formData, onChange, disabled = false }: OrdenFormProps) {
  const handleChange = (field: keyof OrdenFormulario, value: any) => {
    onChange({ [field]: value })
  }

  return (
    <div className="space-y-6">
      {/* Información básica */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-4">Información de la Orden</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Kilómetros de entrada</Label>
            <NumberInput
              value={formData.kilometros_entrada}
              onChange={(value) => handleChange('kilometros_entrada', value)}
              placeholder="Ej: 145000"
              className="font-mono"
              min={0}
              disabled={disabled}
              allowEmpty={true}
            />
          </div>

          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Nivel combustible</Label>
            <select
              value={formData.nivel_combustible || ''}
              onChange={(e) => handleChange('nivel_combustible', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">Seleccionar...</option>
              <option value="Reserva">Reserva</option>
              <option value="1/4">1/4</option>
              <option value="1/2">1/2</option>
              <option value="3/4">3/4</option>
              <option value="Lleno">Lleno</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <Label className="text-xs text-gray-500 mb-1 block">Descripción del problema</Label>
          <Textarea
            value={formData.descripcion_problema || ''}
            onChange={(e) => handleChange('descripcion_problema', e.target.value)}
            placeholder="Describe el problema reportado por el cliente..."
            rows={3}
            disabled={disabled}
          />
        </div>

        <div className="mt-4">
          <Label className="text-xs text-gray-500 mb-1 block">Diagnóstico</Label>
          <Textarea
            value={formData.diagnostico || ''}
            onChange={(e) => handleChange('diagnostico', e.target.value)}
            placeholder="Diagnóstico realizado por el taller..."
            rows={3}
            disabled={disabled}
          />
        </div>
      </Card>

      {/* Tiempos y costes */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-4">Tiempos y Costes</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Tiempo estimado (horas)</Label>
            <NumberInput
              value={formData.tiempo_estimado_horas}
              onChange={(value) => handleChange('tiempo_estimado_horas', value)}
              placeholder="0.0"
              min={0}
              max={100}
              step={0.25}
              disabled={disabled}
            />
          </div>

          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Tiempo real (horas)</Label>
            <NumberInput
              value={formData.tiempo_real_horas}
              onChange={(value) => handleChange('tiempo_real_horas', value)}
              placeholder="0.0"
              min={0}
              max={100}
              step={0.25}
              disabled={disabled}
            />
          </div>

          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Coste diario estancia (€)</Label>
            <NumberInput
              value={formData.coste_diario_estancia}
              onChange={(value) => handleChange('coste_diario_estancia', value)}
              placeholder="0.00"
              min={0}
              step={0.01}
              disabled={disabled}
              allowEmpty={true}
            />
          </div>
        </div>
      </Card>

      {/* Trabajo realizado */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-4">Trabajo Realizado</h3>
        
        <Textarea
          value={formData.trabajos_realizados || ''}
          onChange={(e) => handleChange('trabajos_realizados', e.target.value)}
          placeholder="Describe detalladamente el trabajo realizado..."
          rows={4}
          disabled={disabled}
        />
      </Card>

      {/* Notas adicionales */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-4">Notas Adicionales</h3>
        
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Notas internas</Label>
            <Textarea
              value={formData.notas || ''}
              onChange={(e) => handleChange('notas', e.target.value)}
              placeholder="Notas internas del taller..."
              rows={3}
              disabled={disabled}
            />
          </div>

          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Daños en carrocería</Label>
            <Input
              value={formData.danos_carroceria || ''}
              onChange={(e) => handleChange('danos_carroceria', e.target.value)}
              placeholder="Describir cualquier daño existente..."
              disabled={disabled}
            />
          </div>
        </div>
      </Card>

      {/* Autorizaciones */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-4">Autorizaciones del Cliente</h3>
        
        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.presupuesto_aprobado_por_cliente || false}
              onChange={(e) => handleChange('presupuesto_aprobado_por_cliente', e.target.checked)}
              disabled={disabled}
            />
            <span className="text-sm">Presupuesto aprobado por cliente</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.renuncia_presupuesto || false}
              onChange={(e) => handleChange('renuncia_presupuesto', e.target.checked)}
              disabled={disabled}
            />
            <span className="text-sm">Renuncia al presupuesto</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.recoger_piezas || false}
              onChange={(e) => handleChange('recoger_piezas', e.target.checked)}
              disabled={disabled}
            />
            <span className="text-sm">Autoriza recoger piezas del vehículo</span>
          </label>

          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Acción en imprevistos</Label>
            <select
              value={formData.accion_imprevisto || 'avisar'}
              onChange={(e) => handleChange('accion_imprevisto', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="avisar">Avisar antes de actuar</option>
              <option value="hacer_y_facturar">Realizar y facturar</option>
              <option value="no_hacer_nada">No hacer nada</option>
            </select>
          </div>
        </div>
      </Card>
    </div>
  )
}