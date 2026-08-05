/**
 * @fileoverview Paso 2 del wizard de creación de orden — selección/creación de vehículo
 * @description Componente pasivo: recibe props y callbacks, sin SQL directo
 */
'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { InputScanner } from '@/components/ui/input-scanner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Car, Loader2, Edit2, Search, X } from 'lucide-react'
import type { VehiculoNuevoFormulario, VehiculoEdicionFormulario } from '@/types/formularios'

interface Vehiculo {
  id: string
  matricula: string
  marca: string
  modelo: string
  año?: number
  kilometros?: number
}

interface OrdenVehiculoStepProps {
  vehiculoId: string
  clienteId: string
  vehiculos: Vehiculo[]
  vehiculoSeleccionado?: Vehiculo | null
  mostrarFormVehiculo: boolean
  editandoVehiculo: boolean
  creandoVehiculo: boolean
  guardandoVehiculo: boolean
  nuevoVehiculo: VehiculoNuevoFormulario
  vehiculoEditado: VehiculoEdicionFormulario
  matriculaInput: string
  buscandoMatricula: boolean
  matriculaNoEncontrada: boolean
  onVehiculoIdChange: (id: string) => void
  onToggleFormVehiculo: () => void
  onToggleEditandoVehiculo: () => void
  onNuevoVehiculoChange: (vehiculo: Partial<VehiculoNuevoFormulario>) => void
  onVehiculoEditadoChange: (vehiculo: Partial<VehiculoEdicionFormulario>) => void
  onCrearVehiculo: () => void
  onGuardarVehiculo: () => void
  onMatriculaInputChange: (value: string) => void
  onBuscarMatricula: () => void
}

export function OrdenVehiculoStep({
  vehiculoId,
  clienteId,
  vehiculos,
  vehiculoSeleccionado,
  mostrarFormVehiculo,
  editandoVehiculo,
  creandoVehiculo,
  guardandoVehiculo,
  nuevoVehiculo,
  vehiculoEditado,
  matriculaInput,
  buscandoMatricula,
  matriculaNoEncontrada,
  onVehiculoIdChange,
  onToggleFormVehiculo,
  onToggleEditandoVehiculo,
  onNuevoVehiculoChange,
  onVehiculoEditadoChange,
  onCrearVehiculo,
  onGuardarVehiculo,
  onMatriculaInputChange,
  onBuscarMatricula,
}: OrdenVehiculoStepProps) {
  const abrirFormVehiculo = () => {
    // Si el usuario ya escribió una matrícula en el buscador, no la perdemos
    // al abrir el formulario de creación manual.
    if (matriculaInput.trim() && !nuevoVehiculo.matricula) {
      onNuevoVehiculoChange({ matricula: matriculaInput.trim() })
    }
    onToggleFormVehiculo()
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Selecciona Vehículo</h1>

      {/* Vehículo seleccionado */}
      {vehiculoId && vehiculoSeleccionado && !editandoVehiculo && (
        <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="font-bold text-sky-900 font-mono tracking-wider text-lg">
              {vehiculoSeleccionado.matricula}
            </p>
            <p className="text-sm text-sky-700">
              {vehiculoSeleccionado.marca} {vehiculoSeleccionado.modelo}
              {vehiculoSeleccionado.año ? ` (${vehiculoSeleccionado.año})` : ''}
            </p>
            {vehiculoSeleccionado.kilometros ? (
              <p className="text-xs text-sky-600">{vehiculoSeleccionado.kilometros.toLocaleString()} km</p>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onToggleEditandoVehiculo}
              className="text-sky-600 hover:text-sky-800 p-2"
              title="Editar vehículo"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onVehiculoIdChange('')}
              className="text-gray-400 hover:text-red-500 p-2"
              title="Cambiar vehículo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Editar vehículo existente */}
      {vehiculoId && vehiculoSeleccionado && editandoVehiculo && (
        <div className="space-y-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
          <h4 className="font-semibold text-purple-800 text-sm flex items-center gap-2">
            <Edit2 className="w-4 h-4" /> Editar Vehículo
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Marca</Label>
              <Input value={vehiculoEditado.marca || ''} onChange={(e) => onVehiculoEditadoChange({ marca: e.target.value })} placeholder="Seat" className="bg-white" />
            </div>
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Modelo</Label>
              <Input value={vehiculoEditado.modelo || ''} onChange={(e) => onVehiculoEditadoChange({ modelo: e.target.value })} placeholder="Ibiza" className="bg-white" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Bastidor (VIN)</Label>
            <Input value={vehiculoEditado.vin || ''} onChange={(e) => onVehiculoEditadoChange({ vin: e.target.value })} placeholder="WVWZZZ1KZBW123456" className="bg-white font-mono" />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="xl" onClick={onToggleEditandoVehiculo} disabled={guardandoVehiculo} className="flex-1">Cancelar</Button>
            <Button type="button" size="xl" onClick={onGuardarVehiculo} disabled={guardandoVehiculo} className="flex-1 bg-purple-600 hover:bg-purple-700">
              {guardandoVehiculo && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {guardandoVehiculo ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      )}

      {/* Sin vehículo — búsqueda por matrícula */}
      {!vehiculoId && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={matriculaInput}
              onChange={(e) => onMatriculaInputChange(e.target.value.toUpperCase().replace(/\s/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && onBuscarMatricula()}
              placeholder="Escribe la matrícula (ej: 1234ABC)"
              className="flex-1 px-3 py-3 border rounded-xl focus:ring-2 focus:ring-sky-500 bg-white font-mono text-center text-lg tracking-widest uppercase shadow-sm"
              autoFocus
            />
            <button
              type="button"
              onClick={onBuscarMatricula}
              disabled={buscandoMatricula || !matriculaInput.trim()}
              className="px-4 py-3 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl flex items-center gap-2 font-medium min-w-[56px] justify-center"
            >
              {buscandoMatricula ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center">Pulsa Buscar o Enter para buscar en el sistema</p>
          {matriculaNoEncontrada && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm text-amber-700 font-medium">Matrícula no encontrada</p>
              <p className="text-xs text-amber-600 mt-1">Pulsa "Crear nuevo vehículo" para registrarlo</p>
            </div>
          )}

          {clienteId && vehiculos.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-gray-500 mb-2">O elige un vehículo ya registrado de este cliente:</p>
              <select
                value=""
                onChange={(e) => e.target.value && onVehiculoIdChange(e.target.value)}
                className="w-full px-3 py-3 border rounded-xl focus:ring-2 focus:ring-sky-500 bg-white"
              >
                <option value="">Seleccionar vehículo del cliente...</option>
                {vehiculos.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.matricula} - {v.marca} {v.modelo}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={abrirFormVehiculo}
            className="text-sm text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1.5"
          >
            <Car className="w-4 h-4" /> Crear nuevo vehículo
          </button>
        </div>
      )}

      <Dialog open={mostrarFormVehiculo} onOpenChange={() => onToggleFormVehiculo()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="w-5 h-5 text-green-600" />
              Nuevo Vehículo
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Matrícula *</Label>
              <div className="flex gap-2">
                <Input
                  value={nuevoVehiculo.matricula}
                  onChange={(e) => onNuevoVehiculoChange({ matricula: e.target.value.toUpperCase() })}
                  placeholder="1234ABC"
                  className="font-mono uppercase flex-1"
                  autoFocus
                />
                <InputScanner tipo="matricula" onResult={(val) => onNuevoVehiculoChange({ matricula: val })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Marca</Label>
                <Input value={nuevoVehiculo.marca || ''} onChange={(e) => onNuevoVehiculoChange({ marca: e.target.value })} placeholder="Seat" />
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Modelo</Label>
                <Input value={nuevoVehiculo.modelo || ''} onChange={(e) => onNuevoVehiculoChange({ modelo: e.target.value })} placeholder="Ibiza" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Bastidor (VIN)</Label>
              <Input value={nuevoVehiculo.vin || ''} onChange={(e) => onNuevoVehiculoChange({ vin: e.target.value })} placeholder="WVWZZZ1KZBW123456" className="font-mono" />
            </div>
            <Button
              type="button"
              size="xl"
              onClick={onCrearVehiculo}
              disabled={creandoVehiculo || !nuevoVehiculo.matricula.trim()}
              className="w-full gap-2 bg-green-600 hover:bg-green-700"
            >
              {creandoVehiculo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Car className="w-4 h-4" />}
              {creandoVehiculo ? 'Creando...' : 'Crear Vehículo'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
